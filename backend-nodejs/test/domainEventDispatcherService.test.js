import { describe, it, expect, beforeEach, vi } from 'vitest';

import { metricsRegistry } from '../src/observability/metrics.js';
import { DomainEventDispatcherService } from '../src/services/DomainEventDispatcherService.js';

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis()
  };
}

describe('DomainEventDispatcherService', () => {
  let dispatchModel;
  let eventModel;
  let webhookBus;
  let service;
  let deadLetterModel;

  beforeEach(() => {
    metricsRegistry.resetMetrics?.();

    dispatchModel = {
      countPending: vi.fn().mockResolvedValue(0),
      takeBatch: vi.fn().mockResolvedValue([]),
      markDelivered: vi.fn().mockResolvedValue(),
      markFailed: vi.fn().mockResolvedValue(),
      recoverStuck: vi.fn().mockResolvedValue([])
    };

    eventModel = {
      findById: vi.fn()
    };

    deadLetterModel = {
      record: vi.fn().mockResolvedValue(),
      count: vi.fn().mockResolvedValue(0)
    };

    webhookBus = {
      publish: vi.fn()
    };

    service = new DomainEventDispatcherService({
      config: {
        enabled: true,
        pollIntervalMs: 10,
        batchSize: 10,
        maxAttempts: 3,
        initialBackoffSeconds: 5,
        maxBackoffSeconds: 120,
        backoffMultiplier: 2,
        jitterRatio: 0,
        recoverIntervalMs: 1000,
        recoverTimeoutMinutes: 5,
        workerId: 'test-worker'
      },
      dispatchModel,
      eventModel,
      deadLetterModel,
      webhookBus,
      loggerInstance: createLogger()
    });
  });

  it('delivers domain events via webhook bus', async () => {
    const dispatch = { id: 1, eventId: 42, attemptCount: 0 };
    const event = {
      id: 42,
      eventType: 'user.registered',
      payload: { userId: 7 },
      entityType: 'user',
      entityId: '7',
      performedBy: 7
    };

    eventModel.findById.mockResolvedValue(event);
    webhookBus.publish.mockResolvedValue({ id: 999 });

    await service.processDispatch(dispatch);

    expect(deadLetterModel.record).not.toHaveBeenCalled();
    expect(webhookBus.publish).toHaveBeenCalledWith('user.registered', { userId: 7 }, {
      source: 'domain-events',
      correlationId: 'domain-event-42',
      metadata: { entityType: 'user', entityId: '7', performedBy: 7 }
    });
    expect(dispatchModel.markDelivered).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        metadata: expect.objectContaining({ attempts: 1, webhookEventId: 999 })
      })
    );
    expect(dispatchModel.markFailed).not.toHaveBeenCalled();
  });

  it('records terminal failures in the dead-letter table', async () => {
    const dispatch = { id: 4, eventId: 101, attemptCount: 2 };
    const event = {
      id: 101,
      eventType: 'billing.payout.failed',
      payload: { payoutId: 'po_123' },
      entityType: 'payout',
      entityId: 'po_123',
      performedBy: 9
    };

    const error = new Error('provider rejected payload');
    error.code = 'HTTP_410';

    eventModel.findById.mockResolvedValue(event);
    webhookBus.publish.mockRejectedValue(error);

    await service.processDispatch(dispatch);

    expect(dispatchModel.markFailed).toHaveBeenCalledWith(
      4,
      expect.objectContaining({ terminal: true })
    );
    expect(deadLetterModel.record).toHaveBeenCalledWith(
      expect.objectContaining({
        dispatchId: 4,
        eventId: 101,
        eventType: 'billing.payout.failed',
        attemptCount: 3,
        failureReason: 'HTTP_410',
        failureMessage: 'provider rejected payload'
      })
    );
  });

  it('marks dispatch as retry when publish fails', async () => {
    const dispatch = { id: 2, eventId: 77, attemptCount: 1 };
    const event = {
      id: 77,
      eventType: 'course.published',
      payload: { courseId: 'abc' },
      entityType: 'course',
      entityId: 'abc'
    };

    eventModel.findById.mockResolvedValue(event);
    webhookBus.publish.mockRejectedValue(new Error('network')); 

    await service.processDispatch(dispatch);

    expect(deadLetterModel.record).not.toHaveBeenCalled();
    expect(dispatchModel.markDelivered).not.toHaveBeenCalled();
    expect(dispatchModel.markFailed).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        terminal: false,
        metadata: expect.objectContaining({ attempts: 2 })
      })
    );
    const [, failurePayload] = dispatchModel.markFailed.mock.calls[0];
    expect(failurePayload.nextAvailableAt).toBeInstanceOf(Date);
  });

  it('acknowledges dispatch when event is missing', async () => {
    const dispatch = { id: 3, eventId: 404, attemptCount: 0 };
    eventModel.findById.mockResolvedValue(null);

    await service.processDispatch(dispatch);

    expect(dispatchModel.markDelivered).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ metadata: expect.objectContaining({ reason: 'missing_event' }) })
    );
    expect(webhookBus.publish).not.toHaveBeenCalled();
  });
});
