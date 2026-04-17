import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get()
  async getMySubscription(@CurrentUser() user: any) {
    return this.subscriptionService.getSubscription(user.id);
  }

  @Get('limits')
  async getMyLimits(@CurrentUser() user: any) {
    return this.subscriptionService.getLimits(user.id);
  }

  @Post('cancel')
  async cancelSubscription(@CurrentUser() user: any) {
    return this.subscriptionService.cancel(user.id);
  }
}
