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
  async createFamily(userId: string): Promise<{ familyId: string; tokenHash: string; token: string }> {
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

    this.logger.log(`Created token family ${familyId.substring(0, 8)}... for user ${userId.substring(0, 8)}`);
    return { familyId, tokenHash, token };
  }

  /**
   * Rotate a refresh token. Invalidates the old one, creates a new one in the same family.
   * Returns new token. Throws if reuse detected (replay attack).
   */
  async rotate(userId: string, refreshToken: string): Promise<{ token: string; accessToken: string } | never> {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Find the token
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId, tokenHash },
    });

    if (!stored) {
      // Token not found — could be expired, already rotated, or from another user
      // Check if this is a reuse of an already-rotated token in any family for this user
      // We detect this by checking if there's an ACTIVE token in the same family
      // If yes, this is a REPLAY ATTACK
      const possibleFamily = await this.prisma.refreshToken.findFirst({
        where: { userId, active: true },
      });

      if (possibleFamily) {
        // Replay detected! Revoke entire family
        this.logger.warn(`⚠️ Refresh token reuse detected for user ${userId.substring(0, 8)}! Revoking family.`);
        await this.revokeFamily(userId, possibleFamily.familyId);
        await this.prisma.user.update({
          where: { id: userId },
          data: { hashedRefreshToken: null },
        });
      }

      throw new Error('REFRESH_TOKEN_INVALID');
    }

    if (stored.expiresAt < new Date()) {
      // Token expired — revoke family
      await this.revokeFamily(userId, stored.familyId);
      throw new Error('REFRESH_TOKEN_EXPIRED');
    }

    if (!stored.active) {
      // Token was already rotated — REPLAY ATTACK
      this.logger.warn(`⚠️ Refresh token reuse detected for user ${userId.substring(0, 8)}! Revoking family ${stored.familyId.substring(0, 8)}.`);
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
    const newTokenHash = crypto.createHash('sha256').update(newToken).digest('hex');

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
    this.logger.warn(`Revoked token family ${familyId.substring(0, 8)} for user ${userId.substring(0, 8)}`);
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
    this.logger.log(`Revoked all refresh tokens for user ${userId.substring(0, 8)}`);
  }
}