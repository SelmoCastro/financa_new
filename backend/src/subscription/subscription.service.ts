import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type PlanType = 'free' | 'premium';

export const PLAN_LIMITS: Record<PlanType, { aiRequestsPerDay: number; maxAccounts: number; maxBudgets: number }> = {
  free: { aiRequestsPerDay: 3, maxAccounts: 3, maxBudgets: 3 },
  premium: { aiRequestsPerDay: -1, maxAccounts: -1, maxBudgets: -1 }, // -1 = unlimited
};

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getSubscription(userId: string) {
    let sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      sub = await this.prisma.subscription.create({
        data: { userId, plan: 'premium', status: 'active' },
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
}
