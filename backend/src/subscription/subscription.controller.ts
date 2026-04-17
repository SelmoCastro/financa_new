import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubscriptionService } from './subscription.service';

@Controller('subscription')
@UseGuards(AuthGuard('jwt'))
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get()
  async getMySubscription(@Request() req: any) {
    return this.subscriptionService.getSubscription(req.user.id);
  }

  @Get('limits')
  async getMyLimits(@Request() req: any) {
    return this.subscriptionService.getLimits(req.user.id);
  }

  @Post('cancel')
  async cancelSubscription(@Request() req: any) {
    return this.subscriptionService.cancel(req.user.id);
  }
}