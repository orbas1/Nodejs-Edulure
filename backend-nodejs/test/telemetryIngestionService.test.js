import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { TelemetryIngestionService } from '../src/services/TelemetryIngestionService.js';
import * as metrics from '../src/observability/metrics.js';

const loggerStub = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

describe('TelemetryIngestionService', () => {
  let consentModel;
  let eventModel;
  let freshnessModel;
  let service;

  beforeEach(() => {
    consentModel = {
      getActiveConsent: vi.fn(),
      recordDecision: vi.fn()
    };

    eventModel = {
      create: vi.fn()
    };

    freshnessModel = {
      touchCheckpoint: vi.fn().mockResolvedValue({})
    };

    vi.spyOn(metrics, 'recordTelemetryIngestion').mockImplementation(() => {});
    vi.spyOn(metrics, 'recordTelemetryFreshness').mockImplementation(() => {});

    service = new TelemetryIngestionService({
      consentModel,
      eventModel,
      freshnessModel,
      loggerInstance: loggerStub,
      config: {
        ingestion: {
          enabled: true,
          defaultScope: 'product.analytics',
          allowedSources: [],
          strictSourceEnforcement: false,
          consent: {
            hardBlockWithoutConsent: true,
            defaultVersion: 'v1'
          }
        },
        freshness: {
          ingestionThresholdMinutes: 15
        }
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ingests events when consent is granted', async () => {
    const consentRecord = {
      status: 'granted',
      consentVersion: 'v3',
      recordedAt: new Date('2025-01-01T00:00:00Z')
    };
    consentModel.getActiveConsent.mockResolvedValue(consentRecord);

    const eventResponse = {
      id: 42,
      eventUuid: 'uuid-1',
      eventName: 'app.launch',
      eventSource: 'web',
      consentScope: 'product.analytics',
      consentStatus: 'granted',
      ingestionStatus: 'pending',
      occurredAt: new Date('2025-03-01T10:00:00Z'),
      receivedAt: new Date('2025-03-01T10:00:01Z'),
      createdAt: new Date()
    };

    eventModel.create.mockResolvedValue({ event: eventResponse, duplicate: false });

    const result = await service.ingestEvent(
      {
        eventName: 'app.launch',
        eventSource: 'web',
        payload: { platform: 'ios' }
      },
      {
        actorId: 999,
        ipAddress: '192.168.0.1',
        userAgent: 'vitest'
      }
    );

    expect(result.duplicate).toBe(false);
    expect(result.suppressed).toBe(false);
    expect(result.event.ingestionStatus).toBe('pending');
    expect(eventModel.create).toHaveBeenCalledTimes(1);
    const createArgs = eventModel.create.mock.calls[0][0];
    expect(createArgs.consentScope).toBe('product.analytics');
    expect(createArgs.ingestionStatus).toBe('pending');
    expect(createArgs.metadata.consentVersion).toBe('v3');
    expect(metrics.recordTelemetryIngestion).toHaveBeenCalledWith({
      scope: 'product.analytics',
      source: 'web',
      status: 'pending'
    });
    expect(metrics.recordTelemetryFreshness).toHaveBeenCalled();
  });

  it('suppresses events when consent is missing and hard block is enabled', async () => {
    consentModel.getActiveConsent.mockResolvedValue(null);

    const suppressedEvent = {
      id: 11,
      eventUuid: 'uuid-2',
      eventName: 'app.launch',
      eventSource: 'web',
      consentScope: 'product.analytics',
      consentStatus: 'revoked',
      ingestionStatus: 'suppressed',
      occurredAt: new Date('2025-03-02T09:00:00Z'),
      receivedAt: new Date('2025-03-02T09:00:01Z'),
      createdAt: new Date()
    };

    eventModel.create.mockResolvedValue({ event: suppressedEvent, duplicate: false });

    const result = await service.ingestEvent({
      eventName: 'app.launch',
      eventSource: 'web',
      payload: {}
    });

    expect(result.suppressed).toBe(true);
    expect(result.event.ingestionStatus).toBe('suppressed');
    expect(eventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ ingestionStatus: 'suppressed', consentStatus: 'revoked' })
    );
  });

  it('rejects telemetry from unauthorised sources when enforcement is strict', async () => {
    service = new TelemetryIngestionService({
      consentModel,
      eventModel,
      freshnessModel,
      loggerInstance: loggerStub,
      config: {
        ingestion: {
          enabled: true,
          defaultScope: 'product.analytics',
          allowedSources: ['web'],
          strictSourceEnforcement: true,
          consent: {
            hardBlockWithoutConsent: true,
            defaultVersion: 'v1'
          }
        },
        freshness: {
          ingestionThresholdMinutes: 15
        }
      }
    });

    await expect(
      service.ingestEvent({ eventName: 'app.launch', eventSource: 'mobile' })
    ).rejects.toMatchObject({ status: 403 });
    expect(eventModel.create).not.toHaveBeenCalled();
  });
});
