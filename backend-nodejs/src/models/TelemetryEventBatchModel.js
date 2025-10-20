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

function toDomain(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    batchUuid: row.batch_uuid,
    status: row.status,
    destination: row.destination,
    eventsCount: row.events_count,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    fileKey: row.file_key,
    checksum: row.checksum,
    errorMessage: row.error_message,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class TelemetryEventBatchModel {
  static async create(
    { destination = 's3', status = 'exporting', metadata = {}, startedAt = new Date() } = {},
    connection = db
  ) {
    const insertPayload = {
      destination,
      status,
      metadata: JSON.stringify(metadata ?? {}),
      started_at: startedAt
    };

    const [id] = await connection(TABLES.EVENT_BATCHES).insert(insertPayload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLES.EVENT_BATCHES).where({ id }).first();
    return toDomain(row);
  }

  static async markExported(
    id,
    { eventsCount, fileKey, checksum, metadata = {}, completedAt = new Date() } = {},
    connection = db
  ) {
    const updatePayload = {
      status: 'exported',
      events_count: eventsCount ?? 0,
      file_key: fileKey ?? null,
      checksum: checksum ?? null,
      completed_at: completedAt,
      metadata: connection.raw(
        'JSON_MERGE_PATCH(IFNULL(metadata, JSON_OBJECT()), ?)',
        JSON.stringify(metadata)
      )
    };

    await connection(TABLES.EVENT_BATCHES).where({ id }).update(updatePayload);
    return this.findById(id, connection);
  }

  static async markFailed(id, error, connection = db) {
    const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
    await connection(TABLES.EVENT_BATCHES)
      .where({ id })
      .update({
        status: 'failed',
        error_message: message.slice(0, 1000),
        completed_at: connection.fn.now(),
        metadata: connection.raw(
          'JSON_MERGE_PATCH(IFNULL(metadata, JSON_OBJECT()), ?)',
          JSON.stringify({ lastError: message.slice(0, 500), failedAt: new Date().toISOString() })
        )
      });

    return this.findById(id, connection);
  }
}
