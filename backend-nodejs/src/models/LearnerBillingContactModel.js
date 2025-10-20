import db from '../config/database.js';

const TABLE = 'learner_billing_contacts';

function deserialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    metadata: parseJson(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

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

export default class LearnerBillingContactModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async listByUserId(userId, connection = db) {
    if (!userId) return [];
    const rows = await connection(TABLE)
      .select(['id', 'user_id', 'name', 'email', 'phone', 'company', 'metadata', 'created_at', 'updated_at'])
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
    return rows.map(deserialize);
  }

  static async findByIdForUser(userId, id, connection = db) {
    if (!userId || !id) return null;
    const row = await connection(TABLE)
      .select(['id', 'user_id', 'name', 'email', 'phone', 'company', 'metadata', 'created_at', 'updated_at'])
      .where({ id, user_id: userId })
      .first();
    return deserialize(row);
  }

  static async findByEmail(userId, email, connection = db) {
    if (!userId || !email) return null;
    const row = await connection(TABLE)
      .select(['id', 'user_id', 'name', 'email', 'phone', 'company', 'metadata', 'created_at', 'updated_at'])
      .where({ user_id: userId })
      .andWhereRaw('LOWER(email) = LOWER(?)', [email])
      .first();
    return deserialize(row);
  }

  static async create(contact, connection = db) {
    const payload = {
      user_id: contact.userId,
      name: contact.name,
      email: contact.email,
      phone: contact.phone ?? null,
      company: contact.company ?? null,
      metadata: JSON.stringify(contact.metadata ?? {})
    };
    const [id] = await connection(TABLE).insert(payload);
    return this.findByIdForUser(contact.userId, id, connection);
  }

  static async updateById(id, updates, connection = db) {
    if (!id) return null;
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.phone !== undefined) payload.phone = updates.phone ?? null;
    if (updates.company !== undefined) payload.company = updates.company ?? null;
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});
    if (Object.keys(payload).length === 0) {
      return this.findByIdForUser(updates.userId ?? null, id, connection);
    }
    await connection(TABLE).where({ id }).update(payload);
    if (updates.userId) {
      return this.findByIdForUser(updates.userId, id, connection);
    }
    const row = await connection(TABLE)
      .select(['id', 'user_id', 'name', 'email', 'phone', 'company', 'metadata', 'created_at', 'updated_at'])
      .where({ id })
      .first();
    return deserialize(row);
  }

  static async deleteByIdForUser(userId, id, connection = db) {
    if (!userId || !id) return 0;
    return connection(TABLE).where({ id, user_id: userId }).del();
  }
}
