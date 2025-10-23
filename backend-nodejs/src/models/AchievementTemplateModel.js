import db from '../config/database.js';

const TABLE = 'achievement_templates';

const BASE_COLUMNS = [
  'id',
  'slug',
  'name',
  'description',
  'type',
  'certificate_background_url as certificateBackgroundUrl',
  'metadata',
  'is_active as isActive',
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

export default class AchievementTemplateModel {
  static async findBySlug(slug, connection = db) {
    if (!slug) return null;
    const record = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where('slug', slug)
      .andWhere('is_active', true)
      .first();
    return record ? this.deserialize(record) : null;
  }

  static async findById(id, connection = db) {
    if (!id) return null;
    const record = await connection(TABLE).select(BASE_COLUMNS).where('id', id).first();
    return record ? this.deserialize(record) : null;
  }

  static async listActiveByType(type, connection = db) {
    const query = connection(TABLE).select(BASE_COLUMNS).where('is_active', true);
    if (type) {
      query.andWhere('type', type);
    }
    const rows = await query.orderBy('name', 'asc');
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(record) {
    return {
      ...record,
      metadata: parseJson(record.metadata),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }
}
