import db from '../config/database.js';

const TABLE = 'course_enrollments';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'course_id as courseId',
  'user_id as userId',
  'status',
  'progress_percent as progressPercent',
  'started_at as startedAt',
  'completed_at as completedAt',
  'last_accessed_at as lastAccessedAt',
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

export default class CourseEnrollmentModel {
  static async listByCourseIds(courseIds, connection = db) {
    if (!courseIds?.length) return [];
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .whereIn('course_id', courseIds)
      .orderBy('course_id', 'asc')
      .orderBy('created_at', 'asc');
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(record) {
    return {
      ...record,
      progressPercent: Number(record.progressPercent ?? 0),
      metadata: parseJson(record.metadata),
      startedAt: toDate(record.startedAt),
      completedAt: toDate(record.completedAt),
      lastAccessedAt: toDate(record.lastAccessedAt),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }
}
