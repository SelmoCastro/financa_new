import { HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController - webhook', () => {
  let controller: PaymentsController;
  let paymentsService: {
    verifyWebhookSignature: jest.Mock;
    handleWebhook: jest.Mock;
  };
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  const originalNodeEnv = process.env.NODE_ENV;

  const buildRequest = (
    headers: Record<string, string | undefined> = {},
    query: Record<string, string | undefined> = {},
  ): Request => ({
    headers,
    query,
  } as unknown as Request);

  const buildResponse = (): Response & {
    status: jest.Mock;
    json: jest.Mock;
  } => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    return res as unknown as Response & {
      status: jest.Mock;
      json: jest.Mock;
    };
  };

  const buildWebhookDto = () => ({
    type: 'payment',
    action: 'created',
    data_id: 'mp-pay-123',
  });

  beforeEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    paymentsService = {
      verifyWebhookSignature: jest.fn(),
      handleWebhook: jest.fn(),
    };
    controller = new PaymentsController(paymentsService as unknown as PaymentsService);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns 400 in production when x-signature is missing', async () => {
    process.env.NODE_ENV = 'production';
    const req = buildRequest({ 'x-request-id': 'req-123' });
    const res = buildResponse();

    await controller.webhook(buildWebhookDto() as any, req, res);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Missing x-signature header',
      }),
    );
    expect(paymentsService.verifyWebhookSignature).not.toHaveBeenCalled();
    expect(paymentsService.handleWebhook).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('req-123'),
    );
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('stack');
  });

  it('returns 401 when x-signature is invalid and logs sanitized correlation id', async () => {
    process.env.NODE_ENV = 'production';
    paymentsService.verifyWebhookSignature.mockReturnValue(false);
    const req = buildRequest({
      'x-signature': 'ts=1700000000,v1=invalid',
      'x-request-id': 'req-123\nBearer secret-token',
    });
    const res = buildResponse();

    await controller.webhook(buildWebhookDto() as any, req, res);

    expect(paymentsService.verifyWebhookSignature).toHaveBeenCalledWith(
      'mp-pay-123',
      'ts=1700000000,v1=invalid',
      'req-123',
    );
    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid webhook signature',
      }),
    );
    expect(paymentsService.handleWebhook).not.toHaveBeenCalled();
    const warnMessage = warnSpy.mock.calls.at(-1)?.[0] as string;
    expect(warnMessage).toContain('req-123');
    expect(warnMessage).not.toContain('secret-token');
    expect(warnMessage).not.toContain('\n');
  });

  it('returns 200 when webhook is processed successfully', async () => {
    process.env.NODE_ENV = 'production';
    paymentsService.verifyWebhookSignature.mockReturnValue(true);
    paymentsService.handleWebhook.mockResolvedValue({
      processed: true,
      upgraded: true,
    });
    const req = buildRequest({
      'x-signature': 'ts=1700000000,v1=valid',
      'x-request-id': 'req-success',
    });
    const res = buildResponse();

    await controller.webhook(buildWebhookDto() as any, req, res);

    expect(paymentsService.handleWebhook).toHaveBeenCalledWith(
      buildWebhookDto(),
      'ts=1700000000,v1=valid',
      'req-success',
    );
    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('uses signed query data.id as the canonical payment id', async () => {
    process.env.NODE_ENV = 'production';
    paymentsService.verifyWebhookSignature.mockReturnValue(true);
    paymentsService.handleWebhook.mockResolvedValue({ processed: true });
    const req = buildRequest(
      {
        'x-signature': 'ts=1700000000,v1=valid',
        'x-request-id': 'req-query',
      },
      { 'data.id': 'mp-query-456' },
    );
    const res = buildResponse();

    await controller.webhook(buildWebhookDto() as any, req, res);

    expect(paymentsService.verifyWebhookSignature).toHaveBeenCalledWith(
      'mp-query-456',
      'ts=1700000000,v1=valid',
      'req-query',
    );
    expect(paymentsService.handleWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ data_id: 'mp-query-456' }),
      'ts=1700000000,v1=valid',
      'req-query',
    );
    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
  });

  it('returns 200 when webhook is idempotent', async () => {
    process.env.NODE_ENV = 'production';
    paymentsService.verifyWebhookSignature.mockReturnValue(true);
    paymentsService.handleWebhook.mockResolvedValue({
      processed: true,
      skipped: true,
    });
    const req = buildRequest({
      'x-signature': 'ts=1700000000,v1=valid',
      'x-request-id': 'req-idempotent',
    });
    const res = buildResponse();

    await controller.webhook(buildWebhookDto() as any, req, res);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('returns 503 when the service reports a transient processing error', async () => {
    process.env.NODE_ENV = 'production';
    paymentsService.verifyWebhookSignature.mockReturnValue(true);
    paymentsService.handleWebhook.mockResolvedValue({
      processed: false,
      error: true,
    });
    const req = buildRequest({
      'x-signature': 'ts=1700000000,v1=valid',
      'x-request-id': 'req-503\nBearer secret-token',
    });
    const res = buildResponse();

    await controller.webhook(buildWebhookDto() as any, req, res);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Webhook temporarily unavailable',
      }),
    );
    const forwardedRequestId = paymentsService.handleWebhook.mock.calls[0][2] as
      | string
      | undefined;
    expect(forwardedRequestId).toContain('req-503');
    expect(forwardedRequestId).not.toContain('secret-token');
    expect(forwardedRequestId).not.toContain('\n');
    const errorMessage = errorSpy.mock.calls.at(-1)?.[0] as string;
    expect(errorMessage).toContain('req-503');
    expect(errorMessage).not.toContain('secret-token');
    expect(errorMessage).not.toContain('\n');
  });

  it('returns 503 when webhook processing throws unexpectedly', async () => {
    process.env.NODE_ENV = 'production';
    paymentsService.verifyWebhookSignature.mockReturnValue(true);
    paymentsService.handleWebhook.mockRejectedValue(
      new Error('boom token=super-secret\nstack trace should not leak'),
    );
    const req = buildRequest({
      'x-signature': 'ts=1700000000,v1=valid',
      'x-request-id': 'req-throw',
    });
    const res = buildResponse();

    await controller.webhook(buildWebhookDto() as any, req, res);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Webhook temporarily unavailable',
      }),
    );
    const forwardedRequestId = paymentsService.handleWebhook.mock.calls[0][2] as
      | string
      | undefined;
    expect(forwardedRequestId).toContain('req-throw');
    expect(forwardedRequestId).not.toContain('super-secret');
    expect(forwardedRequestId).not.toContain('\n');
    const errorMessage = errorSpy.mock.calls.at(-1)?.[0] as string;
    expect(errorMessage).toContain('req-throw');
    expect(errorMessage).not.toContain('super-secret');
    expect(errorMessage).not.toContain('\n');
  });
});
