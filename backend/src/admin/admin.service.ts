import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AdminPlanType = 'free' | 'premium';
export type AdminDurationType = 'lifetime' | '30d' | '60d' | '90d' | 'custom';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /** Verifica se o usuario e admin */
  private async verifyAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    if (!user?.isAdmin) {
      throw new ForbiddenException('Acesso restrito a administradores');
    }
  }

  /** Stats gerais do sistema */
  async getStats(userId: string) {
    await this.verifyAdmin(userId);

    const [
      totalUsers,
      verifiedUsers,
      totalTransactions,
      totalAccounts,
      totalBudgets,
      totalGoals,
      totalCategories,
      totalCreditCards,
      totalFeedbacks,
      totalAiRequests,
      totalNotifications,
      totalInvites,
      dbSize,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isEmailVerified: true } }),
      this.prisma.transaction.count({ where: { deletedAt: null } }),
      this.prisma.account.count({ where: { deletedAt: null } }),
      this.prisma.budget.count({ where: { deletedAt: null } }),
      this.prisma.goal.count({ where: { deletedAt: null } }),
      this.prisma.category.count({ where: { deletedAt: null } }),
      this.prisma.creditCard.count({ where: { deletedAt: null } }),
      this.prisma.feedback.count(),
      this.prisma.aiRequestLog.count(),
      this.prisma.notification.count(),
      this.prisma.transactionInvite.count(),
      // DB size
      this.prisma.$queryRaw`SELECT pg_database_size(current_database())::bigint as size`,
    ]);

    return {
      users: { total: totalUsers, verified: verifiedUsers },
      transactions: totalTransactions,
      accounts: totalAccounts,
      budgets: totalBudgets,
      goals: totalGoals,
      categories: totalCategories,
      creditCards: totalCreditCards,
      feedbacks: totalFeedbacks,
      aiRequests: totalAiRequests,
      notifications: totalNotifications,
      invites: totalInvites,
      dbSizeBytes: Number((dbSize as Array<{ size: number }>)[0]?.size ?? 0),
    };
  }

  /** Lista usuarios com detalhes */
  async getUsers(userId: string) {
    await this.verifyAdmin(userId);

    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            expiresAt: true,
          },
        },
        _count: {
          select: {
            transactions: { where: { deletedAt: null } },
            accounts: { where: { deletedAt: null } },
            budgets: { where: { deletedAt: null } },
            goals: { where: { deletedAt: null } },
            aiRequestLogs: true,
            feedbacks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  /** Atividade recente (ultimos 30 dias) */
  async getRecentActivity(userId: string) {
    await this.verifyAdmin(userId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      newUsers,
      newTransactions,
      aiRequests,
      feedbacks,
      topAiUsers,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.transaction.count({
        where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null },
      }),
      this.prisma.aiRequestLog.groupBy({
        by: ['createdAt'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: true,
      }),
      this.prisma.feedback.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: {
          id: true,
          content: true,
          platform: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.aiRequestLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 5,
      }),
    ]);

    // Buscar nomes dos top AI users
    const topAiUserIds = topAiUsers.map((u) => u.userId);
    const topAiUserNames = topAiUserIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: topAiUserIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

    return {
      last30Days: {
        newUsers,
        newTransactions,
        aiRequestCount: aiRequests.length,
      },
      recentFeedbacks: feedbacks,
      topAiUsers: topAiUsers.map((u) => ({
        ...topAiUserNames.find((n) => n.id === u.userId),
        requestCount: u._count.userId,
      })),
    };
  }

  /** Health check da VPS (via DB) */
  async getSystemHealth(userId: string) {
    await this.verifyAdmin(userId);

    const [dbActiveConnections, dbUptime, activeUsers30d] = await Promise.all([
      this.prisma.$queryRaw`SELECT count(*)::int as count FROM pg_stat_activity WHERE state = 'active'`,
      this.prisma.$queryRaw`SELECT extract(epoch from now() - pg_postmaster_start_time())::int as uptime_seconds`,
      this.prisma.user.count({
        where: { updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    return {
      database: {
        status: 'up',
        activeConnections: Number((dbActiveConnections as Array<{ count: number }>)[0]?.count ?? 0),
        uptimeSeconds: Number((dbUptime as Array<{ uptime_seconds: number }>)[0]?.uptime_seconds ?? 0),
        activeUsers30d,
      },
    };
  }

  /** Alterar plano de um usuario */
  async updateUserPlan(
    adminUserId: string,
    targetUserId: string,
    plan: AdminPlanType,
    duration: AdminDurationType,
  ) {
    await this.verifyAdmin(adminUserId);

    // Prevent self-promotion (admin cannot change their own plan)
    if (adminUserId === targetUserId) {
      throw new ForbiddenException('Administradores não podem alterar o próprio plano');
    }

    const validPlans: AdminPlanType[] = ['free', 'premium'];
    if (!validPlans.includes(plan)) {
      throw new ForbiddenException(`Plano invalido: ${plan}`);
    }

    // Verificar se o usuario alvo existe
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new ForbiddenException('Usuario nao encontrado');
    }

    // Calcular expiresAt baseado na duracao
    let expiresAt: Date | null = null;
    if (duration === 'lifetime') {
      expiresAt = null; // Vitalicio = sem expiracao
    } else if (duration === '30d') {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else if (duration === '60d') {
      expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    } else if (duration === '90d') {
      expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    } else if (duration === 'custom') {
      // Nao alterar expiresAt existente (mantem o que tem)
      const existing = await this.prisma.subscription.findUnique({
        where: { userId: targetUserId },
      });
      expiresAt = existing?.expiresAt ?? null;
    }

    // Se plano for free, status = active mas sem expiresAt relevante
    const status = plan === 'free' ? 'active' : 'active';

    return this.prisma.subscription.upsert({
      where: { userId: targetUserId },
      update: { plan, status, expiresAt },
      create: { userId: targetUserId, plan, status, expiresAt },
    });
  }

  /** Delete user and all their data (admin only) */
  async deleteUser(adminUserId: string, targetUserId: string) {
    await this.verifyAdmin(adminUserId);

    // Cannot delete self or another admin
    if (adminUserId === targetUserId) {
      throw new ForbiddenException('Administradores não podem excluir a própria conta pelo painel');
    }
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { isAdmin: true } });
    if (target?.isAdmin) {
      throw new ForbiddenException('Não é possível excluir outro administrador');
    }

    // Delete in dependency order (same order as Prisma schema requires)
    await this.prisma.creditCardInstallment.deleteMany({ where: { userId: targetUserId } });
    await this.prisma.creditCardInvoice.deleteMany({ where: { userId: targetUserId } });
    await this.prisma.transaction.deleteMany({ where: { userId: targetUserId } });
    await this.prisma.recurringTransaction.deleteMany({ where: { userId: targetUserId } });
    await this.prisma.creditCard.deleteMany({ where: { userId: targetUserId } });
    await this.prisma.account.deleteMany({ where: { userId: targetUserId } });
    await this.prisma.budget.deleteMany({ where: { userId: targetUserId } });
    await this.prisma.goal.deleteMany({ where: { userId: targetUserId } });
    await this.prisma.category.deleteMany({ where: { userId: targetUserId } });
    await this.prisma.notification.deleteMany({ where: { userId: targetUserId } });
    await this.prisma.aiRequestLog.deleteMany({ where: { userId: targetUserId } });
    await this.prisma.feedback.deleteMany({ where: { userId: targetUserId } });
    await this.prisma.subscription.deleteMany({ where: { userId: targetUserId } });
    await this.prisma.refreshToken.deleteMany({ where: { userId: targetUserId } });
    await this.prisma.auditLog.deleteMany({ where: { actorId: targetUserId } });
    await this.prisma.user.delete({ where: { id: targetUserId } });

    return { success: true, deletedUserId: targetUserId };
  }

  /** Stats de planos */
  async getPlanStats(adminUserId: string) {
    await this.verifyAdmin(adminUserId);

    const [free, premium, total, lifetimeUsers] = await Promise.all([
      this.prisma.subscription.count({ where: { plan: 'free' } }),
      this.prisma.subscription.count({ where: { plan: 'premium' } }),
      this.prisma.subscription.count(),
      this.prisma.subscription.count({
        where: { plan: 'premium', expiresAt: null },
      }),
    ]);

    const expiringSoon = await this.prisma.subscription.findMany({
      where: {
        plan: 'premium',
        expiresAt: { not: null, lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      },
      select: {
        userId: true,
        plan: true,
        expiresAt: true,
        user: { select: { name: true, email: true } },
      },
    });

    return {
      plans: { free, premium, total },
      lifetimeUsers,
      expiringSoon,
    };
  }

  /** Security stats: audit log counts, behavioral throttle penalized IPs */
  async getSecurityStats(adminUserId: string) {
    await this.verifyAdmin(adminUserId);

    const [
      totalAuditLogs,
      criticalLogs,
      loginLogs,
      loginFailedLogs,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({ where: { severity: 'critical' } }),
      this.prisma.auditLog.count({ where: { action: 'auth.login' } }),
      this.prisma.auditLog.count({ where: { action: 'auth.login_failed' } }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          action: true,
          actorId: true,
          targetType: true,
          targetId: true,
          severity: true,
          ip: true,
          createdAt: true,
        },
      }),
    ]);

    // Throttle stats returned separately if needed
    return {
      audit: {
        total: totalAuditLogs,
        critical: criticalLogs,
        logins: loginLogs,
        loginFailed: loginFailedLogs,
        recentLogs: recentAuditLogs,
      },
    };
  }
}