import { randomUUID } from 'node:crypto';

import db from '../config/database.js';
import { CREATION_TEMPLATE_TYPES } from '../constants/creationStudio.js';

const TABLE = 'creation_templates';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'type',
  'title',
  'description',
  'schema',
  'version',
  'is_default as isDefault',
  'created_by as createdBy',
  'governance_tags as governanceTags',
  'published_at as publishedAt',
  'retired_at as retiredAt',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

const TEMPLATE_TYPE_SET = new Set(CREATION_TEMPLATE_TYPES);

function ensureValidType(type) {
  if (!TEMPLATE_TYPE_SET.has(type)) {
    throw new Error('Invalid creation template type');
  }
}

function ensureTitle(title) {
  if (!title || String(title).trim().length === 0) {
    throw new Error('Template title is required');
  }
}

function normaliseSchema(schema) {
  if (schema && typeof schema === 'object') {
    return schema;
  }
  if (schema === undefined) {
    return {};
  }
  throw new Error('Template schema must be an object');
}

function normaliseTags(tags) {
  if (tags === undefined) {
    return [];
  }
  if (!Array.isArray(tags)) {
    throw new Error('Template governance tags must be an array');
  }
  return Array.from(new Set(tags));
}

function parseJson(value, fallback) {
  if (!value) return structuredClone(fallback);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : structuredClone(fallback);
    } catch (_error) {
      return structuredClone(fallback);
    }
  }
  if (Array.isArray(fallback)) {
    return Array.isArray(value) ? value : structuredClone(fallback);
  }
  return value ?? structuredClone(fallback);
}

export default class CreationTemplateModel {
  static async create(template, connection = db) {
    ensureValidType(template.type);
    ensureTitle(template.title);
    const schema = normaliseSchema(template.schema);
    const [id] = await connection(TABLE).insert({
      public_id: template.publicId ?? randomUUID(),
      type: template.type,
      title: template.title,
      description: template.description ?? null,
      schema: JSON.stringify(schema),
      version: template.version ?? 1,
      is_default: Boolean(template.isDefault),
      created_by: template.createdBy,
      governance_tags: JSON.stringify(normaliseTags(template.governanceTags)),
      published_at: template.publishedAt ?? null,
      retired_at: template.retiredAt ?? null
    });
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return row ? this.deserialize(row) : null;
  }

  static async findByPublicId(publicId, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ public_id: publicId }).first();
    return row ? this.deserialize(row) : null;
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.title !== undefined) {
      ensureTitle(updates.title);
      payload.title = updates.title;
    }
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.schema !== undefined) payload.schema = JSON.stringify(normaliseSchema(updates.schema));
    if (updates.version !== undefined) payload.version = updates.version;
    if (updates.isDefault !== undefined) payload.is_default = updates.isDefault;
    if (updates.governanceTags !== undefined) payload.governance_tags = JSON.stringify(normaliseTags(updates.governanceTags));
    if (updates.publishedAt !== undefined) payload.published_at = updates.publishedAt;
    if (updates.retiredAt !== undefined) payload.retired_at = updates.retiredAt;

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });
    return this.findById(id, connection);
  }

  static async list({ type, isDefault, includeRetired = false } = {}, connection = db) {
    const query = connection(TABLE).select(BASE_COLUMNS);
    if (type) {
      const types = (Array.isArray(type) ? type : [type]).filter((entry) => TEMPLATE_TYPE_SET.has(entry));
      if (types.length) {
        query.whereIn('type', types);
      }
    }
    if (isDefault !== undefined) {
      query.where({ is_default: Boolean(isDefault) });
    }
    if (!includeRetired) {
      query.whereNull('retired_at');
    }
    const rows = await query.orderBy('type', 'asc').orderBy('version', 'desc');
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(record) {
    return {
      ...record,
      schema: parseJson(record.schema, {}),
      governanceTags: parseJson(record.governanceTags, [])
    };
  }
}

