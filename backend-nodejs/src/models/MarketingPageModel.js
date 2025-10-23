import db from '../config/database.js';

const PAGE_TABLE = 'marketing_pages';

const PAGE_COLUMNS = [
  'id',
  'slug',
  'title',
  'status',
  'description',
  'default_locale as defaultLocale',
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
      if (parsed && typeof parsed === 'object') {
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

  if (value && typeof value === 'object') {
    return { ...fallback, ...value };
  }

  return structuredClone(fallback);
}

export default class MarketingPageModel {
  static deserialize(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      status: row.status,
      description: row.description ?? null,
      defaultLocale: row.defaultLocale ?? 'en',
      metadata: parseJson(row.metadata, {}),
      createdAt: row.createdAt ? new Date(row.createdAt) : null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : null
    };
  }

  static async findBySlug(slug, connection = db) {
    if (!slug) {
      return null;
    }

    const record = await connection(PAGE_TABLE).select(PAGE_COLUMNS).where({ slug }).first();
    return record ? this.deserialize(record) : null;
  }

  static async findPublishedBySlug(slug, connection = db) {
    if (!slug) {
      return null;
    }

    const record = await connection(PAGE_TABLE)
      .select(PAGE_COLUMNS)
      .where({ slug, status: 'published' })
      .first();

    return record ? this.deserialize(record) : null;
  }
}
