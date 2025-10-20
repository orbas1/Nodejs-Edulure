import db from '../config/database.js';

const TABLE = 'learner_payment_methods';

function deserialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    brand: row.brand,
    last4: row.last4,
    expiry: row.expiry,
    primary: Boolean(row.is_primary),
    metadata: typeof row.metadata === 'object' && row.metadata !== null ? row.metadata : safeJson(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function safeJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
}

export default class LearnerPaymentMethodModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async listByUserId(userId, connection = db) {
    if (!userId) return [];
    const rows = await connection(TABLE)
      .select([
        'id',
        'user_id',
        'label',
        'brand',
        'last4',
        'expiry',
        'is_primary',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .where({ user_id: userId })
      .orderBy('is_primary', 'desc')
      .orderBy('created_at', 'desc');
    return rows.map(deserialize);
  }

  static async findByIdForUser(userId, id, connection = db) {
    if (!userId || !id) return null;
    const row = await connection(TABLE)
      .select([
        'id',
        'user_id',
        'label',
        'brand',
        'last4',
        'expiry',
        'is_primary',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .where({ id, user_id: userId })
      .first();
    return deserialize(row);
  }

  static async create(method, connection = db) {
    const payload = {
      user_id: method.userId,
      label: method.label,
      brand: method.brand,
      last4: method.last4,
      expiry: method.expiry,
      is_primary: method.primary ?? false,
      metadata: JSON.stringify(method.metadata ?? {})
    };
    const [id] = await connection(TABLE).insert(payload);
    return this.findByIdForUser(method.userId, id, connection);
  }

  static async updateById(id, updates, connection = db) {
    if (!id) return null;
    const payload = {};
    if (updates.label !== undefined) payload.label = updates.label;
    if (updates.brand !== undefined) payload.brand = updates.brand;
    if (updates.last4 !== undefined) payload.last4 = updates.last4;
    if (updates.expiry !== undefined) payload.expiry = updates.expiry;
    if (updates.primary !== undefined) payload.is_primary = updates.primary;
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});
    if (Object.keys(payload).length === 0) return this.findByIdForUser(updates.userId ?? null, id, connection);
    await connection(TABLE).where({ id }).update(payload);
    if (updates.userId) {
      return this.findByIdForUser(updates.userId, id, connection);
    }
    const row = await connection(TABLE)
      .select(['id', 'user_id', 'label', 'brand', 'last4', 'expiry', 'is_primary', 'metadata', 'created_at', 'updated_at'])
      .where({ id })
      .first();
    return deserialize(row);
  }

  static async clearPrimaryForUser(userId, connection = db) {
    if (!userId) return;
    await connection(TABLE).where({ user_id: userId }).update({ is_primary: false });
  }

  static async deleteByIdForUser(userId, id, connection = db) {
    if (!userId || !id) return 0;
    return connection(TABLE).where({ id, user_id: userId }).del();
  }
}
