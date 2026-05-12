import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePreferenceDto } from './dto/payment.dto';

interface RequestWithUser {
  user: { userId: string };
}

@Controller({
  path: 'payments',
  version: '1',
})
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('create-preference')
  async createPreference(
    @Req() req: RequestWithUser,
    @Body() dto: CreatePreferenceDto,
  ) {
    return this.paymentsService.createPreference(req.user.userId, dto.plan);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-payments')
  async getMyPayments(@Req() req: RequestWithUser) {
    return this.paymentsService.getUserPayments(req.user.userId);
  }

  /**
   * Public webhook endpoint — called by Mercado Pago servers.
   * 
   * Security:
   * - No auth guard (MP sends their own x-signature header)
   * - In production, x-signature is verified to prevent forgery
   * - SkipThrottle: MP can send rapid successive notifications
   * - Always returns 200 so MP doesn't retry unnecessarily
   * - Error details are logged server-side, never exposed in response
   */
  @SkipThrottle()
  @Post('webhook')
  async webhook(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    // Verify x-signature in production to prevent webhook forgery
    const xSignature = req.headers['x-signature'] as string;
    const xRequestId = req.headers['x-request-id'] as string;
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && !xSignature) {
      // Missing signature — reject in production
      return res.status(HttpStatus.OK).json({ received: true });
    }

    try {
      const result = await this.paymentsService.handleWebhook(body, xSignature, xRequestId);
      return res.status(HttpStatus.OK).json({ received: true });
    } catch {
      // Always return 200 — never expose errors to caller
      return res.status(HttpStatus.OK).json({ received: true });
    }
  }
}