import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'course_refresher_lessons';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'course_id as courseId',
  'title',
  'format',
  'cadence',
  'owner',
  'status',
  'next_session_at as nextSessionAt',
  'channel',
  'enrollment_window as enrollmentWindow',
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

export default class CourseRefresherLessonModel {
  static tableName = TABLE;

  static async listByCourseIds(courseIds, connection = db) {
    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return [];
    }
    const rows = await connection(this.tableName)
      .select(BASE_COLUMNS)
      .whereIn('course_id', courseIds)
      .orderBy('course_id', 'asc')
      .orderBy('created_at', 'desc');
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(record) {
    return {
      ...record,
      metadata: parseJson(record.metadata, {}),
      nextSessionAt: toDate(record.nextSessionAt),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }

  static async insert(payload, connection = db) {
    const insertPayload = {
      public_id: payload.publicId ?? randomUUID(),
      course_id: payload.courseId,
      title: payload.title,
      format: payload.format ?? 'Live session',
      cadence: payload.cadence ?? null,
      owner: payload.owner ?? null,
      status: payload.status ?? 'Scheduled',
      next_session_at: payload.nextSessionAt ?? null,
      channel: payload.channel ?? null,
      enrollment_window: payload.enrollmentWindow ?? null,
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
