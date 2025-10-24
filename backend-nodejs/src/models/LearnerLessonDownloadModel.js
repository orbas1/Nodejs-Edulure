import db from '../config/database.js';

const TABLE = 'learner_lesson_downloads';

const BASE_COLUMNS = [
  'downloads.id',
  'downloads.user_id as userId',
  'downloads.course_id as courseId',
  'downloads.module_id as moduleId',
  'downloads.lesson_id as lessonId',
  'downloads.status',
  'downloads.progress_percent as progressPercent',
  'downloads.manifest_url as manifestUrl',
  'downloads.checksum_sha256 as checksumSha256',
  'downloads.error_message as errorMessage',
  'downloads.enqueued_at as enqueuedAt',
  'downloads.started_at as startedAt',
  'downloads.completed_at as completedAt',
  'downloads.metadata',
  'downloads.created_at as createdAt',
  'downloads.updated_at as updatedAt'
];

const STATUSES = new Set(['queued', 'running', 'completed', 'failed', 'cancelled']);

function parseJson(value, fallback = {}) {
  if (value === null || value === undefined) {
    return structuredClone(fallback);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
      return structuredClone(fallback);
    } catch (_error) {
      return structuredClone(fallback);
    }
  }
  if (typeof value === 'object') {
    return { ...fallback, ...value };
  }
  return structuredClone(fallback);
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateInput(value) {
  const parsed = toDate(value);
  return parsed ? parsed : null;
}

function resolveStatus(value) {
  const candidate = typeof value === 'string' ? value.toLowerCase() : value;
  if (typeof candidate === 'string' && STATUSES.has(candidate)) {
    return candidate;
  }
  return 'queued';
}

export default class LearnerLessonDownloadModel {
  static async listForUser(userId, { statuses, courseIds } = {}, connection = db) {
    if (!userId) return [];
    const query = connection(`${TABLE} as downloads`)
      .select(BASE_COLUMNS)
      .where('downloads.user_id', userId)
      .orderBy('downloads.enqueued_at', 'desc')
      .orderBy('downloads.id', 'desc');

    if (Array.isArray(statuses) && statuses.length > 0) {
      const allowed = statuses.map((status) => resolveStatus(status));
      query.whereIn('downloads.status', allowed);
    }

    if (Array.isArray(courseIds) && courseIds.length > 0) {
      query.whereIn('downloads.course_id', courseIds);
    }

    const rows = await query;
    return rows.map((record) => this.deserialize(record));
  }

  static deserialize(record) {
    if (!record) {
      return null;
    }

    return {
      id: record.id,
      userId: record.userId,
      courseId: record.courseId,
      moduleId: record.moduleId,
      lessonId: record.lessonId,
      status: resolveStatus(record.status),
      progressPercent: Number.isFinite(Number(record.progressPercent))
        ? Number(record.progressPercent)
        : 0,
      manifestUrl: record.manifestUrl ?? null,
      checksumSha256: record.checksumSha256 ?? null,
      errorMessage: record.errorMessage ?? null,
      enqueuedAt: toDate(record.enqueuedAt),
      startedAt: toDate(record.startedAt),
      completedAt: toDate(record.completedAt),
      metadata: parseJson(record.metadata, {}),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }

  static serialize(payload = {}) {
    const status = resolveStatus(payload.status);
    return {
      id: payload.id,
      user_id: payload.userId,
      course_id: payload.courseId,
      module_id: payload.moduleId,
      lesson_id: payload.lessonId,
      status,
      progress_percent: Number.isFinite(Number(payload.progressPercent))
        ? Number(payload.progressPercent)
        : 0,
      manifest_url: payload.manifestUrl ?? null,
      checksum_sha256: payload.checksumSha256 ?? null,
      error_message: payload.errorMessage ?? null,
      enqueued_at: toDateInput(payload.enqueuedAt) ?? new Date(),
      started_at: toDateInput(payload.startedAt),
      completed_at: toDateInput(payload.completedAt),
      metadata: JSON.stringify(payload.metadata ?? {})
    };
  }

  static async upsertMany(downloads, connection = db) {
    if (!Array.isArray(downloads) || downloads.length === 0) {
      return 0;
    }

    let count = 0;
    for (const download of downloads) {
      if (!download?.id) {
        continue;
      }
      const record = this.serialize(download);
      await connection(TABLE)
        .insert(record)
        .onConflict('id')
        .merge({
          user_id: record.user_id,
          course_id: record.course_id,
          module_id: record.module_id,
          lesson_id: record.lesson_id,
          status: record.status,
          progress_percent: record.progress_percent,
          manifest_url: record.manifest_url,
          checksum_sha256: record.checksum_sha256,
          error_message: record.error_message,
          enqueued_at: record.enqueued_at,
          started_at: record.started_at,
          completed_at: record.completed_at,
          metadata: record.metadata,
          updated_at: connection.fn.now()
        });
      count += 1;
    }

    return count;
  }
}
