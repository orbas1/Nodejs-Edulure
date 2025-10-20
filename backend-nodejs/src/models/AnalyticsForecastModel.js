import db from '../config/database.js';
import { safeJsonParse, safeJsonStringify } from '../utils/modelUtils.js';

export default class AnalyticsForecastModel {
  static TABLE = 'analytics_forecasts';

  static normaliseDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid analytics forecast date: ${value}`);
    }
    return date;
  }

  static normaliseNumeric(value, { min } = {}) {
    const number = Number(value);
    if (Number.isNaN(number)) {
      return 0;
    }
    if (typeof min === 'number' && number < min) {
      return min;
    }
    return number;
  }

  static deserialize(row) {
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
      metadata: safeJsonParse(row.metadata, {}),
      generatedAt: row.generated_at ? new Date(row.generated_at) : null
    };
  }

  static serialize(payload) {
    if (!payload.forecastCode) {
      throw new Error('Analytics forecast requires a forecastCode');
    }
    if (!payload.targetDate) {
      throw new Error('Analytics forecast requires a targetDate');
    }
    const targetDate = this.normaliseDate(payload.targetDate);
    const metricValue = this.normaliseNumeric(payload.metricValue);
    const lowerBound = this.normaliseNumeric(payload.lowerBound, { min: 0 });
    const upperBound = Math.max(metricValue, this.normaliseNumeric(payload.upperBound, { min: 0 }));

    return {
      forecast_code: payload.forecastCode,
      target_date: targetDate,
      metric_value: metricValue,
      lower_bound: lowerBound,
      upper_bound: upperBound,
      metadata: safeJsonStringify(payload.metadata)
    };
  }

  static async upsert(payload, connection = db) {
    const insertPayload = this.serialize(payload);

    const result = await connection(this.TABLE)
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
    return this.deserialize(row);
  }

  static async listByCode(forecastCode, { limit = 14 } = {}, connection = db) {
    const rows = await connection(this.TABLE)
      .where({ forecast_code: forecastCode })
      .orderBy('target_date', 'asc')
      .limit(limit);
    return rows.map((row) => this.deserialize(row)).filter(Boolean);
  }

  static async latestForCode(forecastCode, connection = db) {
    const row = await connection(this.TABLE)
      .where({ forecast_code: forecastCode })
      .orderBy('generated_at', 'desc')
      .first();
    return this.deserialize(row);
  }
}
