import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TelemetryIngestionService } from '../src/services/TelemetryIngestionService.js';
import { recordTelemetryIngestion, recordTelemetryFreshness } from '../src/observability/metrics.js';
import { generateTelemetryDedupeHash } from '../src/database/domains/telemetry.js';

vi.mock('../src/database/domains/telemetry.js', () => ({
  generateTelemetryDedupeHash: vi.fn(() => 'dedupe-hash')
}));

vi.mock('../src/observability/metrics.js', async () => {
  const actual = await vi.importActual('../src/observability/metrics.js');
  return {
    ...actual,
    recordTelemetryIngestion: vi.fn(),
    recordTelemetryFreshness: vi.fn()
  };
});

describe('TelemetryIngestionService', () => {
  const consentModel = {
    recordDecision: vi.fn(),
    getActiveConsent: vi.fn()
  };
  const eventModel = {
    create: vi.fn()
  };
  const freshnessModel = {
    touchCheckpoint: vi.fn()
  };
  const loggerInstance = { child: () => loggerInstance, debug: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() };

  const baseConfig = {
    ingestion: {
      enabled: true,
      defaultScope: 'product.analytics',
      allowedSources: ['web', 'backend'],
      strictSourceEnforcement: true,
      consent: {
        hardBlockWithoutConsent: true,
        defaultVersion: 'v1'
      }
    },
    freshness: {
      ingestionThresholdMinutes: 10
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    consentModel.recordDecision.mockReset();
    consentModel.getActiveConsent.mockReset();
    eventModel.create.mockReset();
    freshnessModel.touchCheckpoint.mockReset();
  });

  it('ingests telemetry events when consent is granted', async () => {
    consentModel.getActiveConsent.mockResolvedValue({
      status: 'granted',
      consentVersion: 'v2',
      recordedAt: new Date('2024-12-01T00:00:00Z')
    });

    const createdEvent = {
      id: 44,
      eventName: 'app.launched',
      ingestionStatus: 'pending'
    };

    eventModel.create.mockResolvedValue({ event: createdEvent, duplicate: false });

    const service = new TelemetryIngestionService({
      consentModel,
      eventModel,
      freshnessModel,
      loggerInstance,
      config: baseConfig
    });

    const result = await service.ingestEvent(
      {
        eventName: 'app.launched',
        eventSource: 'web',
        userId: 123,
        payload: { plan: 'pro' }
      },
      { actorId: 321, ipAddress: '203.0.113.10', userAgent: 'Vitest/1.0' }
    );

    expect(eventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        consentStatus: 'granted',
        ingestionStatus: 'pending',
        context: expect.objectContaining({
          network: expect.objectContaining({ ipHash: expect.any(String), userAgent: 'Vitest/1.0' }),
          actor: 321
        }),
        metadata: expect.objectContaining({ consentVersion: 'v2' })
      })
    );
    expect(result).toEqual({
      event: createdEvent,
      duplicate: false,
      consent: expect.objectContaining({ status: 'granted' }),
      suppressed: false
    });
    expect(recordTelemetryIngestion).toHaveBeenCalledWith({
      scope: 'product.analytics',
      source: 'web',
      status: 'pending'
    });
    expect(recordTelemetryFreshness).toHaveBeenCalled();
    expect(freshnessModel.touchCheckpoint).toHaveBeenCalledWith(
      'ingestion.raw',
      expect.objectContaining({ metadata: expect.objectContaining({ eventId: 44 }) })
    );
    expect(generateTelemetryDedupeHash).toHaveBeenCalled();
  });

  it('suppresses events when consent is not granted and hard block enabled', async () => {
    consentModel.getActiveConsent.mockResolvedValue({ status: 'revoked' });

    eventModel.create.mockResolvedValue({
      event: { id: 55, eventName: 'app.launched', ingestionStatus: 'suppressed' },
      duplicate: false
    });

    const service = new TelemetryIngestionService({
      consentModel,
      eventModel,
      freshnessModel,
      loggerInstance,
      config: baseConfig
    });

    const result = await service.ingestEvent({
      eventName: 'app.launched',
      eventSource: 'backend',
      userId: 777,
      payload: {}
    });

    expect(eventModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        consentStatus: 'revoked',
        ingestionStatus: 'suppressed'
      })
    );
    expect(result.suppressed).toBe(true);
    expect(recordTelemetryIngestion).toHaveBeenCalledWith({
      scope: 'product.analytics',
      source: 'backend',
      status: 'suppressed'
    });
  });

  it('rejects events from disallowed sources when strict enforcement is enabled', async () => {
    const service = new TelemetryIngestionService({
      consentModel,
      eventModel,
      freshnessModel,
      loggerInstance,
      config: baseConfig
    });

    await expect(
      service.ingestEvent({ eventName: 'app.launched', eventSource: 'untrusted' })
    ).rejects.toMatchObject({ status: 403 });
    expect(eventModel.create).not.toHaveBeenCalled();
  });

  it('throws when pipeline is disabled', async () => {
    const disabledService = new TelemetryIngestionService({
      consentModel,
      eventModel,
      freshnessModel,
      loggerInstance,
      config: {
        ...baseConfig,
        ingestion: { ...baseConfig.ingestion, enabled: false }
      }
    });

    await expect(
      disabledService.ingestEvent({ eventName: 'test', eventSource: 'web' })
    ).rejects.toMatchObject({ status: 503 });
  });
});
