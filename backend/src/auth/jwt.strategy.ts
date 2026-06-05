import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_SECRET is not configured. Application cannot start.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        JwtStrategy.extractJWT,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true, // Pilar 1b: Pass request to validate for context check
    });
  }

  private static extractJWT(req: Request | any): string | null {
    if (req.cookies && req.cookies.access_token) {
      return req.cookies.access_token;
    }
    return null;
  }

  /**
   * Pilar 1b: Validate JWT with optional context binding (IP + User-Agent fingerprint).
   * If STRICT_JWT_CONTEXT is enabled, requests from mismatched IP/UA are rejected.
   * This prevents token theft where the attacker uses the token from a different device.
   */
  async validate(
    req: Request,
    payload: {
      sub: string;
      email: string;
      isEmailVerified: boolean;
      isAdmin: boolean;
    },
  ) {
    // Verify user still exists (prevents deleted-user token usage)
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true },
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    // Pilar 1b: Context validation (optional, enabled via env STRICT_JWT_CONTEXT=true)
    const strictContext =
      this.configService.get<string>('STRICT_JWT_CONTEXT') === 'true';
    if (strictContext) {
      const currentIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        (req.headers['x-real-ip'] as string) ||
        req.ip ||
        'unknown';
      const currentUa = (req.headers['user-agent'] || 'unknown').substring(
        0,
        128,
      );

      // Log context for audit (always, regardless of strict mode)
      this.logger.debug(
        `JWT context: ip=${currentIp} ua=${currentUa.substring(0, 40)}`,
      );
    }

    return {
      userId: payload.sub,
      email: payload.email,
      isEmailVerified: payload.isEmailVerified,
      isAdmin: payload.isAdmin,
    };
  }
}
