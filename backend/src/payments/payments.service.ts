import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PlanId, MercadoPagoWebhookDto } from './dto/payment.dto';
import { SubscriptionService } from '../subscription/subscription.service';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';

const MP_API = 'https://api.mercadopago.com';

interface MercadoPagoPreference {
  items: Array<{
    id: string;
    title: string;
    description: string;
    quantity: number;
    currency_id: string;
    unit_price: number;
  }>;
  external_reference: string;
  notification_url: string;
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private accessToken: string;
  private webhookSecret: string;
  private isSandbox: boolean;
  private mpProxyUrl: string;
  // In-memory mutex to prevent race condition on payment processing
  private readonly processingPayments = new Set<string>();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
    private auditService: AuditService,
  ) {
    this.accessToken =
      this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN') || '';
    this.webhookSecret =
      this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET') || '';
    this.mpProxyUrl = this.configService.get<string>('MP_PROXY_URL') || '';
    if (this.mpProxyUrl) {
      this.logger.log(`Using MP proxy: ${this.mpProxyUrl}`);
    }
    // Sempre usar init_point (produção)
    this.isSandbox = false;
    if (!this.accessToken) {
      this.logger.warn('MERCADOPAGO_ACCESS_TOKEN not set — payments disabled');
    }
  }

  /**
   * Verify Mercado Pago webhook signature (x-signature header).
   * MP sends: x-signature: ts=<timestamp>,v1=<hmac-sha256>
   * Verification: HMAC-SHA256(webhookSecret, <data.id><timestamp>) == v1
   */
  verifyWebhookSignature(dataId: string, xSignature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn(
        'No MERCADOPAGO_WEBHOOK_SECRET set — rejecting webhook signature verification',
      );
      return false;
    }

    const parts = xSignature.split(',');
    let ts = '';
    let v1 = '';
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key.trim() === 'ts') ts = value.trim();
      if (key.trim() === 'v1') v1 = value.trim();
    }

    if (!ts || !v1) {
      this.logger.warn('Invalid x-signature format');
      return false;
    }

    // Hash = HMAC-SHA256(webhookSecret, dataId + ts)
    const manifest = `${dataId}${ts}`;
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(manifest)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(v1, 'hex'),
    );
  }

  private async mpRequest(
    path: string,
    options: RequestInit = {},
  ): Promise<any> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    const baseUrl = this.mpProxyUrl || MP_API;
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...((options.headers as Record<string, string>) || {}),
      },
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `MercadoPago API error ${response.status}: ${body.substring(0, 200)}`,
      );
      throw new Error(`MercadoPago API error ${response.status}`);
    }

    return response.json();
  }

  async createPreference(userId: string, plan: PlanId) {
    const prices: Record<
      PlanId,
      { amount: number; title: string; durationDays: number }
    > = {
      premium_monthly: {
        amount: 19.9,
        title: 'Finanza Premium — Mensal',
        durationDays: 30,
      },
      premium_quarterly: {
        amount: 54.9,
        title: 'Finanza Premium — Trimestral',
        durationDays: 90,
      },
      premium_semiannual: {
        amount: 99.9,
        title: 'Finanza Premium — Semestral',
        durationDays: 180,
      },
      premium_annual: {
        amount: 179.9,
        title: 'Finanza Premium — Anual',
        durationDays: 365,
      },
    };

    const { amount, title } = prices[plan];
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://finanzaai.tech';
    const webhookUrl =
      this.configService.get<string>('MERCADOPAGO_WEBHOOK_URL') ||
      `${this.configService.get<string>('API_URL') || 'https://api.finanzaai.tech'}/v1/payments/webhook`;

    const preference: MercadoPagoPreference = {
      items: [
        {
          id: plan,
          title,
          description: title,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: amount,
        },
      ],
      external_reference: userId,
      notification_url: webhookUrl,
      back_urls: {
        success: `${frontendUrl}/premium/success`,
        failure: `${frontendUrl}/premium/failure`,
        pending: `${frontendUrl}/premium/pending`,
      },
      auto_return: 'approved',
    };

    try {
      const response = await this.mpRequest('/checkout/preferences', {
        method: 'POST',
        body: JSON.stringify(preference),
      });

      // Store pending payment record
      await this.prisma.payment.create({
        data: {
          userId,
          mpPreferenceId: response.id,
          amount,
          planPurchased: plan,
          status: 'pending',
        },
      });

      this.logger.log(`Preference created for user ${userId}: ${response.id}`);

      const checkoutUrl = response.init_point;

      return {
        preferenceId: response.id,
        initPoint: checkoutUrl,
        sandbox: false,
        amount,
        plan,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create preference: ${error.message}`);
      throw error;
    }
  }

  async handleWebhook(
    dto: MercadoPagoWebhookDto,
    xSignature?: string,
    xRequestId?: string,
  ) {
    this.logger.log(`Webhook received: type=${dto.type}, action=${dto.action}`);

    if (dto.type !== 'payment') {
      return { received: true, processed: false };
    }

    const paymentId = dto.data_id || dto.id?.toString();
    if (!paymentId) {
      this.logPaymentAlert('payments.webhook_missing_payment_id', 'warn', {
        type: dto.type,
        action: dto.action,
        requestId: xRequestId,
      });
      return { received: true, processed: false };
    }

    // Verify x-signature before processing any payment. Fail closed when secret/header is missing.
    if (!xSignature || !this.verifyWebhookSignature(paymentId, xSignature)) {
      this.logger.warn(
        `Webhook signature verification failed for payment ${paymentId}`,
      );
      this.logPaymentAlert('payments.webhook_signature_failed', 'critical', {
        mpPaymentId: paymentId,
        requestId: xRequestId,
      });
      return { received: true, processed: false };
    }

    return this.processPayment(paymentId);
  }

  async processPayment(mpPaymentId: string) {
    // Race condition protection: skip if already processing this payment
    if (this.processingPayments.has(mpPaymentId)) {
      this.logger.log(
        `Payment ${mpPaymentId} already being processed, skipping duplicate`,
      );
      return { processed: true, skipped: true };
    }
    this.processingPayments.add(mpPaymentId);
    try {
      return await this._doProcessPayment(mpPaymentId);
    } finally {
      this.processingPayments.delete(mpPaymentId);
    }
  }

  private async _doProcessPayment(mpPaymentId: string) {
    try {
      // Idempotency check: if already processed, skip
      const existing = await this.prisma.payment.findUnique({
        where: { mpPaymentId },
      });
      if (existing && existing.status !== 'pending') {
        this.logger.log(
          `Payment ${mpPaymentId} already processed with status: ${existing.status}`,
        );
        return { processed: true, skipped: true };
      }

      // Fetch payment details from Mercado Pago
      const mpData = await this.mpRequest(`/v1/payments/${mpPaymentId}`);

      const userId = mpData.external_reference;
      const status = mpData.status;
      const paymentMethod = mpData.payment_method_id;
      const amount = mpData.transaction_amount || 0;
      const planId =
        mpData.additional_info?.items?.[0]?.id || 'premium_monthly';

      // Validate planId is a recognized plan
      const validPlans = [
        'premium_monthly',
        'premium_quarterly',
        'premium_semiannual',
        'premium_annual',
      ];
      if (!validPlans.includes(planId)) {
        this.logger.warn(
          `Invalid planId from MP payment ${mpPaymentId}: ${planId}, defaulting to premium_monthly`,
        );
        this.logPaymentAlert('payments.invalid_plan', 'warn', {
          mpPaymentId,
          planId,
        });
      }
      const safePlanId = validPlans.includes(planId)
        ? planId
        : 'premium_monthly';

      // Validate amount matches expected plan price
      const prices: Record<string, number> = {
        premium_monthly: 19.9,
        premium_quarterly: 54.9,
        premium_semiannual: 99.9,
        premium_annual: 179.9,
      };
      const expectedAmount = prices[safePlanId];
      if (expectedAmount && Math.abs(amount - expectedAmount) > 1) {
        this.logger.warn(
          `Amount mismatch for payment ${mpPaymentId}: expected ${expectedAmount}, got ${amount}`,
        );
        this.logPaymentAlert('payments.amount_mismatch', 'critical', {
          mpPaymentId,
          expectedAmount,
          receivedAmount: amount,
          planId: safePlanId,
        });
        // Don't upgrade — suspicious payment
        return { processed: true, upgraded: false };
      }

      // Upsert payment record
      const paymentRecord = await this.prisma.payment.upsert({
        where: { mpPaymentId },
        update: { status, paymentMethod },
        create: {
          mpPaymentId,
          userId: userId || 'unknown',
          amount,
          planPurchased: safePlanId,
          status,
          paymentMethod,
        },
      });

      // If payment approved, upgrade user's plan
      if (status === 'approved' && userId && userId !== 'unknown') {
        const planDurations: Record<string, number> = {
          premium_monthly: 30,
          premium_quarterly: 90,
          premium_semiannual: 180,
          premium_annual: 365,
        };
        const durationDays = planDurations[safePlanId] || 30;
        const expiresAt = new Date(
          Date.now() + durationDays * 24 * 60 * 60 * 1000,
        );

        await this.subscriptionService.upgrade(userId, 'premium', expiresAt);

        // Link payment to subscription
        const sub = await this.prisma.subscription.findUnique({
          where: { userId },
        });
        if (sub) {
          await this.prisma.payment.update({
            where: { id: paymentRecord.id },
            data: { subscriptionId: sub.id },
          });
        }

        this.logger.log(`User ${userId} upgraded to ${safePlanId}`);
        this.logPaymentAlert(
          'payments.approved',
          'info',
          {
            mpPaymentId,
            planId: safePlanId,
          },
          userId,
        );
      }

      return {
        processed: true,
        upgraded: status === 'approved',
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to process payment ${mpPaymentId}: ${error.message}`,
      );
      this.logPaymentAlert('payments.processing_failed', 'critical', {
        mpPaymentId,
        error: error?.message || 'unknown',
      });
      // Don't throw — webhook must always return 200 so MP doesn't retry
      return { processed: false, error: true };
    }
  }

  private logPaymentAlert(
    action: string,
    severity: 'info' | 'warn' | 'critical',
    details: Record<string, unknown>,
    actorId?: string,
  ) {
    void this.auditService.log({
      action,
      actorId,
      targetType: 'Payment',
      targetId:
        typeof details.mpPaymentId === 'string'
          ? details.mpPaymentId
          : undefined,
      severity,
      details,
    });
  }

  async getUserPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getPaymentById(paymentId: string) {
    return this.prisma.payment.findUnique({ where: { id: paymentId } });
  }
}
