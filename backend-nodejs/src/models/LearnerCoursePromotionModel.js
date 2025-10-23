import db from '../config/database.js';

const TABLE = 'learner_course_promotions';

function parseJson(value, fallback = {}) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function toDomain(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    promotionUuid: row.promotion_uuid,
    courseId: row.course_id,
    slug: row.slug,
    headline: row.headline,
    caption: row.caption,
    body: row.body,
    actionLabel: row.action_label,
    actionHref: row.action_href,
    priority: row.priority ?? 0,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class LearnerCoursePromotionModel {
  static deserialize(row) {
    return toDomain(row);
  }

  static async listActive({ courseIds = [], now = new Date() } = {}, connection = db) {
    const referenceDate = now instanceof Date ? now : new Date(now ?? Date.now());

    const query = connection(TABLE)
      .where({ status: 'active' })
      .andWhere((builder) => {
        builder.whereNull('starts_at').orWhere('starts_at', '<=', referenceDate);
      })
      .andWhere((builder) => {
        builder.whereNull('ends_at').orWhere('ends_at', '>=', referenceDate);
      })
      .orderBy('priority', 'desc')
      .orderBy('updated_at', 'desc');

    const uniqueCourseIds = Array.isArray(courseIds)
      ? Array.from(new Set(courseIds.filter((id) => id !== null && id !== undefined)))
      : [];

    if (uniqueCourseIds.length > 0) {
      query.whereIn('course_id', uniqueCourseIds);
    }

    const rows = await query.select([
      'id',
      'promotion_uuid',
      'course_id',
      'slug',
      'headline',
      'caption',
      'body',
      'action_label',
      'action_href',
      'priority',
      'status',
      'starts_at',
      'ends_at',
      'metadata',
      'created_at',
      'updated_at'
    ]);

    return rows.map(toDomain).filter(Boolean);
  }
}
