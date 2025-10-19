import db from '../config/database.js';

const TABLE = 'course_lessons';

const BASE_COLUMNS = [
  'id',
  'course_id as courseId',
  'module_id as moduleId',
  'asset_id as assetId',
  'title',
  'slug',
  'position',
  'duration_minutes as durationMinutes',
  'release_at as releaseAt',
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

export default class CourseLessonModel {
  static async listByCourseIds(courseIds, connection = db) {
    if (!courseIds?.length) return [];
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .whereIn('course_id', courseIds)
      .orderBy('course_id', 'asc')
      .orderBy('module_id', 'asc')
      .orderBy('position', 'asc');
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(record) {
    return {
      ...record,
      metadata: parseJson(record.metadata),
      releaseAt: toDate(record.releaseAt),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }
}
