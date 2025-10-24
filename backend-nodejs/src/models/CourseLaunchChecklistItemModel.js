import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'course_launch_checklist_items';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'launch_id as launchId',
  'label',
  'completed',
  'owner',
  'due_at as dueAt',
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

export default class CourseLaunchChecklistItemModel {
  static tableName = TABLE;

  static async listByLaunchIds(launchIds, connection = db) {
    if (!Array.isArray(launchIds) || launchIds.length === 0) {
      return [];
    }
    const rows = await connection(this.tableName)
      .select(BASE_COLUMNS)
      .whereIn('launch_id', launchIds)
      .orderBy('launch_id', 'asc')
      .orderBy('created_at', 'asc');
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(record) {
    return {
      ...record,
      metadata: parseJson(record.metadata, {}),
      dueAt: toDate(record.dueAt),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }

  static async insert(payload, connection = db) {
    const insertPayload = {
      public_id: payload.publicId ?? randomUUID(),
      launch_id: payload.launchId,
      label: payload.label,
      completed: payload.completed === true,
      owner: payload.owner ?? null,
      due_at: payload.dueAt ?? null,
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
