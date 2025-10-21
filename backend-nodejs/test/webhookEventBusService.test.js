import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WebhookEventBusService } from '../src/services/WebhookEventBusService.js';

const subscriptionModel = {
  findForEvent: vi.fn(),
  recordSuccess: vi.fn(),
  recordFailure: vi.fn()
};
const eventModel = {
  create: vi.fn(),
  updateStatus: vi.fn(),
  touchAttempt: vi.fn(),
  markDelivered: vi.fn(),
  markFailed: vi.fn(),
  markPartial: vi.fn()
};
const deliveryModel = {
  enqueueMany: vi.fn(),
  recoverStuck: vi.fn(),
  claimPending: vi.fn(),
  markDelivered: vi.fn(),
  markFailed: vi.fn(),
  summariseStatuses: vi.fn().mockResolvedValue({ delivered: 1, failed: 0, pending: 0, delivering: 0 })
};

const fetchImpl = vi.fn(async () => ({
  ok: true,
  status: 200,
  text: async () => 'ok'
}));

const loggerInstance = { child: () => loggerInstance, info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

const envConfig = {
  enabled: true,
  pollIntervalMs: 10,
  batchSize: 5,
  maxAttempts: 4,
  initialBackoffSeconds: 30,
  maxBackoffSeconds: 120,
  deliveryTimeoutMs: 2000,
  recoverAfterMs: 60_000
};

describe('WebhookEventBusService', () => {
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WebhookEventBusService({
      subscriptionModel,
      eventModel,
      deliveryModel,
      fetchImpl,
      loggerInstance,
      envConfig,
      randomImpl: () => 0.5
    });
  });

  it('publishes events to subscribed webhooks', async () => {
    subscriptionModel.findForEvent.mockResolvedValue([
      {
        id: 1,
        targetUrl: 'https://example.com/webhook',
        signingSecret: 'secret',
        maxAttempts: 3
      }
    ]);

    eventModel.create.mockResolvedValue({ id: 10, eventUuid: 'evt-uuid' });

    const event = await service.publish('user.created', { id: 5 }, { source: 'api', correlationId: 'corr-1' });
    expect(eventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'user.created', source: 'api', correlationId: 'corr-1' }),
      expect.anything()
    );
    expect(deliveryModel.enqueueMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          eventId: 10,
          subscriptionId: 1,
          status: 'pending'
        })
      ],
      expect.anything()
    );
    expect(event.id).toBe(10);
  });

  it('delivers webhook payloads and records success metrics', async () => {
    const delivery = {
      id: 22,
      deliveryUuid: 'delivery-uuid',
      attemptCount: 0,
      maxAttempts: 3,
      event: {
        id: 10,
        eventUuid: 'evt-uuid',
        eventType: 'user.created',
        source: 'api',
        correlationId: 'corr-1',
        payload: { id: 5 },
        metadata: { key: 'value' },
        firstQueuedAt: new Date('2024-01-01T00:00:00Z')
      },
      subscription: {
        id: 1,
        publicId: 'sub-1',
        targetUrl: 'https://example.com/webhook',
        signingSecret: 'secret',
        deliveryTimeoutMs: 1000,
        staticHeaders: { 'X-Custom': 'Value' },
        consecutiveFailures: 0,
        maxAttempts: 3
      }
    };

    await service.dispatchDelivery(delivery);

    expect(eventModel.updateStatus).toHaveBeenCalledWith(10, 'processing', expect.anything());
    expect(eventModel.touchAttempt).toHaveBeenCalledWith(10, expect.any(Date), expect.anything());
    expect(deliveryModel.markDelivered).toHaveBeenCalledWith(
      22,
      expect.objectContaining({ responseCode: 200, deliveredAt: expect.any(Date) }),
      expect.anything()
    );
    expect(subscriptionModel.recordSuccess).toHaveBeenCalledWith(1, expect.anything());
  });

  it('marks delivery failures and schedules retry with backoff', async () => {
    fetchImpl.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'error' });

    const delivery = {
      id: 33,
      deliveryUuid: 'delivery-fail',
      attemptCount: 1,
      maxAttempts: 3,
      event: {
        id: 77,
        eventUuid: 'evt-fail',
        eventType: 'user.updated',
        source: 'api',
        correlationId: 'corr-2',
        payload: {},
        metadata: {},
        firstQueuedAt: null
      },
      subscription: {
        id: 2,
        publicId: 'sub-2',
        targetUrl: 'https://example.com/fail',
        signingSecret: 'secret',
        deliveryTimeoutMs: 1000,
        consecutiveFailures: 1,
        retryBackoffSeconds: 60,
        circuitBreakerThreshold: 2
      }
    };

    await service.dispatchDelivery(delivery);

    expect(deliveryModel.markFailed).toHaveBeenCalledWith(
      33,
      expect.objectContaining({
        errorCode: 'Error',
        terminal: false,
        nextAttemptAt: expect.any(Date)
      }),
      expect.anything()
    );
    expect(subscriptionModel.recordFailure).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ failureAt: expect.any(Date) }),
      expect.anything()
    );
  });

  it('computes exponential backoff with deterministic jitter', () => {
    const seconds = service.computeBackoffSeconds(3, { retryBackoffSeconds: 20 });
    expect(seconds).toBeGreaterThanOrEqual(20);
    expect(seconds).toBeLessThanOrEqual(120);
  });

  it('builds webhook headers with signatures and metadata', () => {
    const headers = service.buildHeaders({
      delivery: { deliveryUuid: 'delivery-1', attemptCount: 0 },
      event: {
        eventUuid: 'evt-1',
        eventType: 'user.created',
        source: 'api',
        correlationId: 'corr-1',
        payload: { id: 1 },
        metadata: { note: 'test' },
        firstQueuedAt: new Date('2024-01-01T00:00:00Z')
      },
      subscription: {
        signingSecret: 'secret',
        staticHeaders: { 'X-Tenant': 'acme' }
      }
    });

    expect(headers['x-edulure-event']).toBe('user.created');
    expect(headers['x-edulure-signature']).toMatch(/^[0-9a-f]+$/);
    expect(headers['x-tenant']).toBe('acme');
  });
});
