import db from '../config/database.js';

const TABLE = 'learner_financial_profiles';

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
}

function deserialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    autoPayEnabled: Boolean(row.auto_pay_enabled),
    reserveTargetCents: Number(row.reserve_target_cents ?? 0),
    preferences: parseJson(row.preferences, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class LearnerFinancialProfileModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async findByUserId(userId, connection = db) {
    if (!userId) return null;
    const row = await connection(TABLE).select('*').where({ user_id: userId }).first();
    return deserialize(row);
  }

  static async upsertForUser(userId, payload, connection = db) {
    if (!userId) return null;
    const updates = {
      auto_pay_enabled: payload.autoPayEnabled ?? false,
      reserve_target_cents: payload.reserveTargetCents ?? 0,
      preferences: JSON.stringify(payload.preferences ?? {})
    };
    const existing = await connection(TABLE).select('id').where({ user_id: userId }).first();
    if (existing) {
      await connection(TABLE).where({ id: existing.id }).update(updates);
      const row = await connection(TABLE).select('*').where({ id: existing.id }).first();
      return deserialize(row);
    }
    const [id] = await connection(TABLE).insert({ user_id: userId, ...updates });
    const row = await connection(TABLE).select('*').where({ id }).first();
    return deserialize(row);
  }
}
