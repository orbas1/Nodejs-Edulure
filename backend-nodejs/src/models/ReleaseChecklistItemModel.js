import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'release_checklist_items';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'slug',
  'category',
  'title',
  'description',
  'auto_evaluated as autoEvaluated',
  'weight',
  'default_owner_email as defaultOwnerEmail',
  'success_criteria as successCriteria',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value, fallback) {
  if (!value) {
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

function serialiseJson(value, fallback) {
  if (value === undefined || value === null) {
    return JSON.stringify(fallback);
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

function extractCount(row) {
  if (!row) {
    return 0;
  }

  const value =
    row.count ??
    row['count(*)'] ??
    row['COUNT(*)'] ??
    row['count(`*`)'] ??
    Object.values(row)[0];

  return Number(value ?? 0);
}

function deserialize(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    publicId: row.publicId,
    slug: row.slug,
    category: row.category,
    title: row.title,
    description: row.description,
    autoEvaluated: Boolean(row.autoEvaluated),
    weight: Number.parseInt(row.weight ?? 0, 10) || 0,
    defaultOwnerEmail: row.defaultOwnerEmail,
    successCriteria: parseJson(row.successCriteria, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toDbPayload(item) {
  return {
    public_id: item.publicId ?? randomUUID(),
    slug: item.slug,
    category: item.category ?? 'quality',
    title: item.title,
    description: item.description,
    auto_evaluated: item.autoEvaluated ?? false,
    weight: Number.parseInt(item.weight ?? 1, 10) || 1,
    default_owner_email: item.defaultOwnerEmail ?? null,
    success_criteria: serialiseJson(item.successCriteria ?? {}, {})
  };
}

export default class ReleaseChecklistItemModel {
  static deserialize = deserialize;

  static async create(item, connection = db) {
    const payload = toDbPayload(item);
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return row ? deserialize(row) : null;
  }

  static async findBySlug(slug, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ slug }).first();
    return row ? deserialize(row) : null;
  }

  static async findByPublicId(publicId, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ public_id: publicId }).first();
    return row ? deserialize(row) : null;
  }

  static async updateBySlug(slug, updates, connection = db) {
    const payload = {};
    if (updates.category !== undefined) {
      payload.category = updates.category;
    }
    if (updates.title !== undefined) {
      payload.title = updates.title;
    }
    if (updates.description !== undefined) {
      payload.description = updates.description;
    }
    if (updates.autoEvaluated !== undefined) {
      payload.auto_evaluated = updates.autoEvaluated;
    }
    if (updates.weight !== undefined) {
      payload.weight = Number.parseInt(updates.weight ?? 1, 10) || 1;
    }
    if (updates.defaultOwnerEmail !== undefined) {
      payload.default_owner_email = updates.defaultOwnerEmail ?? null;
    }
    if (updates.successCriteria !== undefined) {
      payload.success_criteria = serialiseJson(updates.successCriteria, {});
    }

    if (!Object.keys(payload).length) {
      return this.findBySlug(slug, connection);
    }

    await connection(TABLE)
      .where({ slug })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findBySlug(slug, connection);
  }

  static async list(filters = {}, pagination = {}, connection = db) {
    const { category } = filters;
    const limit = Math.max(1, Math.min(500, Number.parseInt(pagination.limit ?? 50, 10)));
    const offset = Math.max(0, Number.parseInt(pagination.offset ?? 0, 10));

    const query = connection(TABLE).select(BASE_COLUMNS);
    const countQuery = connection(TABLE).count({ count: '*' });

    if (category) {
      const categories = Array.isArray(category) ? category : [category];
      query.whereIn('category', categories);
      countQuery.whereIn('category', categories);
    }

    const rows = await query.orderBy([{ column: 'weight', order: 'desc' }, { column: 'slug', order: 'asc' }]).limit(limit).offset(offset);
    const countRow = await countQuery.first();

    return {
      total: extractCount(countRow),
      limit,
      offset,
      items: rows.map(deserialize)
    };
  }
}
