import db from '../config/database.js';

const TABLE = 'instructor_quick_actions';

const BASE_COLUMNS = [
  'action.id',
  'action.public_id as publicId',
  'action.instructor_id as instructorId',
  'action.title',
  'action.description',
  'action.action_type as actionType',
  'action.status',
  'action.priority',
  'action.due_at as dueAt',
  'action.requires_sync as requiresSync',
  'action.last_synced_at as lastSyncedAt',
  'action.completed_at as completedAt',
  'action.metadata',
  'action.created_at as createdAt',
  'action.updated_at as updatedAt'
];

function parseJson(value) {
  if (!value) {
    return {};
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_error) {
      return {};
    }
  }
  if (typeof value === 'object' && value !== null) {
    return { ...value };
  }
  return {};
}

function toDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function deserialize(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    publicId: row.publicId,
    instructorId: row.instructorId,
    title: row.title,
    description: row.description ?? null,
    actionType: row.actionType,
    status: row.status,
    priority: Number(row.priority ?? 0),
    dueAt: toDate(row.dueAt),
    requiresSync: Boolean(row.requiresSync),
    lastSyncedAt: toDate(row.lastSyncedAt),
    completedAt: toDate(row.completedAt),
    metadata: parseJson(row.metadata),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt)
  };
}

export default class InstructorQuickActionModel {
  static async listByInstructorId(instructorId, { status, limit } = {}, connection = db) {
    if (!instructorId) {
      return [];
    }
    const query = connection(`${TABLE} as action`)
      .select(BASE_COLUMNS)
      .where('action.instructor_id', instructorId)
      .orderBy('action.priority', 'asc')
      .orderBy('action.due_at', 'asc')
      .orderBy('action.created_at', 'desc');
    if (status && status !== 'all') {
      query.andWhere('action.status', status);
    }
    if (limit && Number.isFinite(Number(limit))) {
      query.limit(Number(limit));
    }
    const rows = await query;
    return rows.map(deserialize).filter(Boolean);
  }

  static async findByPublicId(publicId, connection = db) {
    if (!publicId) {
      return null;
    }
    const row = await connection(`${TABLE} as action`)
      .select(BASE_COLUMNS)
      .where('action.public_id', publicId)
      .first();
    return deserialize(row);
  }

  static async findById(id, connection = db) {
    if (!id) {
      return null;
    }
    const row = await connection(`${TABLE} as action`).select(BASE_COLUMNS).where('action.id', id).first();
    return deserialize(row);
  }

  static async create(action, connection = db) {
    const payload = {
      public_id: action.publicId ?? null,
      instructor_id: action.instructorId,
      title: action.title,
      description: action.description ?? null,
      action_type: action.actionType ?? 'generic',
      status: action.status ?? 'pending',
      priority: action.priority ?? 3,
      due_at: action.dueAt ?? null,
      requires_sync: action.requiresSync ? 1 : 0,
      last_synced_at: action.lastSyncedAt ?? null,
      completed_at: action.completedAt ?? null,
      metadata: JSON.stringify(action.metadata ?? {})
    };
    if (!payload.public_id) {
      delete payload.public_id;
    }
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates = {}, connection = db) {
    if (!id) {
      return this.findById(id, connection);
    }
    const payload = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description ?? null;
    if (updates.actionType !== undefined) payload.action_type = updates.actionType ?? 'generic';
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.dueAt !== undefined) payload.due_at = updates.dueAt ?? null;
    if (updates.requiresSync !== undefined) payload.requires_sync = updates.requiresSync ? 1 : 0;
    if (updates.lastSyncedAt !== undefined) payload.last_synced_at = updates.lastSyncedAt ?? null;
    if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt ?? null;
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE).where({ id }).update(payload);
    return this.findById(id, connection);
  }

  static async deleteById(id, connection = db) {
    if (!id) {
      return;
    }
    await connection(TABLE).where({ id }).del();
  }
}
