import db from '../config/database.js';

const TABLE = 'course_progress';

const BASE_COLUMNS = [
  'id',
  'enrollment_id as enrollmentId',
  'lesson_id as lessonId',
  'completed',
  'completed_at as completedAt',
  'progress_percent as progressPercent',
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

  static deserialize(record) {
    return {
      ...record,
      completed: Boolean(record.completed),
      metadata: parseJson(record.metadata),
      completedAt: toDate(record.completedAt),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }
}
