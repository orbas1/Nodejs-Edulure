import { setTimeout as delay } from 'node:timers/promises';

import IntegrationWebhookReceiptService from '../services/IntegrationWebhookReceiptService.js';

const RETRYABLE_ERROR_TYPES = new Set([
  'StripeAPIError',
  'StripeConnectionError',
  'StripeIdempotencyError',
  'StripeRateLimitError'
]);

export default class StripeGateway {
  constructor({
    stripeClient,
    webhookSecret,
    circuitBreaker,
    retry,
    webhook,
    logger,
    receiptService = IntegrationWebhookReceiptService
  }) {
    if (!stripeClient) {
      throw new Error('StripeGateway requires a configured Stripe client instance.');
    }

    this.client = stripeClient;
    this.circuitBreaker = circuitBreaker;
    this.retry = {
      maxAttempts: retry?.maxAttempts ?? 0,
      baseDelayMs: retry?.baseDelayMs ?? 250
    };
    this.webhook = {
      dedupeTtlSeconds: webhook?.dedupeTtlSeconds ?? 86400,
      maxSkewSeconds: webhook?.maxSkewSeconds ?? 1800
    };
    this.logger = logger ?? console;
    this.webhookSecret = webhookSecret;
    this.receiptService = receiptService;
  }

  isConfigured() {
    return Boolean(this.client);
  }

  isRetryable(error) {
    const status = error?.statusCode ?? error?.status ?? error?.httpStatus ?? error?.code;
    if (status === 429) {
      return true;
    }
    if (typeof status === 'number' && status >= 500) {
      return true;
    }
    if (error?.type && RETRYABLE_ERROR_TYPES.has(error.type)) {
      return true;
    }
    return false;
  }

  async execute(operation, handler) {
    const breaker = this.circuitBreaker;
    const { allowed } = breaker ? await breaker.allowRequest() : { allowed: true };
    if (!allowed) {
      const error = new Error(`Stripe circuit breaker is open for operation ${operation}.`);
      error.code = 'CIRCUIT_OPEN';
      throw error;
    }

    let attempt = 0;
    let lastError;
    const maxAttempts = this.retry.maxAttempts;

    while (attempt <= maxAttempts) {
      attempt += 1;
      try {
        const result = await handler();
        if (breaker) {
          await breaker.recordSuccess();
        }
        return result;
      } catch (error) {
        lastError = error;
        if (breaker) {
          await breaker.recordFailure();
        }

        const shouldRetry = attempt <= maxAttempts && this.isRetryable(error);
        this.logger.warn({ err: error, attempt, operation }, 'Stripe operation failed');
        if (!shouldRetry) {
          throw error;
        }

        const delayMs = this.retry.baseDelayMs * attempt;
        await delay(delayMs);
      }
    }

    throw lastError;
  }

  async createPaymentIntent(params, { idempotencyKey } = {}) {
    return this.execute('payment_intents.create', () =>
      this.client.paymentIntents.create(params, idempotencyKey ? { idempotencyKey } : undefined)
    );
  }

  async refundPaymentIntent(params, { idempotencyKey } = {}) {
    return this.execute('refunds.create', () =>
      this.client.refunds.create(params, idempotencyKey ? { idempotencyKey } : undefined)
    );
  }

  async verifyWebhook({ rawBody, signature }) {
    if (!this.webhookSecret) {
      const error = new Error('Stripe webhook secret is not configured.');
      error.code = 'WEBHOOK_SECRET_MISSING';
      throw error;
    }

    let event;
    try {
      event = this.client.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (error) {
      this.logger.error({ err: error }, 'Stripe webhook signature validation failed');
      error.status = 400;
      throw error;
    }

    const receivedAt = new Date();
    const { receipt, isDuplicate } = await this.receiptService.recordReceipt({
      provider: 'stripe',
      externalEventId: event.id,
      signature,
      rawBody,
      receivedAt,
      metadata: {
        type: event.type,
        createdAt: event.created ? new Date(event.created * 1000).toISOString() : null
      },
      dedupeTtlSeconds: this.webhook.dedupeTtlSeconds
    });

    if (!receipt) {
      const error = new Error('Failed to persist Stripe webhook receipt.');
      error.status = 500;
      throw error;
    }

    if (event.created) {
      const createdAt = new Date(event.created * 1000);
      const skewSeconds = Math.abs(receivedAt.getTime() - createdAt.getTime()) / 1000;
      if (skewSeconds > this.webhook.maxSkewSeconds) {
        this.logger.warn(
          { eventId: event.id, createdAt, receivedAt, skewSeconds },
          'Stripe webhook arrived outside acceptable skew window'
        );
      }
    }

    if (isDuplicate) {
      this.logger.info({ eventId: event.id }, 'Ignoring duplicate Stripe webhook event');
    }

    return { event, receipt, duplicate: isDuplicate };
  }

  async markWebhookProcessed(receipt, { status = 'processed', errorMessage = null } = {}) {
    if (!receipt) {
      return null;
    }

    return this.receiptService.markProcessed(receipt.id, { status, errorMessage });
  }
}
