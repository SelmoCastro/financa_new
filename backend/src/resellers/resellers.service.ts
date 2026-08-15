/**
 * Service do domínio de revendedores e créditos; concentra as regras de negócio, validações e operações de banco ligadas a este fluxo.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Subscription } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EncryptionService } from '../common/services/encryption.service';
import * as crypto from 'crypto';
import { CreateResellerDto } from './dto/create-reseller.dto';
import { AddResellerCreditsDto } from './dto/add-reseller-credits.dto';
import { ActivatePremiumDto } from './dto/activate-premium.dto';
import { LookupUserByEmailDto } from './dto/lookup-user-by-email.dto';
import {
  RESELLER_SKU_CONFIG,
  ResellerPremiumSku,
  ResellerStatus,
} from './reseller.constants';

@Injectable()
export class ResellersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly encryption: EncryptionService,
  ) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  // Máscaras evitam expor PII completa no preview mostrado ao revendedor antes da ativação.
  private maskEmail(email: string) {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    const visible = local.length <= 2 ? (local[0] ?? '*') : local.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
  }

  private maskName(name?: string | null) {
    if (!name) return null;
    if (name.length <= 2) return `${name[0]}*`;
    return `${name.slice(0, 2)}${'*'.repeat(Math.max(name.length - 2, 1))}`;
  }

  private getSkuConfig(sku: ResellerPremiumSku) {
    const config = RESELLER_SKU_CONFIG[sku];
    if (!config) {
      throw new BadRequestException('SKU inválido');
    }
    return config;
  }

  private sanitizeReseller(reseller: {
    id: string;
    email: string;
    displayName: string;
    companyName: string | null;
    phone: string | null;
    notes: string | null;
    status: string;
    creditVersion: number;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    createdByAdminId?: string | null;
  }) {
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
      createdByAdminId: reseller.createdByAdminId ?? null,
    };
  }

  private async verifyAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      throw new ForbiddenException('Acesso restrito a administradores');
    }
  }

  private async getCurrentBalanceTx(
    tx: Prisma.TransactionClient | PrismaService,
    resellerId: string,
  ) {
    // O saldo é sempre derivado do ledger; nunca existe campo de saldo editável como fonte primária.
    const aggregate = await tx.resellerLedger.aggregate({
      where: { resellerId },
      _sum: { deltaCredits: true },
    });

    return aggregate._sum.deltaCredits ?? 0;
  }

  private async lockResellerTx(
    tx: Prisma.TransactionClient | PrismaService,
    resellerId: string,
  ) {
    // FOR UPDATE serializa operações críticas de crédito para evitar corrida em cliques simultâneos.
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "Reseller"
      WHERE id = ${resellerId}
      FOR UPDATE
    `;

    if (rows.length === 0) {
      throw new NotFoundException('Revendedor não encontrado');
    }
  }

  private getNextExpiry(
    subscription: Subscription | null,
    durationDays: number,
  ) {
    const now = new Date();
    // Se o usuário já é premium e ainda não expirou, a nova ativação empilha em cima da data futura em vez de reiniciar hoje.
    const base =
      subscription?.plan === 'premium' &&
      subscription.expiresAt &&
      subscription.expiresAt > now
        ? subscription.expiresAt
        : now;

    return {
      startsAt: base,
      expiresAt: new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000),
    };
  }

  async getResellerForAuth(email: string) {
    return this.prisma.reseller.findUnique({
      where: { email: this.normalizeEmail(email) },
    });
  }

  async getResellerProfile(resellerId: string) {
    const reseller = await this.prisma.reseller.findUnique({
      where: { id: resellerId },
      select: {
        id: true,
        email: true,
        displayName: true,
        companyName: true,
        phone: true,
        notes: true,
        status: true,
        creditVersion: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        createdByAdminId: true,
      },
    });

    if (!reseller) {
      throw new NotFoundException('Revendedor não encontrado');
    }

    return this.sanitizeReseller(reseller);
  }

  async ensureResellerCanOperate(resellerId: string) {
    const reseller = await this.prisma.reseller.findUnique({
      where: { id: resellerId },
      select: { id: true, status: true, displayName: true, email: true },
    });

    if (!reseller) {
      throw new NotFoundException('Revendedor não encontrado');
    }

    if (reseller.status !== 'active') {
      throw new ForbiddenException(
        `Revendedor ${reseller.status === 'suspended' ? 'suspenso' : 'desabilitado'}`,
      );
    }

    return reseller;
  }

  async createReseller(adminUserId: string, dto: CreateResellerDto) {
    await this.verifyAdmin(adminUserId);

    const email = this.normalizeEmail(dto.email);
    const existing = await this.prisma.reseller.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('Já existe um revendedor com este email');
    }

    const reseller = await this.prisma.reseller.create({
      data: {
        email,
        password: await bcrypt.hash(dto.password, 12),
        displayName: dto.displayName.trim(),
        companyName: dto.companyName?.trim() || null,
        phone: dto.phone?.trim() || null,
        notes: dto.notes?.trim() || null,
        createdByAdminId: adminUserId,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        companyName: true,
        phone: true,
        notes: true,
        status: true,
        creditVersion: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        createdByAdminId: true,
      },
    });

    void this.auditService.log({
      action: 'reseller.create',
      actorId: adminUserId,
      targetType: 'Reseller',
      targetId: reseller.id,
      newState: { email: reseller.email, status: reseller.status },
      severity: 'info',
    });

    return {
      reseller: this.sanitizeReseller(reseller),
      currentBalance: 0,
    };
  }

  async listResellers(adminUserId: string) {
    await this.verifyAdmin(adminUserId);

    // Busca a lista e os saldos agregados em paralelo para montar uma visão resumida do programa de revenda.
    const [resellers, balances] = await Promise.all([
      this.prisma.reseller.findMany({
        select: {
          id: true,
          email: true,
          displayName: true,
          companyName: true,
          phone: true,
          notes: true,
          status: true,
          creditVersion: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          createdByAdminId: true,
          _count: {
            select: {
              ledgerEntries: true,
              premiumActivations: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.resellerLedger.groupBy({
        by: ['resellerId'],
        _sum: { deltaCredits: true },
      }),
    ]);

    const balanceMap = new Map(
      balances.map((item) => [item.resellerId, item._sum.deltaCredits ?? 0]),
    );

    return resellers.map((reseller) => ({
      ...this.sanitizeReseller(reseller),
      currentBalance: balanceMap.get(reseller.id) ?? 0,
      ledgerEntriesCount: reseller._count.ledgerEntries,
      premiumActivationsCount: reseller._count.premiumActivations,
    }));
  }

  async getResellerById(adminUserId: string, resellerId: string) {
    await this.verifyAdmin(adminUserId);

    const reseller = await this.prisma.reseller.findUnique({
      where: { id: resellerId },
      select: {
        id: true,
        email: true,
        displayName: true,
        companyName: true,
        phone: true,
        notes: true,
        status: true,
        creditVersion: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        createdByAdminId: true,
        createdByAdmin: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!reseller) {
      throw new NotFoundException('Revendedor não encontrado');
    }

    // Dashboard do portal traz só o necessário para operar: saldo atual, ledger recente e ativações recentes.
    const [currentBalance, recentLedger, recentActivations] = await Promise.all(
      [
        this.getCurrentBalanceTx(this.prisma, resellerId),
        this.prisma.resellerLedger.findMany({
          where: { resellerId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        this.prisma.resellerPremiumActivation.findMany({
          where: { resellerId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ],
    );

    return {
      reseller: this.sanitizeReseller(reseller),
      currentBalance,
      createdByAdmin: reseller.createdByAdmin,
      recentLedger,
      recentActivations,
    };
  }

  async updateResellerStatus(
    adminUserId: string,
    resellerId: string,
    status: ResellerStatus,
  ) {
    await this.verifyAdmin(adminUserId);

    const reseller = await this.prisma.reseller.update({
      where: { id: resellerId },
      data: { status },
      select: {
        id: true,
        email: true,
        displayName: true,
        companyName: true,
        phone: true,
        notes: true,
        status: true,
        creditVersion: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        createdByAdminId: true,
      },
    });

    void this.auditService.log({
      action: 'reseller.status_update',
      actorId: adminUserId,
      targetType: 'Reseller',
      targetId: resellerId,
      newState: { status },
      severity: 'warn',
    });

    return this.sanitizeReseller(reseller);
  }

  async getResellerLedger(adminUserId: string, resellerId: string) {
    await this.verifyAdmin(adminUserId);

    await this.getResellerProfile(resellerId);

    const [entries, currentBalance] = await Promise.all([
      this.prisma.resellerLedger.findMany({
        where: { resellerId },
        orderBy: { createdAt: 'desc' },
      }),
      this.getCurrentBalanceTx(this.prisma, resellerId),
    ]);

    return {
      currentBalance,
      entries,
    };
  }

  async getResellerActivations(adminUserId: string, resellerId: string) {
    await this.verifyAdmin(adminUserId);

    await this.getResellerProfile(resellerId);

    return this.prisma.resellerPremiumActivation.findMany({
      where: { resellerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addCredits(
    adminUserId: string,
    resellerId: string,
    dto: AddResellerCreditsDto,
  ) {
    await this.verifyAdmin(adminUserId);

    const result = await this.prisma.$transaction(async (tx) => {
      // Idempotência evita crédito duplicado quando o operador clica duas vezes ou reenvia a mesma operação.
      const existing = await tx.resellerLedger.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });

      if (existing) {
        if (existing.resellerId !== resellerId) {
          throw new ConflictException(
            'Idempotency key já usada em outro revendedor',
          );
        }

        const reseller = await tx.reseller.findUnique({
          where: { id: resellerId },
          select: {
            id: true,
            email: true,
            displayName: true,
            companyName: true,
            phone: true,
            notes: true,
            status: true,
            creditVersion: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
            createdByAdminId: true,
          },
        });

        if (!reseller) {
          throw new NotFoundException('Revendedor não encontrado');
        }

        return {
          reseller: this.sanitizeReseller(reseller),
          ledgerEntry: existing,
          currentBalance: existing.balanceAfter,
          idempotentReplay: true,
        };
      }

      // A partir daqui a transação assume posse do saldo deste revendedor até terminar.
      await this.lockResellerTx(tx, resellerId);

      const reseller = await tx.reseller.findUnique({
        where: { id: resellerId },
        select: {
          id: true,
          email: true,
          displayName: true,
          companyName: true,
          phone: true,
          notes: true,
          status: true,
          creditVersion: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          createdByAdminId: true,
        },
      });

      if (!reseller) {
        throw new NotFoundException('Revendedor não encontrado');
      }

      const currentBalance = await this.getCurrentBalanceTx(tx, resellerId);
      const balanceAfter = currentBalance + dto.credits;

      const ledgerEntry = await tx.resellerLedger.create({
        data: {
          resellerId,
          entryType: 'credit_grant',
          deltaCredits: dto.credits,
          balanceAfter,
          reason: dto.reason.trim(),
          notes: dto.notes.trim(),
          referenceType: 'admin_credit',
          idempotencyKey: dto.idempotencyKey,
          metadata: {
            grantedByAdminId: adminUserId,
          },
          createdByAdminId: adminUserId,
        },
      });

      await tx.reseller.update({
        where: { id: resellerId },
        data: { creditVersion: { increment: 1 } },
      });

      return {
        reseller: this.sanitizeReseller(reseller),
        ledgerEntry,
        currentBalance: balanceAfter,
        idempotentReplay: false,
      };
    });

    void this.auditService.log({
      action: 'reseller.credit_grant',
      actorId: adminUserId,
      targetType: 'Reseller',
      targetId: resellerId,
      details: {
        credits: dto.credits,
        reason: dto.reason,
        idempotencyKey: dto.idempotencyKey,
      },
      severity: 'info',
    });

    return result;
  }

  async getPortalDashboard(resellerId: string) {
    const reseller = await this.ensureResellerCanOperate(resellerId);

    const [currentBalance, recentLedger, recentActivations] = await Promise.all(
      [
        this.getCurrentBalanceTx(this.prisma, resellerId),
        this.prisma.resellerLedger.findMany({
          where: { resellerId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.resellerPremiumActivation.findMany({
          where: { resellerId },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ],
    );

    return {
      reseller,
      currentBalance,
      skuCatalog: RESELLER_SKU_CONFIG,
      recentLedger,
      recentActivations,
    };
  }

  async getPortalLedger(resellerId: string) {
    await this.ensureResellerCanOperate(resellerId);

    const [entries, currentBalance] = await Promise.all([
      this.prisma.resellerLedger.findMany({
        where: { resellerId },
        orderBy: { createdAt: 'desc' },
      }),
      this.getCurrentBalanceTx(this.prisma, resellerId),
    ]);

    return { currentBalance, entries };
  }

  async getPortalActivations(resellerId: string) {
    await this.ensureResellerCanOperate(resellerId);

    return this.prisma.resellerPremiumActivation.findMany({
      where: { resellerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async lookupUserByEmail(resellerId: string, dto: LookupUserByEmailDto) {
    await this.ensureResellerCanOperate(resellerId);

    const email = this.normalizeEmail(dto.email);
    const emailHash = crypto.createHash('sha256').update(email).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: { emailHash },
      select: {
        id: true,
        email: true,
        name: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            expiresAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado no Finanza');
    }

    // Decrypt PII fields (handles both encrypted and legacy plaintext data)
    const decryptedEmail = this.encryption.decrypt(user.email) || user.email;
    const decryptedName =
      user.name != null
        ? this.encryption.decrypt(user.name) || user.name
        : null;

    // O portal nunca devolve nome/email crus como UX principal; mostra snapshots mascarados para reduzir erro humano.
    const currentPlan =
      user.subscription?.plan === 'premium' &&
      (!user.subscription.expiresAt || user.subscription.expiresAt > new Date())
        ? 'premium'
        : 'free';

    return {
      userId: user.id,
      maskedEmail: this.maskEmail(decryptedEmail),
      maskedName: this.maskName(decryptedName),
      currentPlan,
      premiumExpiresAt: user.subscription?.expiresAt ?? null,
      status: user.subscription?.status ?? 'active',
      requiresConfirmation: true,
    };
  }

  async activatePremium(
    resellerId: string,
    dto: ActivatePremiumDto,
    context?: { ip?: string | null; userAgent?: string | null },
  ) {
    if (!dto.confirmationChecked) {
      throw new BadRequestException(
        'Confirmação obrigatória antes da ativação',
      );
    }

    const normalizedEmail = this.normalizeEmail(dto.email);
    const config = this.getSkuConfig(dto.sku);

    const result = await this.prisma.$transaction(async (tx) => {
      // Replays com a mesma chave retornam o resultado anterior sem consumir saldo outra vez.
      const existingActivation = await tx.resellerPremiumActivation.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });

      if (existingActivation) {
        if (existingActivation.resellerId !== resellerId) {
          throw new ConflictException(
            'Idempotency key já usada por outro revendedor',
          );
        }

        const currentBalance = await this.getCurrentBalanceTx(tx, resellerId);
        return {
          activation: existingActivation,
          currentBalance,
          idempotentReplay: true,
        };
      }

      await this.lockResellerTx(tx, resellerId);

      const reseller = await tx.reseller.findUnique({
        where: { id: resellerId },
        select: { id: true, status: true },
      });

      if (!reseller) {
        throw new NotFoundException('Revendedor não encontrado');
      }

      if (reseller.status !== 'active') {
        throw new ForbiddenException(
          'Revendedor não está autorizado a ativar Premium',
        );
      }

      const targetEmailHash = crypto
        .createHash('sha256')
        .update(normalizedEmail)
        .digest('hex');
      const targetUser = await tx.user.findFirst({
        where: { emailHash: targetEmailHash },
        select: {
          id: true,
          email: true,
          name: true,
          subscription: true,
        },
      });

      if (!targetUser) {
        throw new NotFoundException('Usuário final não encontrado');
      }

      const currentBalance = await this.getCurrentBalanceTx(tx, resellerId);
      if (currentBalance < config.credits) {
        throw new ForbiddenException('Saldo de créditos insuficiente');
      }

      // A ativação cria três efeitos atômicos: histórico da ativação, saída no ledger e atualização da assinatura do usuário final.
      const { startsAt, expiresAt } = this.getNextExpiry(
        targetUser.subscription,
        config.durationDays,
      );

      const activation = await tx.resellerPremiumActivation.create({
        data: {
          resellerId,
          targetUserId: targetUser.id,
          targetUserEmailSnapshot: targetUser.email,
          targetUserNameSnapshot: targetUser.name ?? null,
          lookupEmail: normalizedEmail,
          sku: dto.sku,
          creditsConsumed: config.credits,
          durationDays: config.durationDays,
          startsAt,
          expiresAt,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      const balanceAfter = currentBalance - config.credits;
      await tx.resellerLedger.create({
        data: {
          resellerId,
          entryType: 'premium_activation',
          deltaCredits: -config.credits,
          balanceAfter,
          reason: `Ativação ${config.label}`,
          notes: `Ativado para ${targetUser.email}`,
          referenceType: 'premium_activation',
          referenceId: activation.id,
          idempotencyKey: `ledger:${dto.idempotencyKey}`,
          metadata: {
            targetUserId: targetUser.id,
            targetUserEmail: targetUser.email,
            sku: dto.sku,
          },
        },
      });

      await tx.reseller.update({
        where: { id: resellerId },
        data: { creditVersion: { increment: 1 } },
      });

      await tx.subscription.upsert({
        where: { userId: targetUser.id },
        update: {
          plan: 'premium',
          status: 'active',
          expiresAt,
        },
        create: {
          userId: targetUser.id,
          plan: 'premium',
          status: 'active',
          expiresAt,
        },
      });

      return {
        activation,
        currentBalance: balanceAfter,
        idempotentReplay: false,
      };
    });

    void this.auditService.log({
      action: 'reseller.premium_activation',
      actorId: null,
      targetType: 'ResellerPremiumActivation',
      targetId: result.activation.id,
      details: {
        resellerId,
        targetEmail: normalizedEmail,
        sku: dto.sku,
        creditsConsumed: config.credits,
        idempotencyKey: dto.idempotencyKey,
        ip: context?.ip ?? null,
      },
      ip: context?.ip ?? null,
      userAgent: context?.userAgent ?? null,
      severity: 'info',
    });

    return result;
  }
}
