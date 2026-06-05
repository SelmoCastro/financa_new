import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * Refresh Token Rotation Service — Zero Trust Pilar 1
 *
 * Implements "token family" pattern (RFC 6819):
 * - Each login creates a new token family (UUID)
 * - Each refresh within the family rotates the token (old one is invalidated)
 * - If a reuse is detected (refreshed token used again), ENTIRE family is revoked
 * - This limits refresh token theft to a single use window
 *
 * Flow:
 * 1. Login → create family → return refresh token #1
 * 2. Refresh with #1 → invalidate #1, return refresh token #2 (same family)
 * 3. Refresh with #2 → invalidate #2, return refresh token #3 (same family)
 * 4. If attacker replays #1 (already used) → DETECTED → revoke entire family
 *    → User must re-authenticate
 */
@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new token family on login.
   * Returns the family ID (used internally) and the hashed token to store.
   */
  async createFamily(
    userId: string,
  ): Promise<{ familyId: string; tokenHash: string; token: string }> {
    const familyId = crypto.randomUUID();
    const token = crypto.randomBytes(48).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Delete any existing refresh tokens for this user (single-session policy)
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Update legacy hashedRefreshToken for backward compat with old mobile APKs
    const hashedLegacy = await bcrypt.hash(token, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: hashedLegacy },
    });

    this.logger.log(
      `Created token family ${familyId.substring(0, 8)}... for user ${userId.substring(0, 8)}`,
    );
    return { familyId, tokenHash, token };
  }

  /**
   * Rotate a refresh token. Invalidates the old one, creates a new one in the same family.
   * Returns new token. Throws if reuse detected (replay attack).
   */
  /**
   * Pilar 1: Rotate by token only (no userId needed — opaque tokens are unique).
   * Looks up the token hash, validates family/reuse/expiry, rotates.
   * Used by AuthController.refresh() where userId is unknown upfront.
   */
  async rotateByToken(
    refreshToken: string,
  ): Promise<{ token: string; accessToken: string; userId: string }> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isEmailVerified: true,
            isAdmin: true,
          },
        },
      },
    });

    if (!stored) {
      // Token not found — could be legacy JWT or replay
      throw new Error('REFRESH_TOKEN_INVALID');
    }

    if (stored.expiresAt < new Date()) {
      await this.revokeFamily(stored.userId, stored.familyId);
      throw new Error('REFRESH_TOKEN_EXPIRED');
    }

    if (!stored.active) {
      // Replay detected!
      this.logger.warn(
        `⚠️ Refresh token reuse detected! Revoking family ${stored.familyId.substring(0, 8)}.`,
      );
      await this.revokeFamily(stored.userId, stored.familyId);
      await this.prisma.user.update({
        where: { id: stored.userId },
        data: { hashedRefreshToken: null },
      });
      throw new Error('REFRESH_TOKEN_REUSE');
    }

    const userId = stored.userId;
    const user = stored.user;

    // Valid rotation: invalidate old, create new in same family
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { active: false },
    });

    const newToken = crypto.randomBytes(48).toString('hex');
    const newTokenHash = crypto
      .createHash('sha256')
      .update(newToken)
      .digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId: stored.familyId,
        tokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Update legacy field for backward compat
    const hashedLegacy = await bcrypt.hash(newToken, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: hashedLegacy },
    });

    this.logger.log(
      `Rotated token in family ${stored.familyId.substring(0, 8)} for user ${userId.substring(0, 8)}`,
    );

    return { token: newToken, accessToken: stored.familyId, userId: user.id };
  }

  async rotate(
    userId: string,
    refreshToken: string,
  ): Promise<{ token: string; accessToken: string } | never> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Find the token
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId, tokenHash },
    });

    if (!stored) {
      // Token not found — this is a legacy JWT that was never stored as opaque token.
      // NOT a replay attack. Just signal to caller to try legacy path.
      throw new Error('REFRESH_TOKEN_INVALID');
    }

    if (stored.expiresAt < new Date()) {
      // Token expired — revoke family
      await this.revokeFamily(userId, stored.familyId);
      throw new Error('REFRESH_TOKEN_EXPIRED');
    }

    if (!stored.active) {
      // Token was already rotated — REPLAY ATTACK
      this.logger.warn(
        `⚠️ Refresh token reuse detected for user ${userId.substring(0, 8)}! Revoking family ${stored.familyId.substring(0, 8)}.`,
      );
      await this.revokeFamily(userId, stored.familyId);
      await this.prisma.user.update({
        where: { id: userId },
        data: { hashedRefreshToken: null },
      });
      throw new Error('REFRESH_TOKEN_REUSE');
    }

    // Valid rotation: invalidate old token, create new one in same family
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { active: false },
    });

    const newToken = crypto.randomBytes(48).toString('hex');
    const newTokenHash = crypto
      .createHash('sha256')
      .update(newToken)
      .digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        familyId: stored.familyId,
        tokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Also update the legacy hashedRefreshToken field for backward compat
    const hashedLegacy = await bcrypt.hash(newToken, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: hashedLegacy },
    });

    return { token: newToken, accessToken: stored.familyId };
  }

  /**
   * Revoke all tokens in a family.
   */
  async revokeFamily(userId: string, familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, familyId },
      data: { active: false },
    });
    this.logger.warn(
      `Revoked token family ${familyId.substring(0, 8)} for user ${userId.substring(0, 8)}`,
    );
  }

  /**
   * Revoke all refresh tokens for a user (logout everywhere).
   */
  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
    this.logger.log(
      `Revoked all refresh tokens for user ${userId.substring(0, 8)}`,
    );
  }
}
