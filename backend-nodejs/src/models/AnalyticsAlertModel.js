import db from '../config/database.js';
import { buildEnvironmentColumns, getEnvironmentDescriptor } from '../utils/environmentContext.js';
import { safeJsonParse, safeJsonStringify } from '../utils/modelUtils.js';

export default class AnalyticsAlertModel {
  static TABLE = 'analytics_alerts';

  static ALLOWED_SEVERITIES = new Set(['info', 'warning', 'critical']);

  static normaliseSeverity(value) {
    if (!value) return 'info';
    const normalised = String(value).toLowerCase();
    if (!this.ALLOWED_SEVERITIES.has(normalised)) {
      throw new Error(`Unsupported analytics alert severity: ${value}`);
    }
    return normalised;
  }

  static deserialize(row) {
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      alertCode: row.alert_code,
      severity: row.severity,
      message: row.message,
      metadata: safeJsonParse(row.metadata, {}),
      detectedAt: row.detected_at ? new Date(row.detected_at) : null,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
      environment: {
        key: row.environment_key ?? null,
        name: row.environment_name ?? null,
        tier: row.environment_tier ?? null,
        region: row.environment_region ?? null,
        workspace: row.environment_workspace ?? null
      }
    };
  }

  static serialize(payload) {
    if (!payload.alertCode) {
      throw new Error('Analytics alert requires an alertCode');
    }
    if (!payload.message) {
      throw new Error('Analytics alert requires a message');
    }
    const environmentDescriptor = getEnvironmentDescriptor(payload.environment);
    const environmentColumns = buildEnvironmentColumns(environmentDescriptor);
    return {
      alert_code: payload.alertCode,
      severity: this.normaliseSeverity(payload.severity ?? 'info'),
      message: payload.message,
      metadata: safeJsonStringify(payload.metadata),
      ...environmentColumns
    };
  }

  static async create(payload, connection = db) {
    const insertPayload = this.serialize(payload);
    const [id] = await connection(this.TABLE).insert(insertPayload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection(this.TABLE).where({ id }).first();
    return this.deserialize(row);
  }

  static async findOpenByCode(alertCode, { environment } = {}, connection = db) {
    const row = await connection(this.TABLE)
      .where({ alert_code: alertCode, environment_key: getEnvironmentDescriptor(environment).key })
      .andWhereNull('resolved_at')
      .orderBy('detected_at', 'desc')
      .first();
    return this.deserialize(row);
  }

  static async listOpen({ limit = 20, environment } = {}, connection = db) {
    const rows = await connection(this.TABLE)
      .whereNull('resolved_at')
      .andWhere({ environment_key: getEnvironmentDescriptor(environment).key })
      .orderBy('detected_at', 'desc')
      .limit(limit);
    return rows.map((row) => this.deserialize(row)).filter(Boolean);
  }

  static async listRecent({ since, limit = 20, environment } = {}, connection = db) {
    const query = connection(this.TABLE)
      .where({ environment_key: getEnvironmentDescriptor(environment).key })
      .orderBy('detected_at', 'desc')
      .limit(limit);
    if (since) {
      query.andWhere('detected_at', '>=', since);
    }
    const rows = await query;
    return rows.map((row) => this.deserialize(row)).filter(Boolean);
  }

  static async resolve(alertId, connection = db) {
    await connection(this.TABLE).where({ id: alertId }).update({ resolved_at: connection.fn.now() });
    return this.findById(alertId, connection);
  }
}
