import db from '../config/database.js';

const TABLE = 'courses';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'instructor_id as instructorId',
  'title',
  'slug',
  'summary',
  'description',
  'level',
  'category',
  'skills',
  'tags',
  'languages',
  'delivery_format as deliveryFormat',
  'thumbnail_url as thumbnailUrl',
  'price_currency as priceCurrency',
  'price_amount as priceAmount',
  'rating_average as ratingAverage',
  'rating_count as ratingCount',
  'enrolment_count as enrolmentCount',
  'is_published as isPublished',
  'release_at as releaseAt',
  'status',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return structuredClone(fallback);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(fallback)) {
        return Array.isArray(parsed) ? parsed : structuredClone(fallback);
      }
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...fallback, ...parsed };
      }
      return structuredClone(fallback);
    } catch (_error) {
      return structuredClone(fallback);
    }
  }
  if (Array.isArray(fallback)) {
    return Array.isArray(value) ? value : structuredClone(fallback);
  }
  if (typeof value === 'object' && value !== null) {
    return { ...fallback, ...value };
  }
  return structuredClone(fallback);
}

function parseStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (_error) {
      const parts = value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
      return parts;
    }
  }
  return [];
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default class CourseModel {
  static async listByInstructor(
    instructorId,
    { includeArchived = false, includeDrafts = true, limit = 50, offset = 0 } = {},
    connection = db
  ) {
    const query = connection(TABLE).select(BASE_COLUMNS).where('instructor_id', instructorId);

    if (!includeDrafts) {
      query.whereIn('status', ['published']);
    }

    if (!includeArchived) {
      query.whereNot('status', 'archived');
    }

    const rows = await query.orderBy('updated_at', 'desc').limit(limit).offset(offset);
    return rows.map((row) => this.deserialize(row));
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return row ? this.deserialize(row) : null;
  }

  static async listByIds(ids, connection = db) {
    if (!ids?.length) {
      return [];
    }
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .whereIn('id', ids)
      .orderBy('updated_at', 'desc');
    return rows.map((row) => this.deserialize(row));
  }

  static async listPublished({ limit = 10, excludeIds = [] } = {}, connection = db) {
    const query = connection(TABLE)
      .select(BASE_COLUMNS)
      .where('status', 'published')
      .orderBy('rating_average', 'desc')
      .orderBy('updated_at', 'desc')
      .limit(limit);

    if (excludeIds?.length) {
      query.whereNotIn('id', excludeIds);
    }

    const rows = await query;
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(record) {
    return {
      ...record,
      skills: parseStringArray(record.skills),
      tags: parseStringArray(record.tags),
      languages: parseStringArray(record.languages),
      metadata: parseJson(record.metadata, {}),
      releaseAt: toDate(record.releaseAt),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt),
      isPublished: Boolean(record.isPublished)
    };
  }
}
