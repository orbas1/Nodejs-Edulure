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
    provider: row.provider,
    environment: row.environment,
    apiKeyId: row.api_key_id ?? null,
    requestMethod: row.request_method,
    requestPath: row.request_path,
    statusCode: row.status_code ?? null,
    outcome: row.outcome,
    direction: row.direction,
    durationMs: row.duration_ms ?? null,
    requestId: row.request_id ?? null,
    correlationId: row.correlation_id ?? null,
    triggeredBy: row.triggered_by ?? null,
    errorCode: row.error_code ?? null,
    errorMessage: row.error_message ?? null,
    metadata: parseJson(row.metadata, {}),
    calledAt: row.called_at ? new Date(row.called_at) : null
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

export default class IntegrationExternalCallAuditModel {
  static tableName = 'integration_external_call_audits';

  static query(connection = db) {
    return connection(this.tableName);
  }

  static async create(record, connection = db) {
    const payload = {
      integration: record.integration,
      provider: record.provider,
      environment: record.environment ?? 'production',
      api_key_id: record.apiKeyId ?? null,
      request_method: record.requestMethod,
      request_path: record.requestPath,
      status_code: record.statusCode ?? null,
      outcome: record.outcome,
      direction: record.direction ?? 'outbound',
      duration_ms: record.durationMs ?? null,
      request_id: record.requestId ?? null,
      correlation_id: record.correlationId ?? null,
      triggered_by: record.triggeredBy ?? null,
      error_code: record.errorCode ?? null,
      error_message: record.errorMessage ?? null,
      metadata: serialiseJson(record.metadata)
    };

    const [id] = await this.query(connection).insert(payload);
    const row = await this.query(connection).where({ id }).first();
    return mapRow(row);
  }

  static async listRecent(integration, { limit = 50 } = {}, connection = db) {
    const query = this.query(connection)
      .where({ integration })
      .orderBy('called_at', 'desc')
      .limit(limit);

    const rows = await query;
    return rows.map((row) => mapRow(row));
  }

  static async summarise(integration, { since } = {}, connection = db) {
    const query = this.query(connection).where({ integration });

    if (since) {
      query.andWhere('called_at', '>=', since);
    }

    const [aggregates] = await query
      .clone()
      .select({
        total: connection.raw('COUNT(*)'),
        success: connection.raw("SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END)"),
        degraded: connection.raw("SUM(CASE WHEN outcome = 'degraded' THEN 1 ELSE 0 END)"),
        failure: connection.raw("SUM(CASE WHEN outcome = 'failure' THEN 1 ELSE 0 END)")
      });

    return {
      total: Number(aggregates?.total ?? 0),
      success: Number(aggregates?.success ?? 0),
      degraded: Number(aggregates?.degraded ?? 0),
      failure: Number(aggregates?.failure ?? 0)
    };
  }
}
