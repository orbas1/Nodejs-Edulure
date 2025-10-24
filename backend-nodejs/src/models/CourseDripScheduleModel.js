import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'course_drip_schedules';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'sequence_id as sequenceId',
  'title',
  'release_label as releaseLabel',
  'position',
  'offset_days as offsetDays',
  'gating',
  'prerequisites',
  'notifications',
  'workspace',
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

export default class CourseDripScheduleModel {
  static tableName = TABLE;

  static async listBySequenceIds(sequenceIds, connection = db) {
    if (!Array.isArray(sequenceIds) || sequenceIds.length === 0) {
      return [];
    }
    const rows = await connection(this.tableName)
      .select(BASE_COLUMNS)
      .whereIn('sequence_id', sequenceIds)
      .orderBy('sequence_id', 'asc')
      .orderBy('position', 'asc');
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(record) {
    return {
      ...record,
      prerequisites: Array.isArray(record.prerequisites)
        ? record.prerequisites
        : parseJson(record.prerequisites, []),
      notifications: Array.isArray(record.notifications)
        ? record.notifications
        : parseJson(record.notifications, []),
      metadata: parseJson(record.metadata, {}),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }

  static async insert(payload, connection = db) {
    const insertPayload = {
      public_id: payload.publicId ?? randomUUID(),
      sequence_id: payload.sequenceId,
      title: payload.title,
      release_label: payload.releaseLabel ?? null,
      position: payload.position ?? 0,
      offset_days: payload.offsetDays ?? 0,
      gating: payload.gating ?? null,
      prerequisites: JSON.stringify(payload.prerequisites ?? []),
      notifications: JSON.stringify(payload.notifications ?? []),
      workspace: payload.workspace ?? null,
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
