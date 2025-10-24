import db from '../config/database.js';

const TABLE = 'lesson_progress_sync_queue';

const BASE_COLUMNS = [
  'queue.id',
  'queue.public_id as publicId',
  'queue.enrollment_id as enrollmentId',
  'queue.lesson_id as lessonId',
  'queue.module_id as moduleId',
  'queue.status',
  'queue.progress_percent as progressPercent',
  'queue.requires_review as requiresReview',
  'queue.attempts',
  'queue.last_attempt_at as lastAttemptAt',
  'queue.last_error as lastError',
  'queue.synced_at as syncedAt',
  'queue.completed_at as completedAt',
  'queue.payload',
  'queue.metadata',
  'queue.created_at as createdAt',
  'queue.updated_at as updatedAt'
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

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined) {
    return fallback;
  }
  const num = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(num) ? Number(num) : fallback;
}

function deserialize(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    publicId: row.publicId,
    enrollmentId: row.enrollmentId,
    lessonId: row.lessonId,
    moduleId: row.moduleId,
    status: row.status,
    progressPercent: Number(row.progressPercent ?? 0),
    requiresReview: Boolean(row.requiresReview),
    attempts: toNumber(row.attempts, 0),
    lastAttemptAt: toDate(row.lastAttemptAt),
    lastError: row.lastError ?? null,
    syncedAt: toDate(row.syncedAt),
    completedAt: toDate(row.completedAt),
    payload: parseJson(row.payload),
    metadata: parseJson(row.metadata),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt)
  };
}

export default class LessonProgressSyncQueueModel {
  static async listByEnrollmentId(enrollmentId, { statuses } = {}, connection = db) {
    if (!enrollmentId) {
      return [];
    }
    const query = connection(`${TABLE} as queue`).select(BASE_COLUMNS).where('queue.enrollment_id', enrollmentId);
    if (statuses?.length) {
      query.andWhere((builder) => builder.whereIn('queue.status', statuses));
    }
    const rows = await query.orderBy('queue.created_at', 'asc');
    return rows.map(deserialize).filter(Boolean);
  }

  static async findByPublicId(publicId, connection = db) {
    if (!publicId) {
      return null;
    }
    const row = await connection(`${TABLE} as queue`).select(BASE_COLUMNS).where('queue.public_id', publicId).first();
    return deserialize(row);
  }

  static async findById(id, connection = db) {
    if (!id) {
      return null;
    }
    const row = await connection(`${TABLE} as queue`).select(BASE_COLUMNS).where('queue.id', id).first();
    return deserialize(row);
  }

  static async create(entry, connection = db) {
    const payload = {
      public_id: entry.publicId ?? null,
      enrollment_id: entry.enrollmentId,
      lesson_id: entry.lessonId ?? null,
      module_id: entry.moduleId ?? null,
      status: entry.status ?? 'pending',
      progress_percent: Number(entry.progressPercent ?? 0),
      requires_review: entry.requiresReview ? 1 : 0,
      attempts: toNumber(entry.attempts, 0),
      last_attempt_at: entry.lastAttemptAt ?? null,
      last_error: entry.lastError ?? null,
      synced_at: entry.syncedAt ?? null,
      completed_at: entry.completedAt ?? null,
      payload: JSON.stringify(entry.payload ?? {}),
      metadata: JSON.stringify(entry.metadata ?? {})
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
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.progressPercent !== undefined) payload.progress_percent = Number(updates.progressPercent ?? 0);
    if (updates.requiresReview !== undefined) payload.requires_review = updates.requiresReview ? 1 : 0;
    if (updates.attempts !== undefined) payload.attempts = toNumber(updates.attempts, 0);
    if (updates.lastAttemptAt !== undefined) payload.last_attempt_at = updates.lastAttemptAt ?? null;
    if (updates.lastError !== undefined) payload.last_error = updates.lastError ?? null;
    if (updates.syncedAt !== undefined) payload.synced_at = updates.syncedAt ?? null;
    if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt ?? null;
    if (updates.payload !== undefined) payload.payload = JSON.stringify(updates.payload ?? {});
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});
    if (updates.lessonId !== undefined) payload.lesson_id = updates.lessonId ?? null;
    if (updates.moduleId !== undefined) payload.module_id = updates.moduleId ?? null;

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
