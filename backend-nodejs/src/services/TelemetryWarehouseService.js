import { gzipSync } from 'node:zlib';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import TelemetryEventModel from '../models/TelemetryEventModel.js';
import TelemetryExportModel from '../models/TelemetryExportModel.js';
import TelemetryFreshnessMonitorModel from '../models/TelemetryFreshnessMonitorModel.js';
import TelemetryLineageRunModel from '../models/TelemetryLineageRunModel.js';
import storageService from './StorageService.js';
import dataEncryptionService from './DataEncryptionService.js';
import {
  recordTelemetryExport,
  recordTelemetryFreshness
} from '../observability/metrics.js';
import { serialiseTelemetryEvent } from '../utils/telemetrySerializers.js';

function normalisePrefix(prefix, fallback) {
  const source = (prefix ?? fallback ?? '').trim();
  if (!source) {
    return fallback ?? '';
  }
  return source.replace(/^\/+/, '').replace(/\/+$/, '');
}

function buildExportRecord(event, { batch, trigger }) {
  const base = serialiseTelemetryEvent(event);
  return {
    ...base,
    exportContext: {
      trigger,
      batchUuid: batch?.batchUuid ?? null,
      batchId: batch?.id ?? null,
      destination: batch?.destination ?? null
    }
  };
}

function buildCheckpointDescriptor({ events, batch, trigger, encryptionService }) {
  if (!encryptionService) {
    return { plain: null, sealed: { ciphertext: null, keyId: null, hash: null } };
  }

  if (!Array.isArray(events) || events.length === 0) {
    return {
      plain: null,
      sealed: {
        ciphertext: null,
        keyId: encryptionService.activeKeyId ?? null,
        hash: null
      }
    };
  }

  try {
    const lastEvent = events.at(-1);
    const payload = {
      lastEventId: lastEvent?.id ?? null,
      lastEventOccurredAt: lastEvent?.occurredAt ?? null,
      exportedCount: events.length,
      trigger,
      batchUuid: batch?.batchUuid ?? null
    };

    const serialised = JSON.stringify(payload);
    const { ciphertext, keyId } = encryptionService.encrypt(serialised);
    const hash = encryptionService.hash(serialised);

    return {
      plain: payload,
      sealed: {
        ciphertext: ciphertext ? ciphertext.toString('base64') : null,
        keyId: keyId ?? encryptionService.activeKeyId ?? null,
        hash
      }
    };
  } catch (_error) {
    return {
      plain: null,
      sealed: {
        ciphertext: null,
        keyId: encryptionService.activeKeyId ?? null,
        hash: null
      }
    };
  }
}

export class TelemetryWarehouseService {
  constructor({
    eventModel = TelemetryEventModel,
    batchModel = TelemetryExportModel,
    freshnessModel = TelemetryFreshnessMonitorModel,
    lineageModel = TelemetryLineageRunModel,
    storage = storageService,
    encryptionService = dataEncryptionService,
    loggerInstance = logger.child({ service: 'TelemetryWarehouseService' }),
    config = env.telemetry
  } = {}) {
    this.eventModel = eventModel;
    this.batchModel = batchModel;
    this.freshnessModel = freshnessModel;
    this.lineageModel = lineageModel;
    this.storage = storage;
    this.logger = loggerInstance;
    this.encryptionService = encryptionService;

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
    const candidateLimit = Math.max(1, batchSize + 1);
    const candidateEvents = await this.eventModel.listPendingForExport({ limit: candidateLimit });
    const hasBacklog = candidateEvents.length > batchSize;
    const events = hasBacklog ? candidateEvents.slice(0, batchSize) : candidateEvents;

    if (!events.length) {
      this.logger.debug({ trigger }, 'No telemetry events pending export');
      await this.freshnessModel.touchCheckpoint('warehouse.export', {
        lastEventAt: new Date(),
        thresholdMinutes: this.config.freshness.warehouseThresholdMinutes,
        metadata: { trigger, eventsExported: 0, hasBacklog: false }
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

    const serialised = events
      .map((event) => buildExportRecord(event, { batch, trigger }))
      .map((payload) => JSON.stringify(payload))
      .join('\n');
    const checkpoint = buildCheckpointDescriptor({
      events,
      batch,
      trigger,
      encryptionService: this.encryptionService
    });
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

      const completedBatch = await this.batchModel.markExported(batch.id, {
        eventsCount: events.length,
        fileKey: upload.key,
        checksum: upload.checksum,
        metadata: {
          bucket: upload.bucket,
          byteLength: buffer.length,
          trigger,
          checkpoint: checkpoint.sealed,
          checkpointPreview: checkpoint.plain,
          hasBacklog
        }
      });

      const exportedAt = new Date().toISOString();
      await this.eventModel.markExported(
        events.map((event) => event.id),
        {
          batchId: batch.id,
          metadata: {
            destination: key,
            exportedAt,
            trigger,
            batchUuid: completedBatch?.batchUuid ?? batch.batchUuid,
            checkpointHash: checkpoint.sealed.hash
          }
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
          destinationKey: key,
          batchUuid: completedBatch?.batchUuid ?? batch.batchUuid,
          checkpoint: checkpoint.sealed,
          checkpointPreview: checkpoint.plain,
          hasBacklog
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
            destinationKey: key,
            batchUuid: completedBatch?.batchUuid ?? batch.batchUuid
          },
          metadata: { trigger, batchUuid: completedBatch?.batchUuid ?? batch.batchUuid }
        });
      }

      const summary = {
        status: 'exported',
        exported: events.length,
        batchId: completedBatch?.id ?? batch.id,
        batchUuid: completedBatch?.batchUuid ?? batch.batchUuid,
        batchSize,
        hasBacklog,
        destination: {
          bucket: this.config.export.bucket,
          key,
          contentType,
          compressed: this.config.export.compress
        },
        trigger,
        durationSeconds,
        lineageRunId: lineageRun?.id ?? null,
        checkpoint: {
          sealed: checkpoint.sealed,
          preview: checkpoint.plain
        },
        preview: events
          .slice(0, 5)
          .map((event) => buildExportRecord(event, { batch: completedBatch ?? batch, trigger }))
      };

      return summary;
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
          output: { batchId: batch.id, batchUuid: batch.batchUuid },
          metadata: { trigger, batchUuid: batch.batchUuid }
        });
      }

      throw error;
    }
  }
}

const telemetryWarehouseService = new TelemetryWarehouseService();

export default telemetryWarehouseService;
