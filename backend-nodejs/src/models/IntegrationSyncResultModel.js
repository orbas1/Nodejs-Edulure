import db from '../config/database.js';

function parseJson(value, fallback = null) {
  if (!value) {
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

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    syncRunId: row.sync_run_id,
    integration: row.integration,
    entityType: row.entity_type,
    entityId: row.entity_id,
    externalId: row.external_id,
    direction: row.direction,
    operation: row.operation,
    status: row.status,
    retryCount: Number(row.retry_count ?? 0),
    message: row.message,
    payload: parseJson(row.payload, {}),
    occurredAt: row.occurred_at
  };
}

function serialisePayload(payload) {
  if (payload === undefined || payload === null) {
    return null;
  }
  try {
    return JSON.stringify(payload);
  } catch (_error) {
    return JSON.stringify({});
  }
}

export default class IntegrationSyncResultModel {
  static async record(result, connection = db) {
    const payload = {
      sync_run_id: result.syncRunId,
      integration: result.integration,
      entity_type: result.entityType,
      entity_id: result.entityId,
      external_id: result.externalId ?? null,
      direction: result.direction ?? 'outbound',
      operation: result.operation ?? 'upsert',
      status: result.status ?? 'succeeded',
      retry_count: result.retryCount ?? 0,
      message: result.message ?? null,
      payload: serialisePayload(result.payload)
    };

    const [id] = await connection('integration_sync_results').insert(payload);
    const row = await connection('integration_sync_results').where({ id }).first();
    return mapRow(row);
  }

  static async bulkInsert(results, connection = db) {
    if (!Array.isArray(results) || results.length === 0) {
      return [];
    }

    const payload = results.map((entry) => ({
      sync_run_id: entry.syncRunId,
      integration: entry.integration,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      external_id: entry.externalId ?? null,
      direction: entry.direction ?? 'outbound',
      operation: entry.operation ?? 'upsert',
      status: entry.status ?? 'succeeded',
      retry_count: entry.retryCount ?? 0,
      message: entry.message ?? null,
      payload: serialisePayload(entry.payload)
    }));

    await connection.batchInsert('integration_sync_results', payload, 100);

    return payload.length;
  }

  static async listFailures(integration, { since } = {}, connection = db) {
    const query = connection('integration_sync_results')
      .where({ integration })
      .andWhere('status', '!=', 'succeeded')
      .orderBy('occurred_at', 'desc');

    if (since) {
      query.andWhere('occurred_at', '>=', since);
    }

    const rows = await query.limit(100);
    return rows.map((row) => mapRow(row));
  }
}
