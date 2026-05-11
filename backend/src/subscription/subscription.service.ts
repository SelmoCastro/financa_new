import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type PlanType = 'free' | 'premium';
export type ResourceType = 'account' | 'budget' | 'creditCard' | 'goal';

export const PLAN_LIMITS: Record<PlanType, { aiRequestsPerDay: number; maxAccounts: number; maxBudgets: number; maxCreditCards: number; maxGoals: number }> = {
  free: { aiRequestsPerDay: 1, maxAccounts: 1, maxBudgets: 3, maxCreditCards: 1, maxGoals: 3 },
  premium: { aiRequestsPerDay: -1, maxAccounts: -1, maxBudgets: -1, maxCreditCards: -1, maxGoals: -1 }, // -1 = unlimited
};

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getSubscription(userId: string) {
    let sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      // V14: Default to 'free' plan — new users must upgrade explicitly
      sub = await this.prisma.subscription.create({
        data: { userId, plan: 'free', status: 'active' },
      });
    }
    return sub;
  }

  async getPlan(userId: string): Promise<PlanType> {
    const sub = await this.getSubscription(userId);
    // Check expiration for paid plans
    if (sub.plan !== 'free' && sub.expiresAt && new Date() > sub.expiresAt) {
      await this.prisma.subscription.update({
        where: { userId },
        data: { plan: 'free', status: 'expired' },
      });
      return 'free';
    }
    return sub.plan as PlanType;
  }

  async getLimits(userId: string) {
    const plan = await this.getPlan(userId);
    return PLAN_LIMITS[plan];
  }

  async canUseAi(userId: string): Promise<boolean> {
    const plan = await this.getPlan(userId);
    const limits = PLAN_LIMITS[plan];
    if (limits.aiRequestsPerDay === -1) return true;

    // Count today's AI requests
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await this.prisma.aiRequestLog.count({
      where: { userId, createdAt: { gte: today } },
    });

    return count < limits.aiRequestsPerDay;
  }

  async upgrade(userId: string, plan: PlanType, expiresAt?: Date) {
    const validPlans: PlanType[] = ['free', 'premium'];
    if (!validPlans.includes(plan)) {
      throw new Error(`Plano invalido: ${plan}`);
    }
    return this.prisma.subscription.upsert({
      where: { userId },
      update: { plan, status: 'active', expiresAt: expiresAt ?? null },
      create: { userId, plan, status: 'active', expiresAt: expiresAt ?? null },
    });
  }

  async cancel(userId: string) {
    const result = await this.prisma.subscription.update({
      where: { userId },
      data: { status: 'canceled', plan: 'free' },
    });

    // Do NOT delete AiRequestLog entries — rate limit must still count today's usage
    // so users cannot bypass limits by cancelling and re-subscribing.

    return result;
  }

  /**
   * Retorna os IDs dos recursos excedentes (read-only) para um tipo.
   * Recursos criados primeiro = dentro do limite; os demais = excedentes.
   */
  async getExceedingIds(userId: string, resourceType: ResourceType): Promise<string[]> {
    const plan = await this.getPlan(userId);
    if (plan === 'premium') return [];

    const limit = this.getLimitForType(plan, resourceType);
    if (limit === -1) return [];

    let resources: { id: string }[];
    switch (resourceType) {
      case 'account':
        resources = await this.prisma.account.findMany({
          where: { userId, deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        break;
      case 'budget':
        resources = await this.prisma.budget.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        break;
      case 'creditCard':
        resources = await this.prisma.creditCard.findMany({
          where: { userId, deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        break;
      case 'goal':
        resources = await this.prisma.goal.findMany({
          where: { userId, deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        break;
    }

    return resources.slice(limit).map((r) => r.id);
  }

  /**
   * Verifica se um recurso específico está excedente (read-only).
   * Lança ForbiddenException se estiver.
   */
  async checkNotExceeding(userId: string, resourceType: ResourceType, resourceId: string): Promise<void> {
    const exceedingIds = await this.getExceedingIds(userId, resourceType);
    if (exceedingIds.includes(resourceId)) {
      throw new ForbiddenException(
        'Este recurso está em modo somente leitura (acima do limite do plano gratuito). Faça upgrade para Premium para editá-lo.',
      );
    }
  }

  /**
   * Retorna todos os recursos excedentes de um usuário (para o frontend).
   */
  async getAllExceeding(userId: string): Promise<Record<ResourceType, string[]>> {
    const types: ResourceType[] = ['account', 'budget', 'creditCard', 'goal'];
    const result = {} as Record<ResourceType, string[]>;
    for (const t of types) {
      result[t] = await this.getExceedingIds(userId, t);
    }
    return result;
  }

  private getLimitForType(plan: PlanType, resourceType: ResourceType): number {
    const limits = PLAN_LIMITS[plan];
    const mapping: Record<ResourceType, keyof typeof limits> = {
      account: 'maxAccounts',
      budget: 'maxBudgets',
      creditCard: 'maxCreditCards',
      goal: 'maxGoals',
    };
    return limits[mapping[resourceType]];
  }
}
