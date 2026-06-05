import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class AiRequestGuard implements CanActivate {
  constructor(private subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    if (!userId) return false;

    const canUse = await this.subscriptionService.canUseAi(userId);
    if (!canUse) {
      throw new ForbiddenException(
        'Limite diário de requisições de IA atingido. Faça upgrade do seu plano para mais.',
      );
    }

    return true;
  }
}
