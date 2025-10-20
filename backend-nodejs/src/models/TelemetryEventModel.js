import db from '../config/database.js';
import { TABLES } from '../database/domains/telemetry.js';

function parseJson(value, fallback = {}) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function parseArray(value, fallback = []) {
  const parsed = parseJson(value, fallback);
  return Array.isArray(parsed) ? parsed : fallback;
}

function toDomain(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    eventUuid: row.event_uuid,
    tenantId: row.tenant_id,
    schemaVersion: row.schema_version,
    eventName: row.event_name,
    eventVersion: row.event_version,
    eventSource: row.event_source,
    occurredAt: row.occurred_at,
    receivedAt: row.received_at,
    userId: row.user_id,
    sessionId: row.session_id,
    deviceId: row.device_id,
    correlationId: row.correlation_id,
    consentScope: row.consent_scope,
    consentStatus: row.consent_status,
    ingestionStatus: row.ingestion_status,
    ingestionAttempts: row.ingestion_attempts,
    lastIngestionAttempt: row.last_ingestion_attempt,
    exportBatchId: row.export_batch_id,
    payload: parseJson(row.payload, {}),
    context: parseJson(row.context, {}),
    metadata: parseJson(row.metadata, {}),
    tags: parseArray(row.tags, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dedupeHash: row.dedupe_hash
  };
}

async function findByDedupeHash(dedupeHash, connection) {
  if (!dedupeHash) {
    return null;
  }

  const row = await connection(TABLES.EVENTS).where({ dedupe_hash: dedupeHash }).first();
  return toDomain(row);
}

export default class TelemetryEventModel {
  static async create(payload, connection = db) {
    if (!payload?.eventName) {
      throw new Error('TelemetryEventModel.create requires an eventName.');
    }

    if (!payload?.dedupeHash) {
      throw new Error('TelemetryEventModel.create requires a dedupeHash computed upstream.');
    }

    const insertPayload = {
      tenant_id: payload.tenantId ?? 'global',
      schema_version: payload.schemaVersion ?? 'v1',
      event_name: payload.eventName,
      event_version: payload.eventVersion ?? null,
      event_source: payload.eventSource ?? 'unknown',
      occurred_at: payload.occurredAt ?? new Date(),
      received_at: payload.receivedAt ?? new Date(),
      user_id: payload.userId ?? null,
      session_id: payload.sessionId ?? null,
      device_id: payload.deviceId ?? null,
      correlation_id: payload.correlationId ?? null,
      consent_scope: payload.consentScope,
      consent_status: payload.consentStatus ?? 'granted',
      ingestion_status: payload.ingestionStatus ?? 'pending',
      ingestion_attempts: payload.ingestionAttempts ?? 0,
      last_ingestion_attempt: payload.lastIngestionAttempt ?? null,
      export_batch_id: payload.exportBatchId ?? null,
      dedupe_hash: payload.dedupeHash,
      payload: JSON.stringify(payload.payload ?? {}),
      context: JSON.stringify(payload.context ?? {}),
      metadata: JSON.stringify(payload.metadata ?? {}),
      tags: JSON.stringify(Array.isArray(payload.tags) ? payload.tags : [])
    };

    try {
      const [id] = await connection(TABLES.EVENTS).insert(insertPayload);
      const event = await this.findById(id, connection);
      return { event, duplicate: false };
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        const existing = await findByDedupeHash(payload.dedupeHash, connection);
        if (existing) {
          return { event: existing, duplicate: true };
        }
      }
      throw error;
    }
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLES.EVENTS).where({ id }).first();
    return toDomain(row);
  }

  static async listPendingForExport({ limit = 5000 } = {}, connection = db) {
    const rows = await connection(TABLES.EVENTS)
      .where({ ingestion_status: 'pending' })
      .orderBy('occurred_at', 'asc')
      .limit(limit);

    return rows.map(toDomain);
  }

  static async markExported(ids, { batchId, metadata } = {}, connection = db) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return 0;
    }

    const updatePayload = {
      ingestion_status: 'exported',
      export_batch_id: batchId ?? null,
      ingestion_attempts: connection.raw('ingestion_attempts + 1'),
      last_ingestion_attempt: connection.fn.now()
    };

    if (metadata && Object.keys(metadata).length > 0) {
      updatePayload.metadata = connection.raw(
        'JSON_MERGE_PATCH(IFNULL(metadata, JSON_OBJECT()), ?)',
        JSON.stringify(metadata)
      );
    }

    return connection(TABLES.EVENTS).whereIn('id', ids).update(updatePayload);
  }

  static async markExportFailed(ids, error, connection = db) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return 0;
    }

    const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
    const updatePayload = {
      ingestion_status: 'pending',
      ingestion_attempts: connection.raw('ingestion_attempts + 1'),
      last_ingestion_attempt: connection.fn.now(),
      metadata: connection.raw(
        'JSON_MERGE_PATCH(IFNULL(metadata, JSON_OBJECT()), ?)',
        JSON.stringify({ lastError: message.slice(0, 500), lastFailureAt: new Date().toISOString() })
      )
    };

    return connection(TABLES.EVENTS).whereIn('id', ids).update(updatePayload);
  }
}
