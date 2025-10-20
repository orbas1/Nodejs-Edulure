import slugify from 'slugify';

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
  'hero_image_url as heroImageUrl',
  'trailer_url as trailerUrl',
  'promo_video_url as promoVideoUrl',
  'syllabus_url as syllabusUrl',
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

function serialiseArray(value, fallback = []) {
  if (value === null || value === undefined) {
    return JSON.stringify(fallback);
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return JSON.stringify(fallback);
}

function serialiseJson(value, fallback = {}) {
  if (value === null || value === undefined) {
    return JSON.stringify(fallback);
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default class CourseModel {
  static normaliseSlug(value, fallback) {
    const base = value || fallback;
    if (!base) {
      return null;
    }
    return slugify(base, { lower: true, strict: true });
  }

  static async listAll({ search, status, limit = 50, offset = 0 } = {}, connection = db) {
    const query = connection(TABLE)
      .select(BASE_COLUMNS)
      .orderBy('updated_at', 'desc');

    if (status) {
      query.andWhere('status', status);
    }

    if (search) {
      query.andWhere((builder) => {
        builder
          .whereILike('title', `%${search}%`)
          .orWhereILike('slug', `%${search}%`)
          .orWhereILike('description', `%${search}%`);
      });
    }

    const rows = await query.limit(limit).offset(offset);
    return rows.map((row) => this.deserialize(row));
  }

  static async countAll({ search, status } = {}, connection = db) {
    const query = connection(TABLE);

    if (status) {
      query.andWhere('status', status);
    }

    if (search) {
      query.andWhere((builder) => {
        builder
          .whereILike('title', `%${search}%`)
          .orWhereILike('slug', `%${search}%`)
          .orWhereILike('description', `%${search}%`);
      });
    }

    const result = await query.count({ total: '*' }).first();
    return Number(result?.total ?? 0);
  }

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

  static async listPublished(
    { limit = 10, offset = 0, excludeIds = [], search } = {},
    connection = db
  ) {
    const query = connection(TABLE)
      .select(BASE_COLUMNS)
      .where('status', 'published')
      .orderBy('rating_average', 'desc')
      .orderBy('updated_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (excludeIds?.length) {
      query.whereNotIn('id', excludeIds);
    }

    if (search) {
      query.andWhere((builder) => {
        builder
          .whereILike('title', `%${search}%`)
          .orWhereILike('slug', `%${search}%`)
          .orWhereILike('description', `%${search}%`)
          .orWhereILike('summary', `%${search}%`);
      });
    }

    const rows = await query;
    return rows.map((row) => this.deserialize(row));
  }

  static async create(course, connection = db) {
    const payload = {
      public_id: course.publicId,
      instructor_id: course.instructorId,
      title: course.title,
      slug: this.normaliseSlug(course.slug, course.title),
      summary: course.summary ?? null,
      description: course.description ?? null,
      level: course.level ?? 'beginner',
      category: course.category ?? 'general',
      skills: serialiseArray(course.skills ?? []),
      tags: serialiseArray(course.tags ?? []),
      languages: serialiseArray(course.languages ?? ['en']),
      delivery_format: course.deliveryFormat ?? 'self_paced',
      thumbnail_url: course.thumbnailUrl ?? null,
      hero_image_url: course.heroImageUrl ?? null,
      trailer_url: course.trailerUrl ?? null,
      promo_video_url: course.promoVideoUrl ?? null,
      syllabus_url: course.syllabusUrl ?? null,
      price_currency: course.priceCurrency ?? 'USD',
      price_amount: course.priceAmount ?? 0,
      rating_average: course.ratingAverage ?? 0,
      rating_count: course.ratingCount ?? 0,
      enrolment_count: course.enrolmentCount ?? 0,
      is_published: course.isPublished ?? false,
      release_at: course.releaseAt ?? null,
      status: course.status ?? 'draft',
      metadata: serialiseJson(course.metadata ?? {}, {})
    };

    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.slug !== undefined) payload.slug = this.normaliseSlug(updates.slug, updates.title);
    if (updates.summary !== undefined) payload.summary = updates.summary ?? null;
    if (updates.description !== undefined) payload.description = updates.description ?? null;
    if (updates.level !== undefined) payload.level = updates.level ?? 'beginner';
    if (updates.category !== undefined) payload.category = updates.category ?? 'general';
    if (updates.skills !== undefined) payload.skills = serialiseArray(updates.skills ?? []);
    if (updates.tags !== undefined) payload.tags = serialiseArray(updates.tags ?? []);
    if (updates.languages !== undefined) payload.languages = serialiseArray(updates.languages ?? ['en']);
    if (updates.deliveryFormat !== undefined) payload.delivery_format = updates.deliveryFormat ?? 'self_paced';
    if (updates.thumbnailUrl !== undefined) payload.thumbnail_url = updates.thumbnailUrl ?? null;
    if (updates.heroImageUrl !== undefined) payload.hero_image_url = updates.heroImageUrl ?? null;
    if (updates.trailerUrl !== undefined) payload.trailer_url = updates.trailerUrl ?? null;
    if (updates.promoVideoUrl !== undefined) payload.promo_video_url = updates.promoVideoUrl ?? null;
    if (updates.syllabusUrl !== undefined) payload.syllabus_url = updates.syllabusUrl ?? null;
    if (updates.priceCurrency !== undefined) payload.price_currency = updates.priceCurrency ?? 'USD';
    if (updates.priceAmount !== undefined) payload.price_amount = updates.priceAmount ?? 0;
    if (updates.ratingAverage !== undefined) payload.rating_average = updates.ratingAverage ?? 0;
    if (updates.ratingCount !== undefined) payload.rating_count = updates.ratingCount ?? 0;
    if (updates.enrolmentCount !== undefined) payload.enrolment_count = updates.enrolmentCount ?? 0;
    if (updates.isPublished !== undefined) payload.is_published = updates.isPublished;
    if (updates.releaseAt !== undefined) payload.release_at = updates.releaseAt ?? null;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.metadata !== undefined) payload.metadata = serialiseJson(updates.metadata ?? {}, {});
    if (updates.instructorId !== undefined) payload.instructor_id = updates.instructorId;

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async deleteById(id, connection = db) {
    await connection('course_assignments').where({ course_id: id }).del();
    await connection('course_lessons').where({ course_id: id }).del();
    await connection('course_modules').where({ course_id: id }).del();
    await connection('course_progress').whereIn(
      'enrollment_id',
      connection('course_enrollments').select('id').where({ course_id: id })
    );
    await connection('course_enrollments').where({ course_id: id }).del();
    await connection(TABLE).where({ id }).del();
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
