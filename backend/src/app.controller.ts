import {
  Controller,
  Get,
  Request,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { AppService } from './app.service';

@Controller({
  version: VERSION_NEUTRAL,
})
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return 'Finanza API Online';
  }

  @Get('debug')
  getRoutes(@Request() req) {
    const router = req.app._router;
    return {
      message: 'Rotas carregadas',
      routes: router.stack
        .filter((layer) => layer.route)
        .map((layer) => ({
          path: layer.route.path,
          method: Object.keys(layer.route.methods)[0].toUpperCase(),
        })),
    };
  }

  @Get('health/email')
  checkEmailConfig() {
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
