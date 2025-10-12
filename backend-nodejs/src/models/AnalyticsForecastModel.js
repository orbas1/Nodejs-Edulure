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
    forecastCode: row.forecast_code,
    targetDate: row.target_date instanceof Date ? row.target_date : new Date(row.target_date),
    metricValue: Number(row.metric_value ?? 0),
    lowerBound: Number(row.lower_bound ?? 0),
    upperBound: Number(row.upper_bound ?? 0),
    metadata: parseJson(row.metadata, {}),
    generatedAt: row.generated_at
  };
}

export default class AnalyticsForecastModel {
  static async upsert(payload, connection = db) {
    const insertPayload = {
      forecast_code: payload.forecastCode,
      target_date: payload.targetDate,
      metric_value: Number(payload.metricValue ?? 0),
      lower_bound: Number(payload.lowerBound ?? 0),
      upper_bound: Number(payload.upperBound ?? 0),
      metadata: JSON.stringify(payload.metadata ?? {})
    };

    const result = await connection('analytics_forecasts')
      .insert(insertPayload)
      .onConflict(['forecast_code', 'target_date'])
      .merge({
        metric_value: insertPayload.metric_value,
        lower_bound: insertPayload.lower_bound,
        upper_bound: insertPayload.upper_bound,
        metadata: insertPayload.metadata,
        generated_at: connection.fn.now()
      })
      .returning('*');

    const row = Array.isArray(result) ? result[0] : result;
    return toDomain(row);
  }

  static async listByCode(forecastCode, { limit = 14 } = {}, connection = db) {
    const rows = await connection('analytics_forecasts')
      .where({ forecast_code: forecastCode })
      .orderBy('target_date', 'asc')
      .limit(limit);
    return rows.map(toDomain);
  }

  static async latestForCode(forecastCode, connection = db) {
    const row = await connection('analytics_forecasts')
      .where({ forecast_code: forecastCode })
      .orderBy('generated_at', 'desc')
      .first();
    return toDomain(row);
  }
}
