import db from '../config/database.js';

function parseJsonColumn(value, fallback = null) {
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
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    enabled: Boolean(row.enabled),
    killSwitch: Boolean(row.kill_switch),
    rolloutStrategy: row.rollout_strategy,
    rolloutPercentage: row.rollout_percentage,
    segmentRules: parseJsonColumn(row.segment_rules, {}),
    variants: parseJsonColumn(row.variants, []),
    environments: parseJsonColumn(row.environments, []),
    metadata: parseJsonColumn(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class FeatureFlagModel {
  static async all(connection = db) {
    const rows = await connection('feature_flags').select('*').orderBy('key');
    return rows.map(toDomain);
  }

  static async findByKey(key, connection = db) {
    const row = await connection('feature_flags').where({ key }).first();
    return row ? toDomain(row) : null;
  }
}

export class FeatureFlagAuditModel {
  static async record({ flagId, changeType, payload, changedBy = null }, connection = db) {
    return connection('feature_flag_audits').insert({
      flag_id: flagId,
      change_type: changeType,
      payload: JSON.stringify(payload ?? {}),
      changed_by: changedBy ?? null
    });
  }

  static async listForFlag(flagId, { limit = 20 } = {}, connection = db) {
    const rows = await connection('feature_flag_audits')
      .where({ flag_id: flagId })
      .orderBy('created_at', 'desc')
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      flagId: row.flag_id,
      changeType: row.change_type,
      changedBy: row.changed_by ?? null,
      payload: parseJsonColumn(row.payload, {}),
      createdAt: row.created_at
    }));
  }
}
