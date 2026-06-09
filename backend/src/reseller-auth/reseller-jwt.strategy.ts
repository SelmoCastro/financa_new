/**
 * Arquivo de suporte do domínio de autenticação de revendedores; dá sustentação ao fluxo principal deste módulo.
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RESELLER_ACCESS_COOKIE } from '../resellers/reseller.constants';

@Injectable()
export class ResellerJwtStrategy extends PassportStrategy(
  Strategy,
  'reseller-jwt',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret =
      configService.get<string>('RESELLER_JWT_SECRET') ||
      configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'Neither RESELLER_JWT_SECRET nor JWT_SECRET configured',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ResellerJwtStrategy.extractJwt,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  private static extractJwt(req: Request | any): string | null {
    if (req.cookies && req.cookies[RESELLER_ACCESS_COOKIE]) {
      return req.cookies[RESELLER_ACCESS_COOKIE];
    }
    return null;
  }

  async validate(payload: {
    sub: string;
    email: string;
    status: string;
    actorType?: string;
  }) {
    if (payload.actorType !== 'reseller') {
      throw new UnauthorizedException('Token inválido para revendedor');
    }

    const reseller = await this.prisma.reseller.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, status: true },
    });

    if (!reseller) {
      throw new UnauthorizedException('Revendedor não existe mais');
    }

    return {
      resellerId: reseller.id,
      email: reseller.email,
      status: reseller.status,
    };
  }
}
