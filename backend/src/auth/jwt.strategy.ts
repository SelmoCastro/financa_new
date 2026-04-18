import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured. Application cannot start.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        JwtStrategy.extractJWT,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  private static extractJWT(req: Request | any): string | null {
    if (req.cookies && req.cookies.access_token) {
      return req.cookies.access_token;
    }
    return null;
  }

  async validate(payload: any) {
    // Verify user still exists (prevents deleted-user token usage)
    const userExists = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true },
    });
    if (!userExists) {
      throw new UnauthorizedException('User no longer exists');
    }

    return { userId: payload.sub, email: payload.email, isEmailVerified: payload.isEmailVerified, isAdmin: payload.isAdmin };
  }
}
