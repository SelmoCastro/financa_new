/**
 * Service do domínio de autenticação de revendedores; concentra as regras de negócio, validações e operações de banco ligadas a este fluxo.
 */
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ResellersService } from '../resellers/resellers.service';
import * as bcrypt from 'bcrypt';
import { Reseller } from '@prisma/client';

@Injectable()
export class ResellerAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly resellersService: ResellersService,
  ) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private sanitizeReseller(reseller: Reseller) {
    return {
      id: reseller.id,
      email: reseller.email,
      displayName: reseller.displayName,
      companyName: reseller.companyName,
      phone: reseller.phone,
      notes: reseller.notes,
      status: reseller.status,
      creditVersion: reseller.creditVersion,
      lastLoginAt: reseller.lastLoginAt,
      createdAt: reseller.createdAt,
      updatedAt: reseller.updatedAt,
      createdByAdminId: reseller.createdByAdminId,
    };
  }

  // Gera access + refresh token e guarda apenas o hash do refresh no banco para reduzir impacto de vazamento.
  private async generateTokens(reseller: Reseller) {
    const payload = {
      sub: reseller.id,
      email: reseller.email,
      status: reseller.status,
      actorType: 'reseller',
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(
      {
        sub: reseller.id,
        email: reseller.email,
        actorType: 'reseller_refresh',
      },
      { expiresIn: '30d' },
    );

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
    await this.prisma.reseller.update({
      where: { id: reseller.id },
      data: {
        hashedRefreshToken,
        lastLoginAt: new Date(),
      },
    });

    return { accessToken, refreshToken };
  }

  async validateReseller(email: string, password: string) {
    const reseller = await this.resellersService.getResellerForAuth(
      this.normalizeEmail(email),
    );

    if (!reseller) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (reseller.lockedUntil && reseller.lockedUntil > new Date()) {
      const remainingMs = reseller.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new UnauthorizedException(
        `Conta temporariamente bloqueada. Tente novamente em ${remainingMin} minuto(s).`,
      );
    }

    const passwordMatches = await bcrypt.compare(password, reseller.password);
    if (!passwordMatches) {
      // Bloqueio progressivo simples para travar brute force sem complicar o fluxo de suporte.
      const failedLoginAttempts = reseller.failedLoginAttempts + 1;
      await this.prisma.reseller.update({
        where: { id: reseller.id },
        data: {
          failedLoginAttempts,
          lockedUntil:
            failedLoginAttempts >= 5
              ? new Date(Date.now() + 15 * 60 * 1000)
              : null,
        },
      });

      void this.auditService.log({
        action: 'reseller.login_failed',
        targetType: 'Reseller',
        targetId: reseller.id,
        severity: 'warn',
      });

      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (reseller.status === 'disabled') {
      throw new ForbiddenException('Revendedor desabilitado');
    }

    await this.prisma.reseller.update({
      where: { id: reseller.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    return reseller;
  }

  async login(reseller: Reseller) {
    if (reseller.status !== 'active') {
      throw new ForbiddenException(
        reseller.status === 'suspended'
          ? 'Revendedor suspenso'
          : 'Revendedor desabilitado',
      );
    }

    const tokens = await this.generateTokens(reseller);

    void this.auditService.log({
      action: 'reseller.login',
      targetType: 'Reseller',
      targetId: reseller.id,
      severity: 'info',
    });

    return {
      access_token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      reseller: this.sanitizeReseller({
        ...reseller,
        lastLoginAt: new Date(),
      }),
    };
  }

  async refreshTokens(refreshToken: string) {
    let payload: { sub?: string; actorType?: string };

    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (!payload.sub || payload.actorType !== 'reseller_refresh') {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const reseller = await this.prisma.reseller.findUnique({
      where: { id: payload.sub },
    });

    if (!reseller?.hashedRefreshToken) {
      throw new UnauthorizedException('Sessão inválida');
    }

    const refreshMatches = await bcrypt.compare(
      refreshToken,
      reseller.hashedRefreshToken,
    );

    if (!refreshMatches) {
      // Se o refresh não bater com o hash salvo, invalida a sessão persistida e força novo login.
      await this.prisma.reseller.update({
        where: { id: reseller.id },
        data: { hashedRefreshToken: null },
      });
      throw new UnauthorizedException('Sessão inválida');
    }

    if (reseller.status !== 'active') {
      throw new ForbiddenException(
        'Revendedor sem permissão para renovar sessão',
      );
    }

    const tokens = await this.generateTokens(reseller);

    return {
      access_token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(resellerId: string) {
    await this.prisma.reseller.update({
      where: { id: resellerId },
      data: { hashedRefreshToken: null },
    });

    void this.auditService.log({
      action: 'reseller.logout',
      targetType: 'Reseller',
      targetId: resellerId,
      severity: 'info',
    });

    return { message: 'Desconectado com sucesso' };
  }

  async getProfile(resellerId: string) {
    const reseller = await this.prisma.reseller.findUnique({
      where: { id: resellerId },
    });

    if (!reseller) {
      throw new UnauthorizedException('Revendedor não encontrado');
    }

    return this.sanitizeReseller(reseller);
  }
}
