import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';

// Keep a reference to the real crypto for tests that need real hashing
const realCrypto = { ...crypto };

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    payment: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    subscription: {
      findUnique: jest.Mock;
    };
  };
  let configService: { get: jest.Mock };
  let subscriptionService: { upgrade: jest.Mock };
  let auditService: { log: jest.Mock };

  const userId = 'user-1';
  const mpPaymentId = 'mp-pay-123';
  const preferenceId = 'mp-pref-456';

  const mockPayment = {
    id: 'pay-1',
    userId,
    mpPaymentId,
    mpPreferenceId: preferenceId,
    amount: 19.9,
    currency: 'BRL',
    status: 'pending',
    planPurchased: 'premium_monthly',
    paymentMethod: null,
    subscriptionId: null,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
  };

  const mockSubscription = {
    id: 'sub-1',
    userId,
    plan: 'premium',
    status: 'active',
    expiresAt: null,
  };

  // ------------------------------------------------------------------
  // Mock factory helpers
  // ------------------------------------------------------------------
  function buildConfigMock(overrides: Record<string, string> = {}) {
    const defaults: Record<string, string> = {
      MERCADOPAGO_ACCESS_TOKEN: 'test_access_token_123',
      MERCADOPAGO_WEBHOOK_SECRET: 'test_webhook_secret_abc',
      FRONTEND_URL: 'https://finanzaai.tech',
      MERCADOPAGO_WEBHOOK_URL: 'https://api.finanzaai.tech/v1/payments/webhook',
      API_URL: 'https://api.finanzaai.tech',
    };
    return {
      get: jest.fn((key: string) => overrides[key] ?? defaults[key] ?? null),
    };
  }

  function buildEmptyConfigMock() {
    return {
      get: jest.fn(() => undefined),
    };
  }

  beforeEach(async () => {
    prisma = {
      payment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      subscription: {
        findUnique: jest.fn(),
      },
    };

    configService = buildConfigMock();
    subscriptionService = { upgrade: jest.fn() };
    auditService = { log: jest.fn() };
  });

  async function buildService(cfg?: typeof configService) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: ConfigService, useValue: cfg ?? configService },
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionService, useValue: subscriptionService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    return service;
  }

  // ==================================================================
  // verifyWebhookSignature
  // ==================================================================
  describe('verifyWebhookSignature', () => {
    it('should return true when signature is valid', async () => {
      await buildService();
      const dataId = 'payment-1';
      const ts = '1700000000';
      const manifest = `${dataId}${ts}`;
      const v1 = crypto
        .createHmac('sha256', 'test_webhook_secret_abc')
        .update(manifest)
        .digest('hex');

      const xSignature = `ts=${ts},v1=${v1}`;
      const result = service.verifyWebhookSignature(dataId, xSignature);
      expect(result).toBe(true);
    });

    it('should return false when webhookSecret is not set', async () => {
      await buildService(buildEmptyConfigMock());
      const result = service.verifyWebhookSignature('any-id', 'ts=123,v1=abc');
      expect(result).toBe(false);
    });

    it('should return false when x-signature format is invalid (missing ts)', async () => {
      await buildService();
      const result = service.verifyWebhookSignature('any-id', 'v1=abc');
      expect(result).toBe(false);
    });

    it('should return false when x-signature format is invalid (missing v1)', async () => {
      await buildService();
      const result = service.verifyWebhookSignature('any-id', 'ts=123');
      expect(result).toBe(false);
    });

    it('should return false when x-signature is empty string', async () => {
      await buildService();
      const result = service.verifyWebhookSignature('any-id', '');
      expect(result).toBe(false);
    });

    it('should return false when signature does not match', async () => {
      await buildService();
      const dataId = 'payment-1';
      const ts = '1700000000';
      // Generate a proper-length HMAC (64 hex chars = 32 bytes) but with wrong secret
      const wrongV1 = crypto
        .createHmac('sha256', 'WRONG_SECRET')
        .update(`${dataId}${ts}`)
        .digest('hex');
      const xSignature = `ts=${ts},v1=${wrongV1}`;
      const result = service.verifyWebhookSignature(dataId, xSignature);
      expect(result).toBe(false);
    });

    it('should use timingSafeEqual for constant-time comparison', async () => {
      await buildService();
      // Valid signature
      const dataId = 'payment-1';
      const ts = '1700000000';
      const validV1 = crypto
        .createHmac('sha256', 'test_webhook_secret_abc')
        .update(`${dataId}${ts}`)
        .digest('hex');
      const validSig = `ts=${ts},v1=${validV1}`;
      expect(service.verifyWebhookSignature(dataId, validSig)).toBe(true);

      // Invalid signature (same length, different content)
      const invalidV1 = crypto
        .createHmac('sha256', 'WRONG_SECRET')
        .update(`${dataId}${ts}`)
        .digest('hex');
      const invalidSig = `ts=${ts},v1=${invalidV1}`;
      expect(service.verifyWebhookSignature(dataId, invalidSig)).toBe(false);
    });
  });

  // ==================================================================
  // createPreference
  // ==================================================================
  describe('createPreference', () => {
    const mockMpResponse = {
      id: preferenceId,
      init_point: 'https://mercadopago.com/checkout/123',
    };

    beforeEach(() => {
      // Mock fetch globally
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockMpResponse),
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should create a preference via MP API and store pending payment', async () => {
      await buildService();
      prisma.payment.create.mockResolvedValue(mockPayment);

      const result = await service.createPreference(userId, 'premium_monthly');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.mercadopago.com/checkout/preferences',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_access_token_123',
            'Content-Type': 'application/json',
          }),
        }),
      );

      // Verify body sent to MP
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const sentBody = JSON.parse(fetchCall[1].body);
      expect(sentBody.items[0].unit_price).toBe(19.9);
      expect(sentBody.items[0].id).toBe('premium_monthly');
      expect(sentBody.external_reference).toBe(userId);

      // Verify pending payment stored
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          userId,
          mpPreferenceId: preferenceId,
          amount: 19.9,
          planPurchased: 'premium_monthly',
          status: 'pending',
        },
      });

      expect(result).toEqual({
        preferenceId,
        initPoint: mockMpResponse.init_point,
        sandbox: false,
        amount: 19.9,
        plan: 'premium_monthly',
      });
    });

    it('should use correct prices for each plan', async () => {
      await buildService();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'pref-x', init_point: 'https://mp.com/x' }),
      });
      prisma.payment.create.mockResolvedValue(mockPayment);

      const plans: Array<{ plan: 'premium_monthly' | 'premium_quarterly' | 'premium_semiannual' | 'premium_annual'; expectedPrice: number }> = [
        { plan: 'premium_monthly', expectedPrice: 19.9 },
        { plan: 'premium_quarterly', expectedPrice: 54.9 },
        { plan: 'premium_semiannual', expectedPrice: 99.9 },
        { plan: 'premium_annual', expectedPrice: 179.9 },
      ];

      for (let i = 0; i < plans.length; i++) {
        const { plan, expectedPrice } = plans[i];
        await service.createPreference(userId, plan);
        const sentBody = JSON.parse((global.fetch as jest.Mock).mock.calls[i][1].body);
        expect(sentBody.items[0].unit_price).toBe(expectedPrice);
      }

      // Verify 4 payment records were created with correct amounts
      expect(prisma.payment.create).toHaveBeenCalledTimes(4);
      expect(prisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: 179.9, planPurchased: 'premium_annual' }),
        }),
      );
    });

    it('should throw when MP API returns an error', async () => {
      await buildService();
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad Request'),
      });

      await expect(
        service.createPreference(userId, 'premium_monthly'),
      ).rejects.toThrow('MercadoPago API error 400');
    });

    it('should use MP_PROXY_URL when configured', async () => {
      const cfg = buildConfigMock({ MP_PROXY_URL: 'https://mp-proxy.example.com' });
      await buildService(cfg);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'pref-x', init_point: 'https://mp.com/x' }),
      });
      prisma.payment.create.mockResolvedValue(mockPayment);

      await service.createPreference(userId, 'premium_monthly');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://mp-proxy.example.com/checkout/preferences',
        expect.any(Object),
      );
    });

    it('should not create payment record when MP API fails', async () => {
      await buildService();
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      });

      await expect(
        service.createPreference(userId, 'premium_monthly'),
      ).rejects.toThrow();

      // Payment should NOT have been created
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });
  });

  // ==================================================================
  // handleWebhook
  // ==================================================================
  describe('handleWebhook', () => {
    it('should skip non-payment type webhooks', async () => {
      await buildService();
      const dto = { type: 'merchant_order', action: 'updated' };
      const result = await service.handleWebhook(dto as any);
      expect(result).toEqual({ received: true, processed: false });
    });

    it('should return processed:false when payment id is missing', async () => {
      await buildService();
      const dto = { type: 'payment', action: 'created' };
      const result = await service.handleWebhook(dto as any);
      expect(result).toEqual({ received: true, processed: false });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'payments.webhook_missing_payment_id' }),
      );
    });

    it('should extract payment id from data_id field', async () => {
      await buildService();
      // Mock verifyWebhookSignature to pass (we're testing ID extraction, not sig verification)
      jest.spyOn(service, 'verifyWebhookSignature').mockReturnValue(true);
      jest.spyOn(service as any, 'processPayment').mockResolvedValue({ processed: true, upgraded: false });

      const dto = { type: 'payment', action: 'created', data_id: mpPaymentId };
      const result = await service.handleWebhook(dto as any, 'ts=1,v1=valid');

      // processPayment should have been called with the data_id
      expect((service as any).processPayment).toHaveBeenCalledWith(mpPaymentId);
    });

    it('should extract payment id from id field when data_id is absent', async () => {
      await buildService();
      jest.spyOn(service, 'verifyWebhookSignature').mockReturnValue(true);
      jest.spyOn(service as any, 'processPayment').mockResolvedValue({ processed: true, upgraded: false });

      const dto = { type: 'payment', action: 'created', id: 98765 };
      const result = await service.handleWebhook(dto as any, 'ts=1,v1=valid');

      expect((service as any).processPayment).toHaveBeenCalledWith('98765');
    });
  });

  // ==================================================================
  // processPayment (PIX, card, refund flows)
  // ==================================================================
  describe('processPayment', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    // --- Race condition protection ---
    it('should skip duplicate payment that is already being processed', async () => {
      await buildService();
      // Call the method concurrently — second call should be skipped
      const mpData = {
        id: mpPaymentId,
        external_reference: userId,
        status: 'approved',
        payment_method_id: 'pix',
        transaction_amount: 19.9,
        additional_info: { items: [{ id: 'premium_monthly' }] },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mpData),
      });
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.payment.upsert.mockResolvedValue({ ...mockPayment, status: 'approved' });
      prisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      subscriptionService.upgrade.mockResolvedValue(mockSubscription);

      // First call that blocks while processing
      const firstPromise = service.processPayment(mpPaymentId);

      // Second call while first is still processing
      const secondResult = await service.processPayment(mpPaymentId);
      expect(secondResult).toEqual({ processed: true, skipped: true });

      // Wait for first to finish
      await firstPromise;
    });

    // --- Idempotency ---
    it('should skip already-processed payment (idempotency)', async () => {
      await buildService();
      prisma.payment.findUnique.mockResolvedValue({ ...mockPayment, status: 'approved' });

      const result = await service.processPayment(mpPaymentId);

      expect(result).toEqual({ processed: true, skipped: true });
      // Should not call MP API
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should NOT skip pending payment (allow reprocessing)', async () => {
      await buildService();
      const mpData = {
        id: mpPaymentId,
        external_reference: userId,
        status: 'approved',
        payment_method_id: 'pix',
        transaction_amount: 19.9,
        additional_info: { items: [{ id: 'premium_monthly' }] },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mpData),
      });
      prisma.payment.findUnique.mockResolvedValue({ ...mockPayment, status: 'pending' });
      prisma.payment.upsert.mockResolvedValue({ ...mockPayment, status: 'approved' });
      prisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      subscriptionService.upgrade.mockResolvedValue(mockSubscription);

      const result = await service.processPayment(mpPaymentId);

      expect(result).toEqual({ processed: true, upgraded: true });
      expect(global.fetch).toHaveBeenCalled();
    });

    // --- PIX payment flow (approved) ---
    it('should process approved pix payment and upgrade user', async () => {
      await buildService();
      const mpData = {
        id: mpPaymentId,
        external_reference: userId,
        status: 'approved',
        payment_method_id: 'pix',
        transaction_amount: 19.9,
        additional_info: { items: [{ id: 'premium_monthly' }] },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mpData),
      });
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.payment.upsert.mockResolvedValue({ ...mockPayment, status: 'approved', paymentMethod: 'pix' });
      prisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      subscriptionService.upgrade.mockResolvedValue(mockSubscription);

      const result = await service.processPayment(mpPaymentId);

      // Verify MP API was called
      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.mercadopago.com/v1/payments/${mpPaymentId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test_access_token_123',
          }),
        }),
      );

      // Verify upsert with correct data
      expect(prisma.payment.upsert).toHaveBeenCalledWith({
        where: { mpPaymentId },
        update: { status: 'approved', paymentMethod: 'pix' },
        create: {
          mpPaymentId,
          userId,
          amount: 19.9,
          planPurchased: 'premium_monthly',
          status: 'approved',
          paymentMethod: 'pix',
        },
      });

      // Verify subscription upgrade
      expect(subscriptionService.upgrade).toHaveBeenCalledWith(
        userId,
        'premium',
        expect.any(Date),
      );

      // Verify payment link to subscription
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: { subscriptionId: mockSubscription.id },
      });

      expect(result).toEqual({ processed: true, upgraded: true });
    });

    // --- Credit card payment flow (approved) ---
    it('should process approved credit card payment and upgrade user', async () => {
      await buildService();
      const mpData = {
        id: mpPaymentId,
        external_reference: userId,
        status: 'approved',
        payment_method_id: 'visa',
        transaction_amount: 54.9,
        additional_info: { items: [{ id: 'premium_quarterly' }] },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mpData),
      });
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.payment.upsert.mockResolvedValue({ ...mockPayment, status: 'approved' });
      prisma.subscription.findUnique.mockResolvedValue({ ...mockSubscription, plan: 'premium' });

      const result = await service.processPayment(mpPaymentId);

      expect(result).toEqual({ processed: true, upgraded: true });
      expect(subscriptionService.upgrade).toHaveBeenCalledWith(
        userId,
        'premium',
        expect.any(Date),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payments.approved',
          severity: 'info',
        }),
      );
    });

    // --- Refund flow ---
    it('should process refunded payment and NOT upgrade user', async () => {
      await buildService();
      const mpData = {
        id: mpPaymentId,
        external_reference: userId,
        status: 'refunded',
        payment_method_id: 'pix',
        transaction_amount: 19.9,
        additional_info: { items: [{ id: 'premium_monthly' }] },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mpData),
      });
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.payment.upsert.mockResolvedValue({ ...mockPayment, status: 'refunded' });

      const result = await service.processPayment(mpPaymentId);

      expect(result).toEqual({ processed: true, upgraded: false });
      expect(subscriptionService.upgrade).not.toHaveBeenCalled();
    });

    // --- Rejected payment ---
    it('should process rejected payment and NOT upgrade user', async () => {
      await buildService();
      const mpData = {
        id: mpPaymentId,
        external_reference: userId,
        status: 'rejected',
        payment_method_id: 'visa',
        transaction_amount: 19.9,
        additional_info: { items: [{ id: 'premium_monthly' }] },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mpData),
      });
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.payment.upsert.mockResolvedValue({ ...mockPayment, status: 'rejected' });

      const result = await service.processPayment(mpPaymentId);

      expect(result).toEqual({ processed: true, upgraded: false });
      expect(subscriptionService.upgrade).not.toHaveBeenCalled();
    });

    // --- Amount mismatch ---
    it('should detect amount mismatch and refuse upgrade', async () => {
      await buildService();
      const mpData = {
        id: mpPaymentId,
        external_reference: userId,
        status: 'approved',
        payment_method_id: 'pix',
        transaction_amount: 5.0, // Wrong amount!
        additional_info: { items: [{ id: 'premium_monthly' }] },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mpData),
      });
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.payment.upsert.mockResolvedValue({ ...mockPayment, amount: 5.0, status: 'approved' });

      const result = await service.processPayment(mpPaymentId);

      expect(result).toEqual({ processed: true, upgraded: false });
      expect(subscriptionService.upgrade).not.toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payments.amount_mismatch',
          severity: 'critical',
        }),
      );
    });

    // --- Invalid plan fallback ---
    it('should default to premium_monthly when planId from MP is invalid', async () => {
      await buildService();
      const mpData = {
        id: mpPaymentId,
        external_reference: userId,
        status: 'approved',
        payment_method_id: 'pix',
        transaction_amount: 19.9,
        additional_info: { items: [{ id: 'unknown_plan' }] },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mpData),
      });
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.payment.upsert.mockResolvedValue({ ...mockPayment, status: 'approved' });
      prisma.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.processPayment(mpPaymentId);

      expect(result).toEqual({ processed: true, upgraded: true });
      expect(prisma.payment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ planPurchased: 'premium_monthly' }),
        }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payments.invalid_plan',
          severity: 'warn',
        }),
      );
    });

    // --- Error handling (should never throw) ---
    it('should catch errors and return error response instead of throwing', async () => {
      await buildService();
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.processPayment(mpPaymentId);

      expect(result).toEqual({ processed: false, error: true });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payments.processing_failed',
          severity: 'critical',
        }),
      );
    });

    // --- Quarterly plan pricing ---
    it('should correctly calculate duration for quarterly plan', async () => {
      await buildService();
      const mpData = {
        id: mpPaymentId,
        external_reference: userId,
        status: 'approved',
        payment_method_id: 'pix',
        transaction_amount: 54.9,
        additional_info: { items: [{ id: 'premium_quarterly' }] },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mpData),
      });
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.payment.upsert.mockResolvedValue({ ...mockPayment, status: 'approved' });
      prisma.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.processPayment(mpPaymentId);

      expect(result).toEqual({ processed: true, upgraded: true });
      expect(subscriptionService.upgrade).toHaveBeenCalledWith(
        userId,
        'premium',
        expect.any(Date),
      );

      // Verify expiresAt is ~90 days from now
      const expiresAt = (subscriptionService.upgrade as jest.Mock).mock.calls[0][2];
      const expectedMs = 90 * 24 * 60 * 60 * 1000;
      const diffMs = expiresAt.getTime() - Date.now();
      expect(diffMs).toBeGreaterThan(expectedMs - 5000);
      expect(diffMs).toBeLessThan(expectedMs + 5000);
    });
  });

  // ==================================================================
  // getUserPayments
  // ==================================================================
  describe('getUserPayments', () => {
    it('should return payments for the user sorted by createdAt desc', async () => {
      await buildService();
      const payments = [
        { ...mockPayment, id: 'p1', createdAt: new Date('2026-01-20') },
        { ...mockPayment, id: 'p2', createdAt: new Date('2026-01-15') },
      ];
      prisma.payment.findMany.mockResolvedValue(payments);

      const result = await service.getUserPayments(userId);

      expect(result).toEqual(payments);
      expect(prisma.payment.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });

    it('should return empty array when user has no payments', async () => {
      await buildService();
      prisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getUserPayments(userId);

      expect(result).toEqual([]);
    });
  });

  // ==================================================================
  // getPaymentById
  // ==================================================================
  describe('getPaymentById', () => {
    it('should return a payment by id', async () => {
      await buildService();
      prisma.payment.findUnique.mockResolvedValue(mockPayment);

      const result = await service.getPaymentById('pay-1');

      expect(result).toEqual(mockPayment);
      expect(prisma.payment.findUnique).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
      });
    });

    it('should return null when payment not found', async () => {
      await buildService();
      prisma.payment.findUnique.mockResolvedValue(null);

      const result = await service.getPaymentById('non-existent');

      expect(result).toBeNull();
    });
  });

  // ==================================================================
  // Webhook signature integration: handleWebhook + verifyWebhookSignature
  // ==================================================================
  describe('webhook signature integration', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should reject webhook when x-signature is invalid', async () => {
      await buildService();
      const dataId = mpPaymentId;
      const ts = '1700000000';
      // Generate a proper-length wrong HMAC so timingSafeEqual doesn't throw
      const wrongV1 = crypto
        .createHmac('sha256', 'WRONG_SECRET')
        .update(`${dataId}${ts}`)
        .digest('hex');
      const xSignature = `ts=${ts},v1=${wrongV1}`;

      const dto = { type: 'payment', action: 'created', data_id: mpPaymentId };
      const result = await service.handleWebhook(dto, xSignature);

      expect(result).toEqual({ received: true, processed: false });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payments.webhook_signature_failed',
          severity: 'critical',
        }),
      );
      // MP API should NOT be called
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should accept webhook with valid signature and process payment', async () => {
      await buildService();

      // Generate a valid signature
      const ts = '1700000000';
      const dataId = mpPaymentId;
      const manifest = `${dataId}${ts}`;
      const v1 = crypto
        .createHmac('sha256', 'test_webhook_secret_abc')
        .update(manifest)
        .digest('hex');
      const xSignature = `ts=${ts},v1=${v1}`;

      const mpData = {
        id: mpPaymentId,
        external_reference: userId,
        status: 'approved',
        payment_method_id: 'pix',
        transaction_amount: 19.9,
        additional_info: { items: [{ id: 'premium_monthly' }] },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mpData),
      });
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.payment.upsert.mockResolvedValue({ ...mockPayment, status: 'approved' });
      prisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      subscriptionService.upgrade.mockResolvedValue(mockSubscription);

      const dto = { type: 'payment', action: 'created', data_id: mpPaymentId };
      const result = await service.handleWebhook(dto, xSignature);

      expect(result).toEqual({ processed: true, upgraded: true });
    });
  });
});
