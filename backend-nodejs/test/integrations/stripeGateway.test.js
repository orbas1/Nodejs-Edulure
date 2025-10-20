import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import StripeGateway from '../../src/integrations/StripeGateway.js';
import IntegrationCircuitBreaker from '../../src/integrations/IntegrationCircuitBreaker.js';

function createGateway({ receiptResult } = {}) {
  const stripeClient = {
    paymentIntents: { create: vi.fn() },
    refunds: { create: vi.fn() },
    webhooks: { constructEvent: vi.fn() }
  };
  const receiptService = {
    recordReceipt: vi.fn().mockResolvedValue(
      receiptResult ?? { receipt: { id: 1, receivedAt: new Date() }, isDuplicate: false }
    ),
    markProcessed: vi.fn().mockResolvedValue(null)
  };
  const gateway = new StripeGateway({
    stripeClient,
    webhookSecret: 'whsec_test',
    circuitBreaker: new IntegrationCircuitBreaker({
      key: 'test:stripe',
      failureThreshold: 5,
      cooldownMs: 50,
      logger: { warn: vi.fn(), error: vi.fn() }
    }),
    retry: { maxAttempts: 1, baseDelayMs: 1 },
    webhook: { dedupeTtlSeconds: 60, maxSkewSeconds: 3600 },
    receiptService,
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
  });

  return { gateway, stripeClient, receiptService };
}

describe('StripeGateway', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries transient failures when creating payment intents', async () => {
    const { gateway, stripeClient } = createGateway();
    const retryableError = Object.assign(new Error('rate limit'), { statusCode: 429 });
    stripeClient.paymentIntents.create
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValueOnce({ id: 'pi_test', status: 'succeeded' });

    const result = await gateway.createPaymentIntent({ amount: 1000, currency: 'usd' }, {
      idempotencyKey: 'abc'
    });

    expect(result.id).toBe('pi_test');
    expect(stripeClient.paymentIntents.create).toHaveBeenCalledTimes(2);
  });

  it('marks duplicate webhooks without throwing', async () => {
    const duplicateReceipt = {
      receipt: { id: 2, receivedAt: new Date(Date.now() - 1000) },
      isDuplicate: true
    };
    const { gateway, stripeClient, receiptService } = createGateway({ receiptResult: duplicateReceipt });
    stripeClient.webhooks.constructEvent.mockReturnValue({
      id: 'evt_123',
      type: 'payment_intent.succeeded',
      created: Math.floor(Date.now() / 1000)
    });

    const verification = await gateway.verifyWebhook({ rawBody: '{}', signature: 'sig' });

    expect(verification.duplicate).toBe(true);
    expect(receiptService.recordReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'stripe', externalEventId: 'evt_123' })
    );
  });

  it('delegates webhook completion to the receipt service', async () => {
    const { gateway, receiptService } = createGateway();
    const receipt = { id: 42 };
    await gateway.markWebhookProcessed(receipt, { status: 'processed' });
    expect(receiptService.markProcessed).toHaveBeenCalledWith(42, {
      status: 'processed',
      errorMessage: null
    });
  });

  it('does not retry non-retryable errors', async () => {
    const { gateway, stripeClient } = createGateway();
    const nonRetryable = Object.assign(new Error('bad request'), { statusCode: 400 });
    stripeClient.paymentIntents.create.mockRejectedValue(nonRetryable);

    await expect(gateway.createPaymentIntent({ amount: 200, currency: 'usd' })).rejects.toBe(
      nonRetryable
    );
    expect(stripeClient.paymentIntents.create).toHaveBeenCalledTimes(1);
  });

  it('throws informative error when webhook secret missing', async () => {
    const stripeClient = {
      paymentIntents: { create: vi.fn() },
      refunds: { create: vi.fn() },
      webhooks: { constructEvent: vi.fn() }
    };
    const receiptService = {
      recordReceipt: vi.fn(),
      markProcessed: vi.fn()
    };

    const gateway = new StripeGateway({
      stripeClient,
      webhookSecret: null,
      circuitBreaker: null,
      retry: { maxAttempts: 0 },
      receiptService,
      logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() }
    });

    await expect(gateway.verifyWebhook({ rawBody: '{}', signature: 'sig' })).rejects.toThrow(
      /webhook secret/i
    );
  });
});
