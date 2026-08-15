/**
 * Controller HTTP do domínio de pagamentos; recebe as requisições, aplica guards/decorators e delega a regra de negócio aos services.
 */
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePreferenceDto, MercadoPagoWebhookDto } from './dto/payment.dto';
import { RequestWithUser } from '../common/types/request-with-user';

@Controller({
  path: 'payments',
  version: '1',
})
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

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
   * - Returns 503 on transient processing failures so Mercado Pago retries
   * - Error details are logged server-side, never exposed in response
   */
  @SkipThrottle()
  @Post('webhook')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: false }))
  async webhook(
    @Body() dto: MercadoPagoWebhookDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Verify x-signature in production to prevent webhook forgery
    const normalizeValue = (value: unknown): string => {
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value).trim();
      }
      if (Array.isArray(value) && value.length > 0) {
        const first: unknown = value[0];
        if (typeof first === 'string' || typeof first === 'number') {
          return String(first).trim();
        }
      }
      return '';
    };
    const xSignature = normalizeValue(req.headers['x-signature']);
    const rawRequestId = req.headers['x-request-id'];
    const signatureRequestId = normalizeValue(rawRequestId)
      .split(/[\r\n]/, 1)[0]
      .slice(0, 256);
    const xRequestId = signatureRequestId
      .replace(/[^a-zA-Z0-9._:-]/g, '')
      .slice(0, 128);
    const isProduction = process.env.NODE_ENV === 'production';
    const paymentId =
      normalizeValue(req.query?.['data.id']) ||
      normalizeValue(req.query?.data_id) ||
      normalizeValue(dto.data_id) ||
      normalizeValue(dto.data?.id) ||
      normalizeValue(dto.id);
    const canonicalDto = paymentId ? { ...dto, data_id: paymentId } : dto;

    if (isProduction && !xSignature) {
      // Missing signature — return 4xx so Mercado Pago retries
      // Returning 200 would silently discard the webhook
      this.logger.warn(
        `Webhook without signature requestId=${xRequestId || 'unknown'}`,
      );
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        message: 'Missing x-signature header',
      });
    }

    if (
      isProduction &&
      dto.type === 'payment' &&
      paymentId &&
      !this.paymentsService.verifyWebhookSignature(
        paymentId,
        xSignature,
        signatureRequestId || undefined,
      )
    ) {
      this.logger.warn(
        `Webhook with invalid signature requestId=${xRequestId || 'unknown'}`,
      );
      return res.status(HttpStatus.UNAUTHORIZED).json({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid webhook signature',
      });
    }

    try {
      const result = await this.paymentsService.handleWebhook(
        canonicalDto,
        xSignature,
        signatureRequestId || undefined,
      );
      if ('error' in result && result.error) {
        this.logger.error(
          `Transient webhook failure requestId=${xRequestId || 'unknown'}`,
        );
        return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Webhook temporarily unavailable',
        });
      }
      return res.status(HttpStatus.OK).json({ received: true });
    } catch {
      this.logger.error(
        `Unexpected webhook failure requestId=${xRequestId || 'unknown'}`,
      );
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Webhook temporarily unavailable',
      });
    }
  }
}
