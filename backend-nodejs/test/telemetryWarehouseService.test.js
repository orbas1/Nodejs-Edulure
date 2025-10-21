import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { TelemetryWarehouseService } from '../src/services/TelemetryWarehouseService.js';
import * as metrics from '../src/observability/metrics.js';

const loggerStub = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

describe('TelemetryWarehouseService', () => {
  let eventModel;
  let batchModel;
  let freshnessModel;
  let lineageModel;
  let storage;
  let service;

  beforeEach(() => {
    eventModel = {
      listPendingForExport: vi.fn(),
      markExported: vi.fn().mockResolvedValue(),
      markExportFailed: vi.fn().mockResolvedValue()
    };

    batchModel = {
      create: vi.fn(),
      markExported: vi.fn().mockResolvedValue(),
      markFailed: vi.fn().mockResolvedValue()
    };

    freshnessModel = {
      touchCheckpoint: vi.fn().mockResolvedValue({})
    };

    lineageModel = {
      startRun: vi.fn(),
      completeRun: vi.fn().mockResolvedValue()
    };

    storage = {
      uploadBuffer: vi.fn()
    };

    vi.spyOn(metrics, 'recordTelemetryExport').mockImplementation(() => {});
    vi.spyOn(metrics, 'recordTelemetryFreshness').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns disabled summary when export is disabled', async () => {
    service = new TelemetryWarehouseService({
      eventModel,
      batchModel,
      freshnessModel,
      lineageModel,
      storage,
      loggerInstance: loggerStub,
      config: {
        export: {
          enabled: false,
          destination: 's3',
          bucket: 'private',
          prefix: 'warehouse/telemetry',
          batchSize: 10,
          compress: true,
          runOnStartup: false
        },
        freshness: {
          warehouseThresholdMinutes: 30
        },
        lineage: {
          tool: 'dbt',
          autoRecord: true
        }
      }
    });

    const summary = await service.exportPendingEvents();
    expect(summary).toEqual({ status: 'disabled', exported: 0 });
    expect(metrics.recordTelemetryExport).toHaveBeenCalledWith({
      destination: 's3',
      result: 'disabled',
      eventCount: 0
    });
  });

  it('uploads pending events to storage and marks them exported', async () => {
    const event = {
      id: 1,
      eventUuid: 'uuid-1',
      eventName: 'app.launch',
      eventVersion: '1',
      eventSource: 'web',
      schemaVersion: 'v1',
      occurredAt: new Date('2025-03-03T10:00:00Z'),
      receivedAt: new Date('2025-03-03T10:00:01Z'),
      tenantId: 'global',
      userId: 44,
      sessionId: 'session-1',
      deviceId: 'ios',
      correlationId: 'corr-1',
      consentScope: 'product.analytics',
      consentStatus: 'granted',
      payload: { platform: 'ios' },
      context: { network: { ipHash: 'abc' } },
      metadata: { consentVersion: 'v1' },
      tags: [],
      ingestionStatus: 'pending'
    };

    eventModel.listPendingForExport.mockResolvedValue([event]);
    batchModel.create.mockResolvedValue({ id: 55, batchUuid: 'batch-123', status: 'exporting' });
    lineageModel.startRun.mockResolvedValue({ id: 777 });
    storage.uploadBuffer.mockResolvedValue({ bucket: 'private', key: 'warehouse/telemetry/batch-123.jsonl.gz', checksum: 'abc123' });

    service = new TelemetryWarehouseService({
      eventModel,
      batchModel,
      freshnessModel,
      lineageModel,
      storage,
      loggerInstance: loggerStub,
      config: {
        export: {
          enabled: true,
          destination: 's3',
          bucket: 'private',
          prefix: 'warehouse/telemetry',
          batchSize: 10,
          compress: true,
          runOnStartup: false
        },
        freshness: {
          warehouseThresholdMinutes: 30
        },
        lineage: {
          tool: 'dbt',
          autoRecord: true
        }
      }
    });

    const summary = await service.exportPendingEvents({ trigger: 'test' });

    expect(summary.status).toBe('exported');
    expect(summary.exported).toBe(1);
    expect(batchModel.create).toHaveBeenCalledWith({
      destination: 's3',
      metadata: { trigger: 'test', requestedSize: 10 }
    });
    expect(storage.uploadBuffer).toHaveBeenCalledTimes(1);
    expect(eventModel.markExported).toHaveBeenCalledWith([1], expect.objectContaining({ batchId: 55 }));
    expect(metrics.recordTelemetryExport).toHaveBeenCalledWith(
      expect.objectContaining({ destination: 's3', result: 'success', eventCount: 1, durationSeconds: expect.any(Number) })
    );
    expect(metrics.recordTelemetryFreshness).toHaveBeenCalledWith(
      expect.objectContaining({ pipeline: 'warehouse.export', status: 'success' })
    );
    expect(lineageModel.completeRun).toHaveBeenCalledWith(
      777,
      expect.objectContaining({ status: 'success', output: expect.objectContaining({ batchId: 55 }) })
    );
  });

  it('marks batches and events failed when the upload throws', async () => {
    const event = {
      id: 2,
      eventUuid: 'uuid-2',
      eventName: 'app.crash',
      eventVersion: '1',
      eventSource: 'web',
      schemaVersion: 'v1',
      occurredAt: new Date('2025-03-04T10:00:00Z'),
      receivedAt: new Date('2025-03-04T10:00:01Z'),
      tenantId: 'global',
      userId: 11,
      sessionId: 'session-2',
      deviceId: 'android',
      correlationId: 'corr-2',
      consentScope: 'product.analytics',
      consentStatus: 'granted',
      payload: { platform: 'android' },
      context: {},
      metadata: {},
      tags: [],
      ingestionStatus: 'pending'
    };

    eventModel.listPendingForExport.mockResolvedValue([event]);
    batchModel.create.mockResolvedValue({ id: 88, batchUuid: 'batch-err', status: 'exporting' });
    storage.uploadBuffer.mockRejectedValue(new Error('upload failed'));

    service = new TelemetryWarehouseService({
      eventModel,
      batchModel,
      freshnessModel,
      lineageModel,
      storage,
      loggerInstance: loggerStub,
      config: {
        export: { enabled: true, destination: 's3', bucket: 'private', prefix: 'warehouse/telemetry', batchSize: 10 },
        freshness: { warehouseThresholdMinutes: 30 },
        lineage: { tool: 'dbt', autoRecord: true }
      }
    });

    await expect(service.exportPendingEvents()).rejects.toThrow('upload failed');

    expect(batchModel.markFailed).toHaveBeenCalledWith(88, expect.any(Error));
    expect(eventModel.markExportFailed).toHaveBeenCalledWith([2], expect.any(Error));
    expect(metrics.recordTelemetryExport).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'failed', eventCount: 1 })
    );
    expect(metrics.recordTelemetryFreshness).not.toHaveBeenCalled();
  });
});
