import db from '../config/database.js';

const TABLE = 'learner_growth_initiatives';

function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : fallback;
    }
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function deserialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    objective: row.objective ?? null,
    primaryMetric: row.primary_metric ?? null,
    baselineValue: toNumber(row.baseline_value),
    targetValue: toNumber(row.target_value),
    currentValue: toNumber(row.current_value),
    startAt: row.start_at,
    endAt: row.end_at,
    tags: parseJson(row.tags, []),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class LearnerGrowthInitiativeModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async listByUserId(userId, { status } = {}, connection = db) {
    if (!userId) return [];
    const query = connection(TABLE)
      .select([
        'id',
        'user_id',
        'slug',
        'title',
        'status',
        'objective',
        'primary_metric',
        'baseline_value',
        'target_value',
        'current_value',
        'start_at',
        'end_at',
        'tags',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      query.whereIn('status', statuses);
    }
    const rows = await query;
    return rows.map(deserialize);
  }

  static async findByIdForUser(userId, id, connection = db) {
    if (!userId || !id) return null;
    const row = await connection(TABLE)
      .select('*')
      .where({ id, user_id: userId })
      .first();
    return deserialize(row);
  }

  static async findBySlug(userId, slug, connection = db) {
    if (!userId || !slug) return null;
    const row = await connection(TABLE)
      .select('*')
      .where({ user_id: userId, slug })
      .first();
    return deserialize(row);
  }

  static async create(initiative, connection = db) {
    const payload = {
      user_id: initiative.userId,
      slug: initiative.slug,
      title: initiative.title,
      status: initiative.status ?? 'planning',
      objective: initiative.objective ?? null,
      primary_metric: initiative.primaryMetric ?? null,
      baseline_value: initiative.baselineValue ?? null,
      target_value: initiative.targetValue ?? null,
      current_value: initiative.currentValue ?? null,
      start_at: initiative.startAt ?? null,
      end_at: initiative.endAt ?? null,
      tags: JSON.stringify(initiative.tags ?? []),
      metadata: JSON.stringify(initiative.metadata ?? {})
    };
    const [id] = await connection(TABLE).insert(payload);
    return this.findByIdForUser(initiative.userId, id, connection);
  }

  static async updateById(id, updates, connection = db) {
    if (!id) return null;
    const payload = {};
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.objective !== undefined) payload.objective = updates.objective ?? null;
    if (updates.primaryMetric !== undefined) payload.primary_metric = updates.primaryMetric ?? null;
    if (updates.baselineValue !== undefined) payload.baseline_value = updates.baselineValue ?? null;
    if (updates.targetValue !== undefined) payload.target_value = updates.targetValue ?? null;
    if (updates.currentValue !== undefined) payload.current_value = updates.currentValue ?? null;
    if (updates.startAt !== undefined) payload.start_at = updates.startAt ?? null;
    if (updates.endAt !== undefined) payload.end_at = updates.endAt ?? null;
    if (updates.tags !== undefined) payload.tags = JSON.stringify(updates.tags ?? []);
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});
    if (Object.keys(payload).length) {
      await connection(TABLE).where({ id }).update(payload);
    }
    if (updates.userId) {
      return this.findByIdForUser(updates.userId, id, connection);
    }
    const row = await connection(TABLE).select('*').where({ id }).first();
    return deserialize(row);
  }

  static async deleteByIdForUser(userId, id, connection = db) {
    if (!userId || !id) return 0;
    return connection(TABLE).where({ id, user_id: userId }).del();
  }
}
