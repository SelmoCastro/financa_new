import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle } from '@nestjs/throttler';
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
   * No auth guard (MP signs requests with their own mechanism in production).
   * SkipThrottle: MP can send rapid successive notifications.
   * For production: add x-signature verification from MP headers.
   */
  @SkipThrottle()
  @Post('webhook')
  async webhook(@Body() body: any) {
    return this.paymentsService.handleWebhook(body);
  }
}
