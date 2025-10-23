import db from '../config/database.js';

const TABLE = 'course_progress';

const BASE_COLUMNS = [
  'id',
  'enrollment_id as enrollmentId',
  'lesson_id as lessonId',
  'completed',
  'completed_at as completedAt',
  'progress_percent as progressPercent',
  'progress_source as progressSource',
  'progress_metadata as progressMetadata',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_error) {
      return {};
    }
  }
  return value && typeof value === 'object' ? value : {};
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default class CourseProgressModel {
  static async listByEnrollmentIds(enrollmentIds, connection = db) {
    if (!enrollmentIds?.length) return [];
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .whereIn('enrollment_id', enrollmentIds)
      .orderBy('enrollment_id', 'asc')
      .orderBy('lesson_id', 'asc');
    return rows.map((row) => this.deserialize(row));
  }

  static async findByEnrollmentAndLesson(enrollmentId, lessonId, connection = db) {
    if (!enrollmentId || !lessonId) {
      return null;
    }
    const record = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where('enrollment_id', enrollmentId)
      .andWhere('lesson_id', lessonId)
      .first();
    return record ? this.deserialize(record) : null;
  }

  static async upsertProgress(
    { enrollmentId, lessonId, completed = false, progressPercent = 0, progressSource = 'manual', progressMetadata = {}, metadata = {} },
    connection = db
  ) {
    if (!enrollmentId || !lessonId) {
      throw new Error('Progress payload missing enrollment or lesson identifier');
    }

    const baseProgressPercent = Math.max(0, Math.min(100, Number(progressPercent) || 0));
    const payload = {
      completed: Boolean(completed),
      completed_at: completed ? connection.fn.now() : null,
      progress_percent: baseProgressPercent,
      progress_source: progressSource,
      progress_metadata: JSON.stringify(progressMetadata ?? {}),
      metadata: JSON.stringify(metadata ?? {})
    };

    const existing = await this.findByEnrollmentAndLesson(enrollmentId, lessonId, connection);
    if (existing) {
      const mergedProgressMetadata = {
        ...(existing.progressMetadata ?? {}),
        ...(progressMetadata ?? {})
      };
      const mergedMetadata = {
        ...(existing.metadata ?? {}),
        ...(metadata ?? {})
      };
      await connection(TABLE)
        .where('id', existing.id)
        .update({
          ...payload,
          completed_at: completed
            ? existing.completedAt ?? connection.fn.now()
            : null,
          progress_metadata: JSON.stringify(mergedProgressMetadata),
          metadata: JSON.stringify(mergedMetadata),
          updated_at: connection.fn.now()
        });
      return this.findByEnrollmentAndLesson(enrollmentId, lessonId, connection);
    }

    const [id] = await connection(TABLE).insert({
      enrollment_id: enrollmentId,
      lesson_id: lessonId,
      ...payload,
      completed_at: completed ? connection.fn.now() : null
    });

    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    if (!id) return null;
    const record = await connection(TABLE).select(BASE_COLUMNS).where('id', id).first();
    return record ? this.deserialize(record) : null;
  }

  static async countCompletion(enrollmentId, connection = db) {
    if (!enrollmentId) {
      return { completed: 0, total: 0 };
    }

    const totalQuery = connection(TABLE)
      .count('* as total')
      .where('enrollment_id', enrollmentId);
    const completedQuery = connection(TABLE)
      .count('* as completed')
      .where('enrollment_id', enrollmentId)
      .andWhere('completed', true);

    const [totalResult, completedResult] = await Promise.all([totalQuery.first(), completedQuery.first()]);

    return {
      total: Number(totalResult?.total ?? 0),
      completed: Number(completedResult?.completed ?? 0)
    };
  }

  static deserialize(record) {
    return {
      ...record,
      completed: Boolean(record.completed),
      progressSource: record.progressSource ?? 'manual',
      progressMetadata: parseJson(record.progressMetadata),
      metadata: parseJson(record.metadata),
      completedAt: toDate(record.completedAt),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }
}
