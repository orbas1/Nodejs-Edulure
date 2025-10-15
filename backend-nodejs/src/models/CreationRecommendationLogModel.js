import db from '../config/database.js';

function normaliseTenantId(tenantId) {
  if (!tenantId) {
    return 'global';
  }
  return String(tenantId).trim() || 'global';
}

function parseJsonColumn(value, fallback) {
  if (!value) {
    return fallback;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch (_error) {
      return fallback;
    }
  }
  if (typeof value === 'object') {
    return value;
  }
  return fallback;
}

export default class CreationRecommendationLogModel {
  static async record(event, connection = db) {
    if (!event?.userId) {
      throw new Error('userId is required to record recommendation log');
    }

    const payload = {
      tenant_id: normaliseTenantId(event.tenantId),
      user_id: event.userId,
      recommendation_type: event.recommendationType ?? 'creation-studio',
      algorithm_version: event.algorithmVersion ?? '1.0.0',
      feature_flag_key: event.featureFlagKey ?? 'creation.recommendations',
      feature_flag_state: event.featureFlagState ?? 'enabled',
      feature_flag_variant: event.featureFlagVariant ?? null,
      context: JSON.stringify(event.context ?? {}),
      results: JSON.stringify(event.results ?? []),
      explainability: JSON.stringify(event.explainability ?? []),
      generated_at: event.generatedAt ?? connection.fn.now(),
      expires_at: event.expiresAt ?? null
    };

    const [id] = await connection('creation_recommendation_logs').insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection('creation_recommendation_logs').where({ id }).first();
    return row ? this.deserialize(row) : null;
  }

  static async listRecent(
    { tenantId = 'global', userId, recommendationType = 'creation-studio', limit = 5 } = {},
    connection = db
  ) {
    if (!userId) {
      return [];
    }

    const rows = await connection('creation_recommendation_logs')
      .where({ user_id: userId, recommendation_type: recommendationType, tenant_id: normaliseTenantId(tenantId) })
      .orderBy('generated_at', 'desc')
      .limit(limit);

    return rows.map((row) => this.deserialize(row));
  }

  static async purgeExpired({ before = new Date() } = {}, connection = db) {
    await connection('creation_recommendation_logs')
      .whereNotNull('expires_at')
      .andWhere('expires_at', '<', before)
      .del();
  }

  static deserialize(record) {
    if (!record) {
      return null;
    }
    return {
      id: record.id,
      tenantId: normaliseTenantId(record.tenant_id),
      userId: record.user_id,
      recommendationType: record.recommendation_type,
      algorithmVersion: record.algorithm_version,
      featureFlagKey: record.feature_flag_key,
      featureFlagState: record.feature_flag_state,
      featureFlagVariant: record.feature_flag_variant ?? null,
      context: parseJsonColumn(record.context, {}),
      results: parseJsonColumn(record.results, []),
      explainability: parseJsonColumn(record.explainability, []),
      generatedAt: record.generated_at ? new Date(record.generated_at).toISOString() : null,
      expiresAt: record.expires_at ? new Date(record.expires_at).toISOString() : null,
      createdAt: record.created_at ? new Date(record.created_at).toISOString() : null
    };
  }
}
