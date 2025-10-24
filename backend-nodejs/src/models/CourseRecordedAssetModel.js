import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'course_recorded_assets';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'course_id as courseId',
  'asset_id as assetId',
  'title',
  'format',
  'status',
  'duration_minutes as durationMinutes',
  'size_mb as sizeMb',
  'quality',
  'language',
  'aspect_ratio as aspectRatio',
  'engagement_completion_rate as engagementCompletionRate',
  'tags',
  'audience',
  'updated_at_source as updatedAtSource',
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

export default class CourseRecordedAssetModel {
  static tableName = TABLE;

  static async listByCourseIds(courseIds, connection = db) {
    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return [];
    }
    const rows = await connection(this.tableName)
      .select(BASE_COLUMNS)
      .whereIn('course_id', courseIds)
      .orderBy('course_id', 'asc')
      .orderBy('updated_at_source', 'desc')
      .orderBy('updated_at', 'desc');
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(record) {
    return {
      ...record,
      tags: Array.isArray(record.tags) ? record.tags : parseJson(record.tags, []),
      metadata: parseJson(record.metadata, {}),
      updatedAtSource: toDate(record.updatedAtSource),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }

  static async insert(payload, connection = db) {
    const insertPayload = {
      public_id: payload.publicId ?? randomUUID(),
      course_id: payload.courseId,
      asset_id: payload.assetId ?? null,
      title: payload.title,
      format: payload.format ?? 'Video',
      status: payload.status ?? 'Draft',
      duration_minutes: payload.durationMinutes ?? 0,
      size_mb: payload.sizeMb ?? null,
      quality: payload.quality ?? null,
      language: payload.language ?? null,
      aspect_ratio: payload.aspectRatio ?? null,
      engagement_completion_rate: payload.engagementCompletionRate ?? null,
      tags: JSON.stringify(payload.tags ?? []),
      audience: payload.audience ?? null,
      updated_at_source: payload.updatedAtSource ?? null,
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
