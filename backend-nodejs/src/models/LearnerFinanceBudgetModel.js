import db from '../config/database.js';

const TABLE = 'learner_finance_budgets';

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
    name: row.name,
    amountCents: Number(row.amount_cents ?? 0),
    currency: row.currency ?? 'USD',
    period: row.period ?? 'monthly',
    alertsEnabled: Boolean(row.alerts_enabled),
    alertThresholdPercent: Number(row.alert_threshold_percent ?? 80),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class LearnerFinanceBudgetModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async listByUserId(userId, connection = db) {
    if (!userId) return [];
    const rows = await connection(TABLE)
      .select('*')
      .where({ user_id: userId })
      .orderBy('updated_at', 'desc');
    return rows.map((row) => deserialize(row));
  }

  static async create(payload, connection = db) {
    if (!payload?.userId) {
      throw new Error('A user identifier is required to create a finance budget');
    }
    const insert = {
      user_id: payload.userId,
      name: payload.name,
      amount_cents: payload.amountCents ?? 0,
      currency: payload.currency ?? 'USD',
      period: payload.period ?? 'monthly',
      alerts_enabled: payload.alertsEnabled ?? true,
      alert_threshold_percent: payload.alertThresholdPercent ?? 80,
      metadata: JSON.stringify(payload.metadata ?? {})
    };
    const [id] = await connection(TABLE).insert(insert);
    const row = await connection(TABLE).select('*').where({ id }).first();
    return deserialize(row);
  }

  static async findByIdForUser(userId, budgetId, connection = db) {
    if (!userId || !budgetId) return null;
    const row = await connection(TABLE)
      .select('*')
      .where({ id: budgetId, user_id: userId })
      .first();
    return deserialize(row);
  }

  static async updateByIdForUser(userId, budgetId, payload = {}, connection = db) {
    if (!userId || !budgetId) return null;
    const updates = {};
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.amountCents !== undefined) updates.amount_cents = payload.amountCents;
    if (payload.currency !== undefined) updates.currency = payload.currency;
    if (payload.period !== undefined) updates.period = payload.period;
    if (payload.alertsEnabled !== undefined) updates.alerts_enabled = payload.alertsEnabled;
    if (payload.alertThresholdPercent !== undefined)
      updates.alert_threshold_percent = payload.alertThresholdPercent;
    if (payload.metadata !== undefined) updates.metadata = JSON.stringify(payload.metadata ?? {});
    if (Object.keys(updates).length === 0) {
      const row = await connection(TABLE)
        .select('*')
        .where({ id: budgetId, user_id: userId })
        .first();
      return deserialize(row);
    }
    await connection(TABLE).where({ id: budgetId, user_id: userId }).update(updates);
    const row = await connection(TABLE)
      .select('*')
      .where({ id: budgetId, user_id: userId })
      .first();
    return deserialize(row);
  }

  static async deleteByIdForUser(userId, budgetId, connection = db) {
    if (!userId || !budgetId) return false;
    const deleted = await connection(TABLE).where({ id: budgetId, user_id: userId }).del();
    return Boolean(deleted);
  }
}
