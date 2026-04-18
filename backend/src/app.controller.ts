import {
  Controller,
  Get,
  UseGuards,
  Request,
  Version,
  VERSION_NEUTRAL,
  ForbiddenException,
} from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport';

@Controller({
  version: VERSION_NEUTRAL,
})
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return 'Finanza API Online';
  }

  @Get('health/email')
  @UseGuards(AuthGuard('jwt'))
  checkEmailConfig(@Request() req: any) {
    if (!req.user.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
    const hasKey = !!process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    return {
      resendConfigured: hasKey,
      fromEmail,
      hint: hasKey
        ? 'Resend API key found. If emails are not arriving, check: 1) domain verification on resend.com/domains 2) fromEmail must use verified domain 3) onboarding@resend.dev only sends to account owner email'
        : 'RESEND_API_KEY is missing! Add it to your environment variables.',
    };
  }
}
