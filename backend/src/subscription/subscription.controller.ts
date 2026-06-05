import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SubscriptionService } from './subscription.service';

interface RequestWithUser {
  user: { userId: string };
}

@Controller({
  path: 'subscription',
  version: '1', // V12: Add versioning to match all other controllers
})
@UseGuards(AuthGuard('jwt'))
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get()
  async getMySubscription(@Request() req: RequestWithUser) {
    return this.subscriptionService.getSubscription(req.user.userId);
  }

  @Get('limits')
  async getMyLimits(@Request() req: RequestWithUser) {
    return this.subscriptionService.getLimits(req.user.userId);
  }

  @Get('exceeding')
  async getExceedingResources(@Request() req: RequestWithUser) {
    return this.subscriptionService.getAllExceeding(req.user.userId);
  }

  @Post('cancel')
  async cancelSubscription(@Request() req: RequestWithUser) {
    return this.subscriptionService.cancel(req.user.userId);
  }
}
