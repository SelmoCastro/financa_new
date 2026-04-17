import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class AiRequestGuard implements CanActivate {
  constructor(private subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) return false;

    const canUse = await this.subscriptionService.canUseAi(userId);
    if (!canUse) {
      const plan = await this.subscriptionService.getPlan(userId);
      const limits = (await import('./subscription.service')).PLAN_LIMITS[plan];
      throw new ForbiddenException(
        `Limite diário de ${limits.aiRequestsPerDay} requisições de IA atingido. Upgrade para Pro ou Premium para mais.`,
      );
    }

    return true;
  }
}
