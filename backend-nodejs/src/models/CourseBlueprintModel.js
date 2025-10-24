import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'course_blueprints';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'course_id as courseId',
  'title',
  'stage',
  'summary',
  'target_learners as targetLearners',
  'price_label as priceLabel',
  'module_count as moduleCount',
  'readiness_score as readinessScore',
  'readiness_label as readinessLabel',
  'total_duration_minutes as totalDurationMinutes',
  'outstanding_tasks as outstandingTasksRaw',
  'upcoming_milestones as upcomingMilestonesRaw',
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

export default class CourseBlueprintModel {
  static tableName = TABLE;

  static async listByCourseIds(courseIds, connection = db) {
    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return [];
    }
    const rows = await connection(this.tableName)
      .select(BASE_COLUMNS)
      .whereIn('course_id', courseIds)
      .orderBy('course_id', 'asc')
      .orderBy('updated_at', 'desc');
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(record) {
    const metadata = parseJson(record.metadata, {});
    const outstandingTasks = Array.isArray(record.outstandingTasksRaw)
      ? record.outstandingTasksRaw
      : parseJson(record.outstandingTasksRaw, []);
    const upcomingMilestones = Array.isArray(record.upcomingMilestonesRaw)
      ? record.upcomingMilestonesRaw
      : parseJson(record.upcomingMilestonesRaw, []);
    return {
      ...record,
      metadata,
      outstandingTasks,
      upcomingMilestones,
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }

  static async insert(payload, connection = db) {
    const insertPayload = {
      public_id: payload.publicId ?? randomUUID(),
      course_id: payload.courseId,
      title: payload.title,
      stage: payload.stage ?? 'Planning',
      summary: payload.summary ?? null,
      target_learners: payload.targetLearners ?? null,
      price_label: payload.priceLabel ?? null,
      module_count: payload.moduleCount ?? 0,
      readiness_score: payload.readinessScore ?? 0,
      readiness_label: payload.readinessLabel ?? null,
      total_duration_minutes: payload.totalDurationMinutes ?? 0,
      outstanding_tasks: JSON.stringify(payload.outstandingTasks ?? []),
      upcoming_milestones: JSON.stringify(payload.upcomingMilestones ?? []),
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
