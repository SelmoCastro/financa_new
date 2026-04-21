import {
  Controller,
  Get,
  UseGuards,
  Request,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from './common/guards/admin.guard';

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
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  checkEmailConfig(@Request() req: any) {
    const hasKey = !!process.env.RESEND_API_KEY;
    return {
      resendConfigured: hasKey,
      hint: hasKey
        ? 'Resend API key found. If emails are not arriving, check domain verification on resend.com'
        : 'RESEND_API_KEY is missing. Add it to environment variables.',
    };
  }
}
