import db from '../config/database.js';

const TABLE = 'learning_offline_module_snapshots';

function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function serialiseJson(value) {
  if (!value) {
    return JSON.stringify({});
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return JSON.stringify({});
  }
}

function mapRecord(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    userId: record.user_id,
    courseId: record.course_id,
    moduleId: record.module_id,
    coursePublicId: record.course_public_id,
    moduleSlug: record.module_slug,
    completionRatio: toNumber(record.completion_ratio),
    notes: record.notes ?? null,
    metadata: parseJson(record.metadata),
    capturedAt: toDate(record.captured_at),
    createdAt: toDate(record.created_at),
    updatedAt: toDate(record.updated_at)
  };
}

export default class LearningOfflineModuleSnapshotModel {
  static async listByUserId(userId, connection = db) {
    if (!userId) {
      return [];
    }

    const rows = await connection(TABLE)
      .select([
        'id',
        'user_id',
        'course_id',
        'module_id',
        'course_public_id',
        'module_slug',
        'completion_ratio',
        'notes',
        'metadata',
        'captured_at',
        'created_at',
        'updated_at'
      ])
      .where({ user_id: userId })
      .orderBy('captured_at', 'desc');

    return rows.map((row) => mapRecord(row));
  }

  static async upsertSnapshot(userId, coursePublicId, moduleSlug, input, connection = db) {
    if (!userId || !coursePublicId || !moduleSlug) {
      throw new Error('userId, coursePublicId, and moduleSlug are required to upsert offline module snapshots.');
    }

    const payload = {
      user_id: userId,
      course_id: input.courseId ?? null,
      module_id: input.moduleId ?? null,
      course_public_id: coursePublicId,
      module_slug: moduleSlug,
      completion_ratio: toNumber(input.completionRatio ?? 0),
      notes: input.notes ?? null,
      metadata: serialiseJson(input.metadata ?? {}),
      captured_at: input.capturedAt ?? connection.fn.now()
    };

    await connection(TABLE)
      .insert(payload)
      .onConflict(['user_id', 'course_public_id', 'module_slug'])
      .merge({
        course_id: payload.course_id,
        module_id: payload.module_id,
        completion_ratio: payload.completion_ratio,
        notes: payload.notes,
        metadata: payload.metadata,
        captured_at: payload.captured_at,
        updated_at: connection.fn.now()
      });

    return connection(TABLE)
      .select([
        'id',
        'user_id',
        'course_id',
        'module_id',
        'course_public_id',
        'module_slug',
        'completion_ratio',
        'notes',
        'metadata',
        'captured_at',
        'created_at',
        'updated_at'
      ])
      .where({ user_id: userId, course_public_id: coursePublicId, module_slug: moduleSlug })
      .first()
      .then((row) => mapRecord(row));
  }
}
