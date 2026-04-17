import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SubscriptionService, PLAN_LIMITS, PlanType } from './subscription.service';
import { Reflector } from '@nestjs/core';

export const REQUIRED_PLAN_KEY = 'requiredPlan';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private subscriptionService: SubscriptionService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<PlanType>(REQUIRED_PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPlan) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) return false;

    const userPlan = await this.subscriptionService.getPlan(userId);
    const planHierarchy: PlanType[] = ['free', 'pro', 'premium'];
    const userLevel = planHierarchy.indexOf(userPlan);
    const requiredLevel = planHierarchy.indexOf(requiredPlan);

    if (userLevel < requiredLevel) {
      throw new ForbiddenException(
        `Funcionalidade requer plano ${requiredPlan}. Seu plano atual: ${userPlan}`,
      );
    }

    return true;
  }
}
