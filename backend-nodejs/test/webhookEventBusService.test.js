import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WebhookEventBusService } from '../src/services/WebhookEventBusService.js';

function createDelivery(overrides = {}) {
  return {
    id: 101,
    deliveryUuid: 'del-uuid',
    attemptCount: 0,
    maxAttempts: 3,
    event: {
      id: 55,
      eventUuid: 'evt-uuid',
      eventType: 'payments.intent.succeeded',
      status: 'queued',
      source: 'test',
      correlationId: 'corr-1',
      payload: { paymentId: 'pay-1' },
      metadata: {},
      firstQueuedAt: new Date('2024-05-01T00:00:00Z')
    },
    subscription: {
      id: 91,
      publicId: 'sub-1',
      name: 'CRM sink',
      targetUrl: 'https://hooks.example.com/payments',
      signingSecret: 'secret',
      maxAttempts: 3,
      retryBackoffSeconds: 60,
      circuitBreakerThreshold: 3,
      circuitBreakerDurationSeconds: 900,
      consecutiveFailures: 0,
      deliveryTimeoutMs: 1500,
      staticHeaders: { 'x-service': 'edulure' }
    },
    ...overrides
  };
}

describe('WebhookEventBusService', () => {
  let subscriptionModel;
  let eventModel;
  let deliveryModel;
  let fetchImpl;
  let service;

  beforeEach(() => {
    subscriptionModel = {
      findForEvent: vi.fn(),
      recordSuccess: vi.fn(),
      recordFailure: vi.fn()
    };
    eventModel = {
      create: vi.fn(),
      updateStatus: vi.fn(),
      touchAttempt: vi.fn(),
      markDelivered: vi.fn(),
      markFailed: vi.fn(),
      markPartial: vi.fn()
    };
    deliveryModel = {
      enqueueMany: vi.fn(),
      recoverStuck: vi.fn(),
      claimPending: vi.fn(),
      markDelivered: vi.fn(),
      markFailed: vi.fn(),
      summariseStatuses: vi.fn()
    };
    fetchImpl = vi.fn();

    service = new WebhookEventBusService({
      subscriptionModel,
      eventModel,
      deliveryModel,
      connection: {},
      fetchImpl,
      envConfig: {
        enabled: true,
        pollIntervalMs: 1000,
        batchSize: 10,
        maxAttempts: 4,
        initialBackoffSeconds: 60,
        maxBackoffSeconds: 120,
        deliveryTimeoutMs: 2000,
        recoverAfterMs: 60000
      },
      randomImpl: () => 0.5
    });
  });

  it('creates event deliveries for matching subscriptions', async () => {
    subscriptionModel.findForEvent.mockResolvedValue([
      { id: 1, maxAttempts: 5, circuitOpenUntil: null },
      { id: 2, maxAttempts: null, circuitOpenUntil: new Date(Date.now() + 60_000) }
    ]);
    eventModel.create.mockResolvedValue({ id: 10 });

    await service.publish(
      'payments.intent.succeeded',
      { paymentId: 'pay-1' },
      { source: 'test', correlationId: 'corr-1', connection: {} }
    );

    expect(eventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'payments.intent.succeeded',
        payload: { paymentId: 'pay-1' }
      }),
      expect.anything()
    );
    expect(deliveryModel.enqueueMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ subscriptionId: 1, maxAttempts: 5 }),
        expect.objectContaining({ subscriptionId: 2 })
      ]),
      expect.anything()
    );
  });

  it('delivers webhooks and records success metrics', async () => {
    const delivery = createDelivery();
    deliveryModel.claimPending.mockResolvedValue([delivery]);
    deliveryModel.recoverStuck.mockResolvedValue();
    deliveryModel.summariseStatuses.mockResolvedValue({ delivered: 1 });
    fetchImpl.mockResolvedValue({ ok: true, status: 200, text: async () => 'ok' });

    await service.dispatchDelivery(delivery);

    expect(eventModel.updateStatus).toHaveBeenCalledWith(55, 'processing', expect.anything());
    expect(deliveryModel.markDelivered).toHaveBeenCalledWith(
      101,
      expect.objectContaining({ responseCode: 200 }),
      expect.anything()
    );
    expect(subscriptionModel.findForEvent).not.toHaveBeenCalled();
    expect(eventModel.markDelivered).toHaveBeenCalledWith(55, expect.any(Date), expect.anything());
  });

  it('records failures and schedules retry with backoff', async () => {
    const delivery = createDelivery({ attemptCount: 1, subscription: { ...createDelivery().subscription, consecutiveFailures: 2 } });
    deliveryModel.summariseStatuses.mockResolvedValue({ failed: 1 });
    fetchImpl.mockResolvedValue({ ok: false, status: 500, text: async () => 'fail' });

    await service.dispatchDelivery(delivery);

    expect(deliveryModel.markFailed).toHaveBeenCalledWith(
      101,
      expect.objectContaining({ terminal: false, nextAttemptAt: expect.any(Date) }),
      expect.anything()
    );
    expect(eventModel.markFailed).toHaveBeenCalledWith(55, expect.any(Date), expect.anything());
  });
});
