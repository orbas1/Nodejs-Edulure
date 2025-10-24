import db from '../config/database.js';
import CourseModuleVersionModel from './CourseModuleVersionModel.js';

const TABLE = 'course_modules';

const BASE_COLUMNS = [
  'id',
  'course_id as courseId',
  'title',
  'slug',
  'position',
  'release_offset_days as releaseOffsetDays',
  'metadata',
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

function serialiseJson(value) {
  if (value === undefined || value === null) {
    return JSON.stringify({});
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function toNumeric(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export default class CourseModuleModel {
  static async listByCourseIds(courseIds, connection = db) {
    if (!courseIds?.length) return [];
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .whereIn('course_id', courseIds)
      .orderBy('course_id', 'asc')
      .orderBy('position', 'asc');
    return rows.map((row) => this.deserialize(row));
  }

  static async findById(id, connection = db) {
    if (!id) {
      return null;
    }
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return row ? this.deserialize(row) : null;
  }

  static async updateById(id, updates = {}, options = {}, connection = db) {
    const existing = await connection(TABLE).where({ id }).first();
    if (!existing) {
      return null;
    }

    const payload = {};
    if (updates.title !== undefined) {
      payload.title = updates.title ?? existing.title;
    }
    if (updates.slug !== undefined) {
      payload.slug = updates.slug ?? existing.slug;
    }
    if (updates.position !== undefined) {
      payload.position = toNumeric(updates.position, existing.position);
    }
    if (updates.releaseOffsetDays !== undefined) {
      payload.release_offset_days = toNumeric(
        updates.releaseOffsetDays,
        existing.release_offset_days
      );
    }
    if (updates.metadata !== undefined) {
      payload.metadata = serialiseJson(updates.metadata);
    }

    if (Object.keys(payload).length === 0) {
      return this.deserialize(existing);
    }

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    const updated = await connection(TABLE).where({ id }).first();

    await CourseModuleVersionModel.recordSnapshot(
      { ...existing, ...updated },
      {
        changeType: 'update',
        changeReason: options.changeReason ?? null,
        changedBy: options.changedBy ?? null
      },
      connection
    );

    return updated ? this.deserialize(updated) : null;
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
