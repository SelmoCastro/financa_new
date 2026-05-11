import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import axios from 'axios';

const MP_API = 'https://api.mercadopago.com';

interface PreferenceItem {
  id: string;
  title: string;
  description: string;
  quantity: number;
  currency_id: string;
  unit_price: number;
}

interface PreferenceRequest {
  items: PreferenceItem[];
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

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {
    this.accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN') || '';
    if (!this.accessToken) {
      this.logger.warn('MERCADOPAGO_ACCESS_TOKEN not set — payments disabled');
    }
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async createPreference(userId: string, plan: 'premium_monthly' | 'premium_annual') {
    const prices: Record<string, { amount: number; title: string }> = {
      premium_monthly: { amount: 19.9, title: 'Finanza Premium — Mensal' },
      premium_annual: { amount: 179.9, title: 'Finanza Premium — Anual' },
    };

    const { amount, title } = prices[plan];
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://finanzaai.tech';
    const webhookUrl = this.configService.get<string>('MERCADOPAGO_WEBHOOK_URL')
      || `${this.configService.get<string>('API_URL') || 'https://api.finanzaai.tech'}/v1/payments/webhook`;

    const preferenceData: PreferenceRequest = {
      items: [{
        id: plan,
        title,
        description: title,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: amount,
      }],
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
      const response = await axios.post(
        `${MP_API}/checkout/preferences`,
        preferenceData,
        { headers: this.getHeaders() },
      );

      // Store pending payment record
      await this.prisma.payment.create({
        data: {
          userId,
          mpPreferenceId: response.data.id,
          amount,
          planPurchased: plan,
          status: 'pending',
        },
      });

      this.logger.log(`Preference created for user ${userId}: ${response.data.id}`);

      return {
        preferenceId: response.data.id,
        initPoint: response.data.init_point,
        sandboxInitPoint: response.data.sandbox_init_point,
        amount,
        plan,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create preference: ${error.message}`);
      throw error;
    }
  }

  async handleWebhook(webhookData: {
    type?: string;
    action?: string;
    data?: { id?: string };
  }) {
    this.logger.log(`Webhook received: type=${webhookData.type}, action=${webhookData.action}`);

    if (webhookData.type !== 'payment') {
      return { received: true, processed: false, reason: 'not a payment notification' };
    }

    const paymentId = webhookData.data?.id;
    if (!paymentId) {
      return { received: true, processed: false, reason: 'no payment id' };
    }

    return this.processPayment(paymentId);
  }

  async processPayment(mpPaymentId: string) {
    try {
      // Idempotency check: if already processed, skip
      const existing = await this.prisma.payment.findUnique({
        where: { mpPaymentId },
      });
      if (existing && existing.status !== 'pending') {
        this.logger.log(`Payment ${mpPaymentId} already processed with status: ${existing.status}`);
        return { paymentId: mpPaymentId, status: existing.status, upgraded: false, skipped: true };
      }

      // Fetch payment details from Mercado Pago
      const response = await axios.get(
        `${MP_API}/v1/payments/${mpPaymentId}`,
        { headers: this.getHeaders() },
      );

      const mpData = response.data;
      const userId = mpData.external_reference;
      const status = mpData.status;
      const paymentMethod = mpData.payment_method_id;
      const amount = mpData.transaction_amount || 0;
      const planId = mpData.additional_info?.items?.[0]?.id || 'premium_monthly';

      // Upsert payment record
      const paymentRecord = await this.prisma.payment.upsert({
        where: { mpPaymentId },
        update: { status, paymentMethod },
        create: {
          mpPaymentId,
          userId: userId || 'unknown',
          amount,
          planPurchased: planId,
          status,
          paymentMethod,
        },
      });

      // If payment approved, upgrade user's plan
      if (status === 'approved' && userId && userId !== 'unknown') {
        const planType = planId === 'premium_annual' ? 'premium' : 'premium';
        const expiresAt = planId === 'premium_annual'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await this.subscriptionService.upgrade(userId, planType, expiresAt);

        // Link payment to subscription
        const sub = await this.prisma.subscription.findUnique({ where: { userId } });
        if (sub) {
          await this.prisma.payment.update({
            where: { id: paymentRecord.id },
            data: { subscriptionId: sub.id },
          });
        }

        this.logger.log(`User ${userId} upgraded to ${planId}`);
      }

      return {
        paymentId: mpPaymentId,
        status,
        upgraded: status === 'approved',
      };
    } catch (error: any) {
      this.logger.error(`Failed to process payment ${mpPaymentId}: ${error.message}`);
      throw error;
    }
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
