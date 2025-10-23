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
  'certificate_template_id as certificateTemplateId',
  'certificate_issued_at as certificateIssuedAt',
  'certificate_url as certificateUrl',
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
  static async listByUserId(userId, connection = db) {
    if (!userId) return [];
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where('user_id', userId)
      .orderBy('created_at', 'desc');
    return rows.map((row) => this.deserialize(row));
  }

  static async listByCourseIds(courseIds, connection = db) {
    if (!courseIds?.length) return [];
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .whereIn('course_id', courseIds)
      .orderBy('course_id', 'asc')
      .orderBy('created_at', 'asc');
    return rows.map((row) => this.deserialize(row));
  }

  static async findByCourseAndUser(courseId, userId, connection = db) {
    if (!courseId || !userId) {
      return null;
    }
    const record = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where('course_id', courseId)
      .andWhere('user_id', userId)
      .first();
    return record ? this.deserialize(record) : null;
  }

  static async updateById(id, payload, connection = db) {
    if (!id) {
      throw new Error('Enrollment identifier missing for update');
    }
    await connection(TABLE)
      .where('id', id)
      .update({
        ...payload,
        updated_at: connection.fn.now()
      });
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    if (!id) return null;
    const record = await connection(TABLE).select(BASE_COLUMNS).where('id', id).first();
    return record ? this.deserialize(record) : null;
  }

  static deserialize(record) {
    return {
      ...record,
      progressPercent: Number(record.progressPercent ?? 0),
      metadata: parseJson(record.metadata),
      startedAt: toDate(record.startedAt),
      completedAt: toDate(record.completedAt),
      lastAccessedAt: toDate(record.lastAccessedAt),
      certificateIssuedAt: toDate(record.certificateIssuedAt),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }
}
