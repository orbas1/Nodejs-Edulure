import db from '../config/database.js';

function parseJson(value, fallback = {}) {
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
    statusId: row.status_id,
    integration: row.integration,
    environment: row.environment,
    status: row.status,
    statusSummary: row.status_summary,
    syncRunId: row.sync_run_id ?? null,
    apiKeyId: row.api_key_id ?? null,
    consecutiveFailures: Number(row.consecutive_failures ?? 0),
    openIncidentCount: Number(row.open_incident_count ?? 0),
    triggeredBy: row.triggered_by ?? null,
    correlationId: row.correlation_id ?? null,
    notes: row.notes ?? null,
    metadata: parseJson(row.metadata, {}),
    recordedAt: row.recorded_at ? new Date(row.recorded_at) : null
  };
}

function serialiseJson(metadata) {
  if (metadata === undefined || metadata === null) {
    return null;
  }

  try {
    return JSON.stringify(metadata);
  } catch (_error) {
    return JSON.stringify({});
  }
}

export default class IntegrationStatusEventModel {
  static tableName = 'integration_status_events';

  static query(connection = db) {
    return connection(this.tableName);
  }

  static async create(record, connection = db) {
    const payload = {
      status_id: record.statusId,
      integration: record.integration,
      environment: record.environment ?? 'production',
      status: record.status,
      status_summary: record.statusSummary ?? null,
      sync_run_id: record.syncRunId ?? null,
      api_key_id: record.apiKeyId ?? null,
      consecutive_failures: record.consecutiveFailures ?? 0,
      open_incident_count: record.openIncidentCount ?? 0,
      triggered_by: record.triggeredBy ?? null,
      correlation_id: record.correlationId ?? null,
      notes: record.notes ?? null,
      metadata: serialiseJson(record.metadata)
    };

    const [id] = await this.query(connection).insert(payload);
    const row = await this.query(connection).where({ id }).first();
    return mapRow(row);
  }

  static async listRecent(integration, { limit = 20 } = {}, connection = db) {
    const query = this.query(connection)
      .where({ integration })
      .orderBy('recorded_at', 'desc')
      .limit(limit);

    const rows = await query;
    return rows.map((row) => mapRow(row));
  }
}
