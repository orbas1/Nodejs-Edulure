import db from '../config/database.js';

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
    alertCode: row.alert_code,
    severity: row.severity,
    message: row.message,
    metadata: parseJson(row.metadata, {}),
    detectedAt: row.detected_at,
    resolvedAt: row.resolved_at
  };
}

export default class AnalyticsAlertModel {
  static async create(payload, connection = db) {
    const insertPayload = {
      alert_code: payload.alertCode,
      severity: payload.severity,
      message: payload.message,
      metadata: JSON.stringify(payload.metadata ?? {})
    };
    const [id] = await connection('analytics_alerts').insert(insertPayload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection('analytics_alerts').where({ id }).first();
    return toDomain(row);
  }

  static async findOpenByCode(alertCode, connection = db) {
    const row = await connection('analytics_alerts')
      .where({ alert_code: alertCode })
      .andWhereNull('resolved_at')
      .orderBy('detected_at', 'desc')
      .first();
    return toDomain(row);
  }

  static async listOpen({ limit = 20 } = {}, connection = db) {
    const rows = await connection('analytics_alerts')
      .whereNull('resolved_at')
      .orderBy('detected_at', 'desc')
      .limit(limit);
    return rows.map(toDomain);
  }

  static async listRecent({ since, limit = 20 } = {}, connection = db) {
    const query = connection('analytics_alerts').orderBy('detected_at', 'desc').limit(limit);
    if (since) {
      query.andWhere('detected_at', '>=', since);
    }
    const rows = await query;
    return rows.map(toDomain);
  }

  static async resolve(alertId, connection = db) {
    await connection('analytics_alerts').where({ id: alertId }).update({ resolved_at: connection.fn.now() });
    return this.findById(alertId, connection);
  }
}
