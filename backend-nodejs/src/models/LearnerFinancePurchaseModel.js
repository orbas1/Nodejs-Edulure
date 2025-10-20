import db from '../config/database.js';

const TABLE = 'learner_finance_purchases';

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
    reference: row.reference,
    description: row.description,
    amountCents: Number(row.amount_cents ?? 0),
    currency: row.currency ?? 'USD',
    status: row.status ?? 'paid',
    purchasedAt: row.purchased_at,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class LearnerFinancePurchaseModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async listByUserId(userId, connection = db) {
    if (!userId) return [];
    const rows = await connection(TABLE)
      .select('*')
      .where({ user_id: userId })
      .orderBy('purchased_at', 'desc');
    return rows.map((row) => deserialize(row));
  }

  static async create(payload, connection = db) {
    if (!payload?.userId) {
      throw new Error('A user identifier is required to create a finance purchase');
    }
    const insert = {
      user_id: payload.userId,
      reference: payload.reference,
      description: payload.description,
      amount_cents: payload.amountCents ?? 0,
      currency: payload.currency ?? 'USD',
      status: payload.status ?? 'paid',
      purchased_at: payload.purchasedAt ?? connection.fn.now(),
      metadata: JSON.stringify(payload.metadata ?? {})
    };
    const [id] = await connection(TABLE).insert(insert);
    const row = await connection(TABLE).select('*').where({ id }).first();
    return deserialize(row);
  }

  static async findByIdForUser(userId, purchaseId, connection = db) {
    if (!userId || !purchaseId) return null;
    const row = await connection(TABLE)
      .select('*')
      .where({ id: purchaseId, user_id: userId })
      .first();
    return deserialize(row);
  }

  static async updateByIdForUser(userId, purchaseId, payload = {}, connection = db) {
    if (!userId || !purchaseId) return null;
    const updates = {};
    if (payload.reference !== undefined) updates.reference = payload.reference;
    if (payload.description !== undefined) updates.description = payload.description;
    if (payload.amountCents !== undefined) updates.amount_cents = payload.amountCents;
    if (payload.currency !== undefined) updates.currency = payload.currency;
    if (payload.status !== undefined) updates.status = payload.status;
    if (payload.purchasedAt !== undefined) updates.purchased_at = payload.purchasedAt;
    if (payload.metadata !== undefined) updates.metadata = JSON.stringify(payload.metadata ?? {});
    if (Object.keys(updates).length === 0) {
      const row = await connection(TABLE)
        .select('*')
        .where({ id: purchaseId, user_id: userId })
        .first();
      return deserialize(row);
    }
    await connection(TABLE).where({ id: purchaseId, user_id: userId }).update(updates);
    const row = await connection(TABLE)
      .select('*')
      .where({ id: purchaseId, user_id: userId })
      .first();
    return deserialize(row);
  }

  static async deleteByIdForUser(userId, purchaseId, connection = db) {
    if (!userId || !purchaseId) return false;
    const deleted = await connection(TABLE).where({ id: purchaseId, user_id: userId }).del();
    return Boolean(deleted);
  }
}
