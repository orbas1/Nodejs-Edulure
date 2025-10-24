import db from '../config/database.js';

const TABLE = 'course_blueprint_modules';

const BASE_COLUMNS = [
  'id',
  'blueprint_id as blueprintId',
  'module_id as moduleId',
  'title',
  'release_label as releaseLabel',
  'lesson_count as lessonCount',
  'assignment_count as assignmentCount',
  'duration_minutes as durationMinutes',
  'outstanding_tasks as outstandingTasksRaw',
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

export default class CourseBlueprintModuleModel {
  static tableName = TABLE;

  static async listByBlueprintIds(blueprintIds, connection = db) {
    if (!Array.isArray(blueprintIds) || blueprintIds.length === 0) {
      return [];
    }
    const rows = await connection(this.tableName)
      .select(BASE_COLUMNS)
      .whereIn('blueprint_id', blueprintIds)
      .orderBy('blueprint_id', 'asc')
      .orderBy('position', 'asc')
      .orderBy('id', 'asc');
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(record) {
    const metadata = parseJson(record.metadata, {});
    const outstandingTasks = Array.isArray(record.outstandingTasksRaw)
      ? record.outstandingTasksRaw
      : parseJson(record.outstandingTasksRaw, []);
    return {
      ...record,
      metadata,
      outstandingTasks,
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }
}
