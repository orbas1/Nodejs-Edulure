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
import dataEncryptionService from './DataEncryptionService.js';

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
    this.encryptionService = dataEncryptionService;

    const exportConfig = config?.export ?? {};
    const freshnessConfig = config?.freshness ?? {};
    const lineageConfig = config?.lineage ?? {};

    const defaultBucket = env.storage?.privateBucket;
    const prefix = normalisePrefix(exportConfig.prefix, 'warehouse/telemetry');
    const checkpointConfig = exportConfig.checkpoint ?? {};
    const checkpointKey = normalisePrefix(checkpointConfig.key, `${prefix}/checkpoint.json`);

    this.config = {
      export: {
        enabled: exportConfig.enabled !== false,
        destination: exportConfig.destination ?? 's3',
        bucket: exportConfig.bucket ?? defaultBucket,
        prefix,
        batchSize: exportConfig.batchSize ?? 5000,
        compress: exportConfig.compress !== false,
        runOnStartup: exportConfig.runOnStartup !== false,
        checkpoint: {
          enabled: Boolean(checkpointKey && (exportConfig.bucket ?? defaultBucket)),
          key: checkpointKey,
          encrypt: checkpointConfig.encrypt !== false,
          classification: checkpointConfig.classification ?? 'telemetry.checkpoint',
          encryptionKeyId: checkpointConfig.encryptionKeyId ?? null
        }
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
    const schemaSignatures = new Set();
    for (const event of events) {
      const signature = `${event?.eventName ?? 'unknown'}:${event?.schemaVersion ?? 'unknown'}`;
      schemaSignatures.add(signature);
    }

    let previousCheckpoint = null;
    if (this.config.export.checkpoint.enabled) {
      previousCheckpoint = await this.loadExportCheckpoint();
    }
    let checkpoint = null;

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
      return { status: 'noop', exported: 0, checkpoint: previousCheckpoint };
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
        metadata: {
          bucket: upload.bucket,
          byteLength: buffer.length,
          schemaSignatures: Array.from(schemaSignatures)
        }
      });
      const exportMetadata = {
        destination: key,
        exportedAt: new Date().toISOString(),
        trigger,
        schemaSignatures: Array.from(schemaSignatures)
      };

      checkpoint = await this.#writeCheckpoint({
        trigger,
        batchId: batch.id,
        destinationKey: key,
        lastEvent: events.at(-1) ?? null,
        eventCount: events.length,
        schemaSignatures
      });

      if (checkpoint?.batchId) {
        exportMetadata.checkpointId = checkpoint.batchId;
      }
      if (checkpoint?.lastEventOccurredAt) {
        exportMetadata.lastEventOccurredAt = checkpoint.lastEventOccurredAt;
      }

      await this.eventModel.markExported(
        events.map((event) => event.id),
        {
          batchId: batch.id,
          metadata: exportMetadata
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
            destinationKey: key,
            schemaSignatures: Array.from(schemaSignatures)
          },
          metadata: { trigger }
        });
      }

      return {
        status: 'exported',
        exported: events.length,
        batchId: batch.id,
        fileKey: key,
        checkpoint,
        previousCheckpoint,
        schemaSignatures: Array.from(schemaSignatures)
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

  async loadExportCheckpoint() {
    if (!this.config.export.checkpoint.enabled) {
      return null;
    }

    try {
      const response = await this.storage.downloadToBuffer({
        bucket: this.config.export.bucket,
        key: this.config.export.checkpoint.key
      });
      const raw = response?.buffer?.toString('utf8');
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      if (Object.prototype.hasOwnProperty.call(parsed, 'encrypted')) {
        const encryptedValue = parsed.encrypted;
        if (!encryptedValue) {
          return null;
        }
        const ciphertext = Buffer.from(encryptedValue, 'base64');
        const decrypted = this.encryptionService.decryptStructured(
          ciphertext,
          parsed.keyId ?? this.config.export.checkpoint.encryptionKeyId ?? undefined
        );
        if (!decrypted || typeof decrypted !== 'object') {
          return null;
        }
        return {
          ...decrypted,
          encrypted: true,
          keyId: parsed.keyId ?? null,
          classification: parsed.classification ?? this.config.export.checkpoint.classification,
          hash: parsed.hash ?? null,
          fingerprint: parsed.fingerprint ?? null
        };
      }

      if (parsed.checkpoint && typeof parsed.checkpoint === 'object') {
        return { ...parsed.checkpoint, encrypted: false };
      }

      if (parsed.lastEventUuid || parsed.batchId || parsed.exportedAt) {
        return { ...parsed, encrypted: false };
      }

      return null;
    } catch (error) {
      if (
        error?.code === 'NoSuchKey' ||
        error?.code === 'ENOENT' ||
        error?.$metadata?.httpStatusCode === 404 ||
        error?.statusCode === 404
      ) {
        this.logger.debug('Telemetry export checkpoint not found');
        return null;
      }
      this.logger.error({ err: error }, 'Failed to load telemetry export checkpoint');
      return null;
    }
  }

  async #writeCheckpoint({ trigger, batchId, destinationKey, lastEvent, eventCount, schemaSignatures }) {
    if (!this.config.export.checkpoint.enabled) {
      return null;
    }

    try {
      const occurredAt = lastEvent?.occurredAt
        ? new Date(lastEvent.occurredAt).toISOString()
        : new Date().toISOString();
      const payload = {
        version: 1,
        batchId,
        destinationKey,
        trigger,
        eventCount,
        lastEventUuid: lastEvent?.eventUuid ?? null,
        lastEventOccurredAt: occurredAt,
        exportedAt: new Date().toISOString(),
        schemaSignatures: Array.from(schemaSignatures ?? [])
      };

      if (this.config.export.checkpoint.encrypt) {
        const encrypted = this.encryptionService.encryptStructured(payload, {
          classificationTag: this.config.export.checkpoint.classification,
          keyId: this.config.export.checkpoint.encryptionKeyId ?? undefined,
          fingerprintValues: [payload.lastEventUuid, batchId].filter(Boolean)
        });

        const body = Buffer.from(
          JSON.stringify({
            version: 1,
            encrypted: encrypted.ciphertext ? encrypted.ciphertext.toString('base64') : null,
            keyId: encrypted.keyId,
            hash: encrypted.hash,
            classification: encrypted.classificationTag,
            fingerprint: encrypted.fingerprint ?? null
          }),
          'utf8'
        );

        await this.storage.uploadBuffer({
          bucket: this.config.export.bucket,
          key: this.config.export.checkpoint.key,
          body,
          contentType: 'application/json',
          visibility: 'workspace',
          metadata: {
            'edulure-checkpoint': 'telemetry-export',
            'edulure-encrypted': 'true'
          }
        });

        return { ...payload, encrypted: true };
      }

      const body = Buffer.from(JSON.stringify({ version: 1, checkpoint: payload }), 'utf8');
      await this.storage.uploadBuffer({
        bucket: this.config.export.bucket,
        key: this.config.export.checkpoint.key,
        body,
        contentType: 'application/json',
        visibility: 'workspace',
        metadata: {
          'edulure-checkpoint': 'telemetry-export',
          'edulure-encrypted': 'false'
        }
      });

      return { ...payload, encrypted: false };
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to persist telemetry export checkpoint');
      return null;
    }
  }
}

const telemetryWarehouseService = new TelemetryWarehouseService();

export default telemetryWarehouseService;
