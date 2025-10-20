import db from '../config/database.js';
import {
  ensureIntegerInRange,
  ensureNonEmptyString,
  normaliseBoolean,
  normaliseOptionalString,
  normaliseSlug
} from '../utils/modelUtils.js';

const TABLE = 'blog_categories';

const BASE_COLUMNS = [
  'id',
  'slug',
  'name',
  'description',
  'display_order as displayOrder',
  'is_featured as isFeatured',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
    displayOrder: Number(row.displayOrder ?? row.display_order ?? 0),
    isFeatured: Boolean(row.isFeatured ?? row.is_featured ?? false),
    createdAt: row.createdAt ?? row.created_at ?? null,
    updatedAt: row.updatedAt ?? row.updated_at ?? null
  };
}

function buildQuery(connection) {
  return connection(TABLE).select(BASE_COLUMNS);
}

function buildInsertPayload(category) {
  const slug = normaliseSlug(category.slug);
  const name = ensureNonEmptyString(category.name, { fieldName: 'name', maxLength: MAX_NAME_LENGTH });
  const description = normaliseOptionalString(category.description, { maxLength: MAX_DESCRIPTION_LENGTH });
  const displayOrder = ensureIntegerInRange(category.displayOrder, {
    fieldName: 'displayOrder',
    min: 0,
    max: 10000,
    defaultValue: 0
  });
  const isFeatured = normaliseBoolean(category.isFeatured);

  return {
    slug,
    name,
    description,
    display_order: displayOrder,
    is_featured: isFeatured
  };
}

function buildUpdatePayload(updates) {
  const payload = {};

  if (updates.name !== undefined) {
    payload.name = ensureNonEmptyString(updates.name, { fieldName: 'name', maxLength: MAX_NAME_LENGTH });
  }

  if (updates.description !== undefined) {
    payload.description = normaliseOptionalString(updates.description, { maxLength: MAX_DESCRIPTION_LENGTH });
  }

  if (updates.displayOrder !== undefined) {
    payload.display_order = ensureIntegerInRange(updates.displayOrder, {
      fieldName: 'displayOrder',
      min: 0,
      max: 10000,
      defaultValue: 0
    });
  }

  if (updates.isFeatured !== undefined) {
    payload.is_featured = normaliseBoolean(updates.isFeatured);
  }

  return payload;
}

export default class BlogCategoryModel {
  static async list({ includeFeaturedOnly = false, limit } = {}, connection = db) {
    const query = buildQuery(connection).orderBy('display_order', 'asc').orderBy('name', 'asc');

    if (includeFeaturedOnly) {
      query.where({ is_featured: true });
    }

    if (limit !== undefined) {
      const safeLimit = ensureIntegerInRange(limit, {
        fieldName: 'limit',
        min: 1,
        max: 50,
        defaultValue: 10
      });
      query.limit(safeLimit);
    }

    const rows = await query;
    return rows.map(mapRow);
  }

  static async findBySlug(slug, connection = db) {
    const normalisedSlug = normaliseSlug(slug);
    const row = await buildQuery(connection).where({ slug: normalisedSlug }).first();
    return mapRow(row);
  }

  static async findById(id, connection = db) {
    if (!id) {
      return null;
    }
    const row = await buildQuery(connection).where({ id }).first();
    return mapRow(row);
  }

  static async upsert(category, connection = db) {
    const payload = buildInsertPayload(category);
    const existing = await this.findBySlug(payload.slug, connection);

    if (existing) {
      await connection(TABLE)
        .where({ id: existing.id })
        .update({ ...payload, updated_at: connection.fn.now() });

      return this.findBySlug(payload.slug, connection);
    }

    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async updateBySlug(slug, updates, connection = db) {
    const normalisedSlug = normaliseSlug(slug);
    const payload = buildUpdatePayload(updates ?? {});

    if (!Object.keys(payload).length) {
      return this.findBySlug(normalisedSlug, connection);
    }

    await connection(TABLE)
      .where({ slug: normalisedSlug })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findBySlug(normalisedSlug, connection);
  }

  static async reorder(definitions, connection = db) {
    if (!Array.isArray(definitions) || !definitions.length) {
      return 0;
    }

    let updated = 0;

    for (const definition of definitions) {
      const slug = normaliseSlug(definition.slug);
      const displayOrder = ensureIntegerInRange(definition.displayOrder ?? definition.order ?? 0, {
        fieldName: 'displayOrder',
        min: 0,
        max: 10000,
        defaultValue: 0
      });

      const result = await connection(TABLE)
        .where({ slug })
        .update({ display_order: displayOrder, updated_at: connection.fn.now() });

      updated += result ?? 0;
    }

    return updated;
  }

  static async removeBySlug(slug, connection = db) {
    const normalisedSlug = normaliseSlug(slug);
    return connection(TABLE).where({ slug: normalisedSlug }).del();
  }
}
