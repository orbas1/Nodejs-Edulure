import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'course_catalogue_listings';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'course_id as courseId',
  'channel',
  'status',
  'impressions',
  'conversions',
  'conversion_rate as conversionRate',
  'price_amount as priceAmount',
  'price_currency as priceCurrency',
  'last_synced_at as lastSyncedAt',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch (_error) {
      return fallback;
    }
  }
  if (typeof value === 'object') {
    return value;
  }
  return fallback;
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default class CourseCatalogueListingModel {
  static tableName = TABLE;

  static async listByCourseIds(courseIds, connection = db) {
    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return [];
    }
    const rows = await connection(this.tableName)
      .select(BASE_COLUMNS)
      .whereIn('course_id', courseIds)
      .orderBy('course_id', 'asc')
      .orderBy('last_synced_at', 'desc');
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(record) {
    return {
      ...record,
      metadata: parseJson(record.metadata, {}),
      lastSyncedAt: toDate(record.lastSyncedAt),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }

  static async insert(payload, connection = db) {
    const insertPayload = {
      public_id: payload.publicId ?? randomUUID(),
      course_id: payload.courseId,
      channel: payload.channel,
      status: payload.status ?? 'Draft',
      impressions: payload.impressions ?? 0,
      conversions: payload.conversions ?? 0,
      conversion_rate: payload.conversionRate ?? 0,
      price_amount: payload.priceAmount ?? 0,
      price_currency: payload.priceCurrency ?? 'USD',
      last_synced_at: payload.lastSyncedAt ?? null,
      metadata: JSON.stringify(payload.metadata ?? {})
    };
    const [id] = await connection(this.tableName).insert(insertPayload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    if (!id) return null;
    const row = await connection(this.tableName).select(BASE_COLUMNS).where({ id }).first();
    return row ? this.deserialize(row) : null;
  }
}
