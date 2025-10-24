import db from '../config/database.js';
import { TABLES } from '../database/domains/telemetry.js';
import jsonMergePatch from '../database/utils/jsonMergePatch.js';
import { buildEnvironmentColumns } from '../utils/environmentContext.js';
import { readJsonColumn, writeJsonColumn } from '../utils/modelUtils.js';

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
    metadata: readJsonColumn(row.metadata, {}),
    environment: {
      key: row.environment_key ?? null,
      name: row.environment_name ?? null,
      tier: row.environment_tier ?? null,
      region: row.environment_region ?? null,
      workspace: row.environment_workspace ?? null
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class TelemetryExportModel {
  static toDomain = toDomain;

  static async create(
    {
      destination = 's3',
      status = 'exporting',
      metadata = {},
      startedAt = new Date(),
      environment
    } = {},
    connection = db
  ) {
    const insertPayload = {
      destination,
      status,
      metadata: writeJsonColumn(metadata ?? {}),
      started_at: startedAt,
      ...buildEnvironmentColumns(environment ?? {})
    };

    const [id] = await connection(TABLES.EVENT_BATCHES).insert(insertPayload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLES.EVENT_BATCHES).where({ id }).first();
    return toDomain(row);
  }

  static async findByBatchUuid(batchUuid, connection = db) {
    if (!batchUuid) {
      return null;
    }

    const row = await connection(TABLES.EVENT_BATCHES).where({ batch_uuid: batchUuid }).first();
    return toDomain(row);
  }

  static async listRecent({ limit = 20, destination, environment } = {}, connection = db) {
    const envColumns = buildEnvironmentColumns(environment ?? {});
    const query = connection(TABLES.EVENT_BATCHES)
      .where({ environment_key: envColumns.environment_key })
      .orderBy('created_at', 'desc')
      .limit(Math.max(1, limit));

    if (destination) {
      query.where({ destination });
    }

    const rows = await query;
    return rows.map(toDomain);
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
      completed_at: completedAt
    };

    if (metadata && Object.keys(metadata).length > 0) {
      const mergeExpression = jsonMergePatch(connection, 'metadata', metadata);
      if (mergeExpression) {
        updatePayload.metadata = mergeExpression;
      }
    }

    await connection(TABLES.EVENT_BATCHES).where({ id }).update(updatePayload);
    return this.findById(id, connection);
  }

  static async markFailed(id, error, connection = db) {
    const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
    const failureMetadata = {
      lastError: message.slice(0, 500),
      failedAt: new Date().toISOString()
    };

    const updatePayload = {
      status: 'failed',
      error_message: message.slice(0, 1000),
      completed_at: connection.fn.now()
    };

    const mergeExpression = jsonMergePatch(connection, 'metadata', failureMetadata);
    if (mergeExpression) {
      updatePayload.metadata = mergeExpression;
    }

    await connection(TABLES.EVENT_BATCHES).where({ id }).update(updatePayload);

    return this.findById(id, connection);
  }
}
