import slugify from 'slugify';

import db from '../config/database.js';
import CourseVersionSnapshotModel from './CourseVersionSnapshotModel.js';
import { normaliseClusterKey } from '../utils/learningClusters.js';

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
  'cluster_key as clusterKey',
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

function incrementCount(map, rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return;
  }
  const value = String(rawValue).trim();
  if (!value) {
    return;
  }
  map.set(value, (map.get(value) ?? 0) + 1);
}

function incrementFromArray(map, values) {
  if (!Array.isArray(values)) {
    return;
  }
  values.forEach((entry) => incrementCount(map, entry));
}

function toSortedCountList(map, { limit } = {}) {
  const entries = Array.from(map.entries()).sort((a, b) => {
    if (b[1] === a[1]) {
      return a[0].localeCompare(b[0]);
    }
    return b[1] - a[1];
  });

  const sliced = typeof limit === 'number' && limit > 0 ? entries.slice(0, limit) : entries;
  return sliced.map(([value, count]) => ({ value, count }));
}

export function buildCatalogueFilterSnapshot(rows, { tagLimit = 60 } = {}) {
  const categoryCounts = new Map();
  const levelCounts = new Map();
  const languageCounts = new Map();
  const deliveryCounts = new Map();
  const tagCounts = new Map();
  const skillCounts = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const metadata = parseJson(row?.metadata, {});
    const defaultCategory = metadata.defaultCategory ?? metadata.category ?? null;
    const defaultLevel = metadata.defaultLevel ?? metadata.level ?? null;
    const defaultDelivery = metadata.defaultDeliveryFormat ?? metadata.deliveryFormat ?? null;

    incrementCount(categoryCounts, row?.category ?? defaultCategory);
    incrementCount(levelCounts, row?.level ?? defaultLevel);
    incrementCount(deliveryCounts, row?.deliveryFormat ?? defaultDelivery);

    incrementFromArray(languageCounts, parseStringArray(row?.languages));
    incrementFromArray(tagCounts, parseStringArray(row?.tags));
    incrementFromArray(skillCounts, parseStringArray(row?.skills));
  });

  const now = new Date();

  return {
    generatedAt: now.toISOString(),
    totals: {
      coursesEvaluated: Array.isArray(rows) ? rows.length : 0
    },
    categories: toSortedCountList(categoryCounts),
    levels: toSortedCountList(levelCounts),
    deliveryFormats: toSortedCountList(deliveryCounts),
    languages: toSortedCountList(languageCounts),
    tags: toSortedCountList(tagCounts, { limit: tagLimit }),
    skills: toSortedCountList(skillCounts, { limit: tagLimit })
  };
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

  static async getCatalogueFilters({ includeUnpublished = false, tagLimit = 60 } = {}, connection = db) {
    const query = connection(TABLE).select(
      'category',
      'level',
      'languages',
      'tags',
      'skills',
      'delivery_format as deliveryFormat',
      'metadata'
    );

    if (!includeUnpublished) {
      query.where('status', 'published');
    }

    const rows = await query;
    return buildCatalogueFilterSnapshot(rows, { tagLimit });
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
      cluster_key: normaliseClusterKey(course.clusterKey),
      metadata: serialiseJson(course.metadata ?? {}, {})
    };

    const [id] = await connection(TABLE).insert(payload);
    const created = await this.findById(id, connection);
    if (created) {
      await CourseVersionSnapshotModel.recordInitial(created, connection, {
        actorId: course.createdBy ?? course.instructorId ?? null
      });
    }
    return created;
  }

  static async updateById(id, updates = {}, connection = db) {
    const existing = await this.findById(id, connection);
    if (!existing) {
      return null;
    }

    const { changeSummary, updatedBy, ...courseUpdates } = updates ?? {};
    const payload = {};
    if (courseUpdates.title !== undefined) payload.title = courseUpdates.title;
    if (courseUpdates.slug !== undefined)
      payload.slug = this.normaliseSlug(courseUpdates.slug, courseUpdates.title ?? existing.title);
    if (courseUpdates.summary !== undefined) payload.summary = courseUpdates.summary ?? null;
    if (courseUpdates.description !== undefined) payload.description = courseUpdates.description ?? null;
    if (courseUpdates.level !== undefined) payload.level = courseUpdates.level ?? 'beginner';
    if (courseUpdates.category !== undefined) payload.category = courseUpdates.category ?? 'general';
    if (courseUpdates.skills !== undefined) payload.skills = serialiseArray(courseUpdates.skills ?? []);
    if (courseUpdates.tags !== undefined) payload.tags = serialiseArray(courseUpdates.tags ?? []);
    if (courseUpdates.languages !== undefined)
      payload.languages = serialiseArray(courseUpdates.languages ?? ['en']);
    if (courseUpdates.deliveryFormat !== undefined)
      payload.delivery_format = courseUpdates.deliveryFormat ?? 'self_paced';
    if (courseUpdates.thumbnailUrl !== undefined) payload.thumbnail_url = courseUpdates.thumbnailUrl ?? null;
    if (courseUpdates.heroImageUrl !== undefined) payload.hero_image_url = courseUpdates.heroImageUrl ?? null;
    if (courseUpdates.trailerUrl !== undefined) payload.trailer_url = courseUpdates.trailerUrl ?? null;
    if (courseUpdates.promoVideoUrl !== undefined) payload.promo_video_url = courseUpdates.promoVideoUrl ?? null;
    if (courseUpdates.syllabusUrl !== undefined) payload.syllabus_url = courseUpdates.syllabusUrl ?? null;
    if (courseUpdates.priceCurrency !== undefined)
      payload.price_currency = courseUpdates.priceCurrency ?? 'USD';
    if (courseUpdates.priceAmount !== undefined) payload.price_amount = courseUpdates.priceAmount ?? 0;
    if (courseUpdates.ratingAverage !== undefined) payload.rating_average = courseUpdates.ratingAverage ?? 0;
    if (courseUpdates.ratingCount !== undefined) payload.rating_count = courseUpdates.ratingCount ?? 0;
    if (courseUpdates.enrolmentCount !== undefined)
      payload.enrolment_count = courseUpdates.enrolmentCount ?? 0;
    if (courseUpdates.isPublished !== undefined) payload.is_published = courseUpdates.isPublished;
    if (courseUpdates.releaseAt !== undefined) payload.release_at = courseUpdates.releaseAt ?? null;
    if (courseUpdates.status !== undefined) payload.status = courseUpdates.status;
    if (courseUpdates.metadata !== undefined)
      payload.metadata = serialiseJson(courseUpdates.metadata ?? {}, {});
    if (courseUpdates.clusterKey !== undefined)
      payload.cluster_key = normaliseClusterKey(courseUpdates.clusterKey);
    if (courseUpdates.instructorId !== undefined) payload.instructor_id = courseUpdates.instructorId;

    if (Object.keys(payload).length === 0) {
      return existing;
    }

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });
    const updated = await this.findById(id, connection);
    if (updated) {
      await CourseVersionSnapshotModel.recordChange(
        {
          courseId: id,
          previous: existing,
          next: updated,
          actorId: updatedBy ?? null,
          changeSummary: changeSummary ?? null
        },
        connection
      );
    }
    return updated;
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
      clusterKey: record.clusterKey ? normaliseClusterKey(record.clusterKey) : 'general',
      releaseAt: toDate(record.releaseAt),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt),
      isPublished: Boolean(record.isPublished)
    };
  }
}
