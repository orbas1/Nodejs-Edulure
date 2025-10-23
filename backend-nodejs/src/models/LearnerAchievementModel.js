import db from '../config/database.js';

const TABLE = 'learner_achievements';

const BASE_COLUMNS = [
  'id',
  'user_id as userId',
  'course_id as courseId',
  'template_id as templateId',
  'status',
  'issued_at as issuedAt',
  'revoked_at as revokedAt',
  'certificate_url as certificateUrl',
  'progress_snapshot as progressSnapshot',
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

export default class LearnerAchievementModel {
  static async listByUserId(userId, connection = db) {
    if (!userId) return [];
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where('user_id', userId)
      .orderBy('issued_at', 'desc');
    return rows.map((row) => this.deserialize(row));
  }

  static async findByUserCourseAndTemplate(userId, courseId, templateId, connection = db) {
    if (!userId || !templateId) return null;
    const query = connection(TABLE)
      .select(BASE_COLUMNS)
      .where('user_id', userId)
      .andWhere('template_id', templateId);
    if (courseId) {
      query.andWhere('course_id', courseId);
    }
    const record = await query.first();
    return record ? this.deserialize(record) : null;
  }

  static async upsertCourseAchievement(payload, connection = db) {
    const {
      userId,
      courseId,
      templateId,
      certificateUrl,
      progressSnapshot = {},
      metadata = {}
    } = payload;
    if (!userId || !templateId) {
      throw new Error('Achievement payload missing required identifiers');
    }

    const existing = await this.findByUserCourseAndTemplate(userId, courseId, templateId, connection);
    if (existing) {
      await connection(TABLE)
        .where('id', existing.id)
        .update({
          status: 'awarded',
          revoked_at: null,
          certificate_url: certificateUrl ?? existing.certificateUrl ?? null,
          progress_snapshot: JSON.stringify(progressSnapshot ?? {}),
          metadata: JSON.stringify({ ...(existing.metadata ?? {}), ...metadata }),
          updated_at: connection.fn.now(),
          issued_at: existing.issuedAt ?? connection.fn.now()
        });
      return {
        ...existing,
        status: 'awarded',
        certificateUrl: certificateUrl ?? existing.certificateUrl ?? null,
        progressSnapshot: { ...(existing.progressSnapshot ?? {}), ...progressSnapshot },
        metadata: { ...(existing.metadata ?? {}), ...metadata }
      };
    }

    const [id] = await connection(TABLE).insert({
      user_id: userId,
      course_id: courseId ?? null,
      template_id: templateId,
      status: 'awarded',
      issued_at: connection.fn.now(),
      certificate_url: certificateUrl ?? null,
      progress_snapshot: JSON.stringify(progressSnapshot ?? {}),
      metadata: JSON.stringify(metadata ?? {})
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
      progressSnapshot: parseJson(record.progressSnapshot),
      metadata: parseJson(record.metadata),
      issuedAt: toDate(record.issuedAt),
      revokedAt: toDate(record.revokedAt),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }
}
