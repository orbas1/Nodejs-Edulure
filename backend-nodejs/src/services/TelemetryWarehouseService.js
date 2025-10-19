import { gzipSync } from 'node:zlib';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import TelemetryEventModel from '../models/TelemetryEventModel.js';
import TelemetryEventBatchModel from '../models/TelemetryEventBatchModel.js';
import TelemetryFreshnessMonitorModel from '../models/TelemetryFreshnessMonitorModel.js';
import TelemetryLineageRunModel from '../models/TelemetryLineageRunModel.js';
import storageService from './StorageService.js';
import {
  recordTelemetryExport,
  recordTelemetryFreshness
} from '../observability/metrics.js';

function normalisePrefix(prefix, fallback) {
  const source = (prefix ?? fallback ?? '').trim();
  if (!source) {
    return fallback ?? '';
  }
  return source.replace(/^\/+/, '').replace(/\/+$/, '');
}

function serialiseEvent(event) {
  return {
    eventUuid: event.eventUuid,
    eventName: event.eventName,
    eventVersion: event.eventVersion,
    eventSource: event.eventSource,
    schemaVersion: event.schemaVersion,
    occurredAt: event.occurredAt,
    receivedAt: event.receivedAt,
    tenantId: event.tenantId,
    userId: event.userId,
    sessionId: event.sessionId,
    deviceId: event.deviceId,
    correlationId: event.correlationId,
    consentScope: event.consentScope,
    consentStatus: event.consentStatus,
    payload: event.payload,
    context: event.context,
    metadata: event.metadata,
    tags: event.tags,
    ingestionStatus: event.ingestionStatus
  };
}

export class TelemetryWarehouseService {
  constructor({
    eventModel = TelemetryEventModel,
    batchModel = TelemetryEventBatchModel,
    freshnessModel = TelemetryFreshnessMonitorModel,
    lineageModel = TelemetryLineageRunModel,
    storage = storageService,
    loggerInstance = logger.child({ service: 'TelemetryWarehouseService' }),
    config = env.telemetry
  } = {}) {
    this.eventModel = eventModel;
    this.batchModel = batchModel;
    this.freshnessModel = freshnessModel;
    this.lineageModel = lineageModel;
    this.storage = storage;
    this.logger = loggerInstance;

    const exportConfig = config?.export ?? {};
    const freshnessConfig = config?.freshness ?? {};
    const lineageConfig = config?.lineage ?? {};

    const defaultBucket = env.storage?.privateBucket;
    const prefix = normalisePrefix(exportConfig.prefix, 'warehouse/telemetry');

    this.config = {
      export: {
        enabled: exportConfig.enabled !== false,
        destination: exportConfig.destination ?? 's3',
        bucket: exportConfig.bucket ?? defaultBucket,
        prefix,
        batchSize: exportConfig.batchSize ?? 5000,
        compress: exportConfig.compress !== false,
        runOnStartup: exportConfig.runOnStartup !== false
      },
      freshness: {
        ingestionThresholdMinutes: freshnessConfig.ingestionThresholdMinutes ?? 15,
        warehouseThresholdMinutes: freshnessConfig.warehouseThresholdMinutes ?? 30
      },
      lineage: {
        tool: lineageConfig.tool ?? 'dbt',
        autoRecord: lineageConfig.autoRecord !== false
      }
    };
  }

