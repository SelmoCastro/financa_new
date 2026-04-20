import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
      dbSizeBytes: Number((dbSize as any)[0]?.size ?? 0),
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
        activeConnections: Number((dbActiveConnections as any)[0]?.count ?? 0),
        uptimeSeconds: Number((dbUptime as any)[0]?.uptime_seconds ?? 0),
        activeUsers30d,
      },
    };
  }
}