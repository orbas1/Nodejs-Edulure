import db from '../config/database.js';

const TABLE = 'course_assignments';

const BASE_COLUMNS = [
  'id',
  'course_id as courseId',
  'module_id as moduleId',
  'title',
  'instructions',
  'max_score as maxScore',
  'due_offset_days as dueOffsetDays',
  'rubric',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value, fallback) {
  if (!value) return structuredClone(fallback);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...fallback, ...parsed };
      }
      return structuredClone(fallback);
    } catch (_error) {
      return structuredClone(fallback);
    }
  }
  if (typeof value === 'object' && value !== null) {
    return { ...fallback, ...value };
  }
  return structuredClone(fallback);
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default class CourseAssignmentModel {
  static async listByCourseIds(courseIds, connection = db) {
    if (!courseIds?.length) return [];
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .whereIn('course_id', courseIds)
      .orderBy('course_id', 'asc')
      .orderBy('module_id', 'asc')
      .orderBy('id', 'asc');
    const assignmentIds = rows.map((row) => row.id);
    let counts = [];
    if (assignmentIds.length) {
      counts = await connection('course_assessment_questions')
        .select('assignment_id')
        .count({ total: '*' })
        .whereIn('assignment_id', assignmentIds)
        .groupBy('assignment_id');
    }

    const countMap = new Map(
      counts.map((row) => [row.assignment_id ?? row.assignmentId, Number(row.total ?? 0)])
    );

    return rows.map((row) => {
      const record = this.deserialize(row);
      record.questionCount = countMap.get(row.id) ?? 0;
      return record;
    });
  }

  static deserialize(record) {
    return {
      ...record,
      rubric: parseJson(record.rubric, {}),
      metadata: parseJson(record.metadata, {}),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }
}
