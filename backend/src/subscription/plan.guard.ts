/**
 * Arquivo de suporte do domínio de assinaturas e plano premium; dá sustentação ao fluxo principal deste módulo.
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionService, PlanType } from './subscription.service';
import { Reflector } from '@nestjs/core';

export const REQUIRED_PLAN_KEY = 'requiredPlan';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private subscriptionService: SubscriptionService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<PlanType>(
      REQUIRED_PLAN_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPlan) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    if (!userId) return false;

    const userPlan = await this.subscriptionService.getPlan(userId);
    const planHierarchy: PlanType[] = ['free', 'premium'];
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