  async exportPendingEvents({ limit, trigger = 'manual' } = {}) {
    if (!this.config.export.enabled) {
      this.logger.warn({ trigger }, 'Telemetry warehouse export disabled');
      recordTelemetryExport({ destination: this.config.export.destination, result: 'disabled', eventCount: 0 });
      return { status: 'disabled', exported: 0 };
    }

    const batchSize = Math.max(1, limit ?? this.config.export.batchSize);
    const events = await this.eventModel.listPendingForExport({ limit: batchSize });

    if (!events.length) {
      this.logger.debug({ trigger }, 'No telemetry events pending export');
      await this.freshnessModel.touchCheckpoint('warehouse.export', {
        lastEventAt: new Date(),
        thresholdMinutes: this.config.freshness.warehouseThresholdMinutes,
        metadata: { trigger, eventsExported: 0 }
      });
      recordTelemetryFreshness({
        pipeline: 'warehouse.export',
        status: 'noop',
        lastEventAt: new Date(),
        thresholdMinutes: this.config.freshness.warehouseThresholdMinutes
      });
      return { status: 'noop', exported: 0 };
    }

    const startTime = Date.now();
    const batch = await this.batchModel.create({
      destination: this.config.export.destination,
      metadata: { trigger, requestedSize: batchSize }
    });

    let lineageRun = null;
    if (this.config.lineage.autoRecord) {
      lineageRun = await this.lineageModel.startRun({
        tool: this.config.lineage.tool,
        modelName: 'warehouse.telemetry_events',
        input: { trigger, eventIds: events.map((event) => event.id) },
        metadata: { trigger, batchId: batch.id }
      });
    }

    const serialised = events.map(serialiseEvent).map((payload) => JSON.stringify(payload)).join('\n');
    let buffer = Buffer.from(serialised, 'utf8');
    let contentType = 'application/json';
    let extension = 'jsonl';

    if (this.config.export.compress) {
      buffer = gzipSync(buffer);
      contentType = 'application/gzip';
      extension = 'jsonl.gz';
    }

    const key = `${this.config.export.prefix}/${batch.batchUuid}.${extension}`;

    try {
      const upload = await this.storage.uploadBuffer({
        bucket: this.config.export.bucket,
        key,
        body: buffer,
        contentType,
        visibility: 'workspace',
        metadata: {
          'edulure-pipeline': 'telemetry',
          'edulure-trigger': trigger
        }
      });

      await this.batchModel.markExported(batch.id, {
        eventsCount: events.length,
        fileKey: upload.key,
        checksum: upload.checksum,
        metadata: { bucket: upload.bucket, byteLength: buffer.length }
      });

      await this.eventModel.markExported(
        events.map((event) => event.id),
        {
          batchId: batch.id,
          metadata: { destination: key, exportedAt: new Date().toISOString(), trigger }
        }
      );

      const durationSeconds = (Date.now() - startTime) / 1000;
      recordTelemetryExport({
        destination: this.config.export.destination,
        result: 'success',
        eventCount: events.length,
        durationSeconds
      });

      await this.freshnessModel.touchCheckpoint('warehouse.export', {
        lastEventAt: events.at(-1)?.occurredAt ?? new Date(),
        thresholdMinutes: this.config.freshness.warehouseThresholdMinutes,
        metadata: {
          batchId: batch.id,
          trigger,
          durationSeconds,
          eventsCount: events.length,
          destinationKey: key
        }
      });

      recordTelemetryFreshness({
        pipeline: 'warehouse.export',
        status: 'success',
        lastEventAt: events.at(-1)?.occurredAt ?? new Date(),
        thresholdMinutes: this.config.freshness.warehouseThresholdMinutes
      });

      if (lineageRun) {
        await this.lineageModel.completeRun(lineageRun.id, {
          status: 'success',
          output: {
            batchId: batch.id,
            eventsCount: events.length,
            destinationKey: key
          },
          metadata: { trigger }
        });
      }

      return {
        status: 'exported',
        exported: events.length,
        batchId: batch.id,
        fileKey: key
      };
    } catch (error) {
      this.logger.error({ err: error, batchId: batch.id }, 'Telemetry export failed');
      await this.batchModel.markFailed(batch.id, error);
      await this.eventModel.markExportFailed(events.map((event) => event.id), error);
      recordTelemetryExport({
        destination: this.config.export.destination,
        result: 'failed',
        eventCount: events.length
      });

      if (lineageRun) {
        await this.lineageModel.completeRun(lineageRun.id, {
          status: 'failed',
          error,
          output: { batchId: batch.id },
          metadata: { trigger }
        });
      }

      throw error;
    }
  }
}

const telemetryWarehouseService = new TelemetryWarehouseService();

export default telemetryWarehouseService;
