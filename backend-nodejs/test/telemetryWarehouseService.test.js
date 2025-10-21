import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TelemetryWarehouseService } from '../src/services/TelemetryWarehouseService.js';
import { recordTelemetryExport, recordTelemetryFreshness } from '../src/observability/metrics.js';

vi.mock('../src/observability/metrics.js', async () => {
  const actual = await vi.importActual('../src/observability/metrics.js');
  return {
    ...actual,
    recordTelemetryExport: vi.fn(),
    recordTelemetryFreshness: vi.fn()
  };
});

describe('TelemetryWarehouseService', () => {
  const eventModel = {
    listPendingForExport: vi.fn(),
    markExported: vi.fn(),
    markExportFailed: vi.fn(),
    markFailed: vi.fn()
  };
  const batchModel = {
    create: vi.fn(),
    markExported: vi.fn(),
    markFailed: vi.fn()
  };
  const freshnessModel = {
    touchCheckpoint: vi.fn()
  };
  const lineageModel = {
    startRun: vi.fn(),
    completeRun: vi.fn()
  };
  const storage = {
    uploadBuffer: vi.fn()
  };
  const loggerInstance = { child: () => loggerInstance, info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

  const baseConfig = {
    export: {
      enabled: true,
      destination: 's3',
      bucket: 'telemetry-bucket',
      prefix: 'warehouse/telemetry',
      batchSize: 2,
      compress: true,
      runOnStartup: true
    },
    freshness: {
      ingestionThresholdMinutes: 10,
      warehouseThresholdMinutes: 30
    },
    lineage: {
      tool: 'dbt',
      autoRecord: true
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns disabled status when export pipeline is disabled', async () => {
    const service = new TelemetryWarehouseService({
      eventModel,
      batchModel,
      freshnessModel,
      lineageModel,
      storage,
      loggerInstance,
      config: {
        ...baseConfig,
        export: { ...baseConfig.export, enabled: false }
      }
    });

    const result = await service.exportPendingEvents({ trigger: 'test' });
    expect(result).toEqual({ status: 'disabled', exported: 0 });
    expect(recordTelemetryExport).toHaveBeenCalledWith({ destination: 's3', result: 'disabled', eventCount: 0 });
  });

  it('skips export when no pending events exist', async () => {
    eventModel.listPendingForExport.mockResolvedValue([]);
    const service = new TelemetryWarehouseService({
      eventModel,
      batchModel,
      freshnessModel,
      lineageModel,
      storage,
      loggerInstance,
      config: baseConfig
    });

    const result = await service.exportPendingEvents({ trigger: 'scheduled' });
    expect(result).toEqual({ status: 'noop', exported: 0 });
    expect(freshnessModel.touchCheckpoint).toHaveBeenCalledWith(
      'warehouse.export',
      expect.objectContaining({ metadata: expect.objectContaining({ eventsExported: 0 }) })
    );
    expect(recordTelemetryFreshness).toHaveBeenCalledWith({
      pipeline: 'warehouse.export',
      status: 'noop',
      lastEventAt: expect.any(Date),
      thresholdMinutes: 30
    });
  });

  it('exports events, uploads compressed payload, and records lineage', async () => {
    const events = [
      {
        id: 1,
        eventUuid: 'evt-1',
        eventName: 'app.launched',
        eventVersion: 'v1',
        eventSource: 'web',
        schemaVersion: 'v1',
        occurredAt: new Date('2024-01-01T00:00:00Z'),
        receivedAt: new Date('2024-01-01T00:00:01Z'),
        tenantId: 'tenant-1',
        userId: 5,
        sessionId: 'sess',
        deviceId: null,
        correlationId: 'corr-1',
        consentScope: 'product.analytics',
        consentStatus: 'granted',
        payload: { plan: 'pro' },
        context: { actor: 1 },
        metadata: { version: '1.0.0' },
        tags: ['launch'],
        ingestionStatus: 'pending'
      }
    ];

    eventModel.listPendingForExport.mockResolvedValue(events);
    batchModel.create.mockResolvedValue({ id: 10, batchUuid: 'batch-uuid' });
    lineageModel.startRun.mockResolvedValue({ id: 99 });
    storage.uploadBuffer.mockResolvedValue({ bucket: 'telemetry-bucket', key: 'warehouse/telemetry/batch-uuid.jsonl.gz', checksum: 'abc123' });

    const service = new TelemetryWarehouseService({
      eventModel,
      batchModel,
      freshnessModel,
      lineageModel,
      storage,
      loggerInstance,
      config: baseConfig
    });

    const result = await service.exportPendingEvents({ trigger: 'manual' });

    expect(storage.uploadBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: 'telemetry-bucket',
        key: 'warehouse/telemetry/batch-uuid.jsonl.gz',
        contentType: 'application/gzip',
        visibility: 'workspace'
      })
    );
    const uploadPayload = storage.uploadBuffer.mock.calls[0][0];
    expect(uploadPayload.metadata).toEqual({ 'edulure-pipeline': 'telemetry', 'edulure-trigger': 'manual' });
    expect(uploadPayload.body).toBeInstanceOf(Buffer);

    expect(batchModel.markExported).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ eventsCount: 1, fileKey: 'warehouse/telemetry/batch-uuid.jsonl.gz' })
    );
    expect(eventModel.markExported).toHaveBeenCalledWith(
      [1],
      expect.objectContaining({ metadata: expect.objectContaining({ destination: 'warehouse/telemetry/batch-uuid.jsonl.gz' }) })
    );
    expect(lineageModel.startRun).toHaveBeenCalledWith(
      expect.objectContaining({ modelName: 'warehouse.telemetry_events', metadata: expect.objectContaining({ batchId: 10 }) })
    );
    expect(lineageModel.completeRun).toHaveBeenCalledWith(
      99,
      expect.objectContaining({ status: 'success', output: expect.objectContaining({ batchId: 10 }) })
    );
    expect(result).toEqual({ status: 'exported', exported: 1, batchId: 10, fileKey: 'warehouse/telemetry/batch-uuid.jsonl.gz' });
  });

  it('marks exports as failed when upload throws', async () => {
    eventModel.listPendingForExport.mockResolvedValue([
      {
        id: 2,
        eventUuid: 'evt-2',
        eventName: 'app.closed',
        eventVersion: 'v1',
        eventSource: 'web',
        schemaVersion: 'v1',
        occurredAt: new Date('2024-01-01T01:00:00Z'),
        receivedAt: new Date('2024-01-01T01:00:01Z'),
        tenantId: 'tenant-1',
        userId: 5,
        sessionId: 'sess',
        deviceId: null,
        correlationId: 'corr-2',
        consentScope: 'product.analytics',
        consentStatus: 'granted',
        payload: {},
        context: {},
        metadata: {},
        tags: [],
        ingestionStatus: 'pending'
      }
    ]);
    batchModel.create.mockResolvedValue({ id: 11, batchUuid: 'batch-fail' });
    storage.uploadBuffer.mockRejectedValue(new Error('upload failed'));

    const service = new TelemetryWarehouseService({
      eventModel,
      batchModel,
      freshnessModel,
      lineageModel,
      storage,
      loggerInstance,
      config: baseConfig
    });

    await expect(service.exportPendingEvents({ trigger: 'manual' })).rejects.toThrow('upload failed');
    expect(batchModel.markFailed).toHaveBeenCalledWith(11, expect.any(Error));
    expect(eventModel.markExportFailed).toHaveBeenCalledWith([2], expect.any(Error));
  });
});
