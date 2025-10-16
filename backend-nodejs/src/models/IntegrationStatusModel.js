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
    integration: row.integration,
    environment: row.environment,
    status: row.status,
    statusSummary: row.status_summary,
    latestSyncRunId: row.latest_sync_run_id ?? null,
    primaryApiKeyId: row.primary_api_key_id ?? null,
    lastSuccessAt: row.last_success_at ? new Date(row.last_success_at) : null,
    lastFailureAt: row.last_failure_at ? new Date(row.last_failure_at) : null,
    openIncidentCount: Number(row.open_incident_count ?? 0),
    consecutiveFailures: Number(row.consecutive_failures ?? 0),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null
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

export default class IntegrationStatusModel {
  static tableName = 'integration_statuses';

  static query(connection = db) {
    return connection(this.tableName);
  }

  static async findByIntegration(integration, environment = 'production', connection = db) {
    const row = await this.query(connection)
      .where({ integration, environment })
      .first();
    return mapRow(row);
  }

  static async findById(id, connection = db) {
    const row = await this.query(connection).where({ id }).first();
    return mapRow(row);
  }

  static async list({ integration, environment } = {}, connection = db) {
    const query = this.query(connection).orderBy('integration');

    if (integration) {
      query.where({ integration });
    }

    if (environment) {
      query.where({ environment });
    }

    const rows = await query;
    return rows.map((row) => mapRow(row));
  }

  static async create(record, connection = db) {
    const payload = {
      integration: record.integration,
      environment: record.environment ?? 'production',
      status: record.status ?? 'unknown',
      status_summary: record.statusSummary ?? null,
      latest_sync_run_id: record.latestSyncRunId ?? null,
      primary_api_key_id: record.primaryApiKeyId ?? null,
      last_success_at: record.lastSuccessAt ?? null,
      last_failure_at: record.lastFailureAt ?? null,
      open_incident_count: record.openIncidentCount ?? 0,
      consecutive_failures: record.consecutiveFailures ?? 0,
      metadata: serialiseJson(record.metadata)
    };

    const [id] = await this.query(connection).insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates = {}, connection = db) {
    const payload = {
      updated_at: connection.fn.now()
    };

    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.statusSummary !== undefined) payload.status_summary = updates.statusSummary;
    if (updates.latestSyncRunId !== undefined) payload.latest_sync_run_id = updates.latestSyncRunId;
    if (updates.primaryApiKeyId !== undefined) payload.primary_api_key_id = updates.primaryApiKeyId;
    if (updates.lastSuccessAt !== undefined) payload.last_success_at = updates.lastSuccessAt;
    if (updates.lastFailureAt !== undefined) payload.last_failure_at = updates.lastFailureAt;
    if (updates.openIncidentCount !== undefined) payload.open_incident_count = updates.openIncidentCount;
    if (updates.consecutiveFailures !== undefined) payload.consecutive_failures = updates.consecutiveFailures;
    if (updates.metadata !== undefined) payload.metadata = serialiseJson(updates.metadata);

    await this.query(connection).where({ id }).update(payload);
    return this.findById(id, connection);
  }
}
