import crypto from 'crypto';

import db from '../config/database.js';

const TABLE = 'course_assessment_questions';

const BASE_COLUMNS = [
  'id',
  'assignment_id as assignmentId',
  'question_id as questionId',
  'question_type as questionType',
  'prompt',
  'options',
  'answer_key as answerKey',
  'position',
  'points',
  'metadata',
  'archived_at as archivedAt',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value, fallback) {
  if (!value) {
    return structuredClone(fallback);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(fallback) && Array.isArray(parsed)) {
        return parsed;
      }
      if (!Array.isArray(fallback) && parsed && typeof parsed === 'object') {
        return { ...fallback, ...parsed };
      }
      return structuredClone(fallback);
    } catch (_error) {
      return structuredClone(fallback);
    }
  }
  if (typeof value === 'object') {
    if (Array.isArray(fallback)) {
      return Array.isArray(value) ? value : structuredClone(fallback);
    }
    return { ...fallback, ...value };
  }
  return structuredClone(fallback);
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serialise(value) {
  if (!value) {
    return JSON.stringify(Array.isArray(value) ? [] : {});
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function normaliseQuestionPayload(question, connection) {
  const prompt = typeof question.prompt === 'string' ? question.prompt.trim() : null;
  if (!prompt) {
    throw new Error('Question prompt is required');
  }

  const questionId =
    typeof question.questionId === 'string' && question.questionId.trim().length
      ? question.questionId.trim()
      : (typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `question-${Date.now()}`);

  const questionType =
    typeof question.questionType === 'string' && question.questionType.trim().length
      ? question.questionType.trim()
      : 'multiple_choice';

  const numericPosition = Number(question.position);
  const numericPoints = Number(question.points);

  return {
    assignment_id: question.assignmentId,
    question_id: questionId,
    question_type: questionType,
    prompt,
    options: serialise(question.options ?? []),
    answer_key: serialise(question.answerKey ?? {}),
    position: Number.isFinite(numericPosition) ? numericPosition : 0,
    points: Number.isFinite(numericPoints) ? Math.max(0, numericPoints) : 1,
    metadata: serialise(question.metadata ?? {}),
    archived_at: question.archivedAt ?? null
  };
}

export default class CourseAssessmentQuestionModel {
  static deserialize(record) {
    if (!record) {
      return null;
    }

    return {
      ...record,
      options: parseJson(record.options, []),
      answerKey: parseJson(record.answerKey, {}),
      metadata: parseJson(record.metadata, {}),
      archivedAt: toDate(record.archivedAt),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt)
    };
  }

  static async listByAssignmentId(assignmentId, connection = db) {
    if (!assignmentId) {
      return [];
    }
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ assignment_id: assignmentId })
      .orderBy('position', 'asc');
    return rows.map((row) => this.deserialize(row));
  }

  static async listByAssignmentIds(assignmentIds, connection = db) {
    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      return [];
    }
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .whereIn('assignment_id', assignmentIds)
      .orderBy('assignment_id', 'asc')
      .orderBy('position', 'asc');
    return rows.map((row) => this.deserialize(row));
  }

  static async create(question, connection = db) {
    if (!question?.assignmentId) {
      throw new Error('assignmentId is required');
    }

    const payload = normaliseQuestionPayload(question, connection);
    const [id] = await connection(TABLE).insert(payload);
    const created = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return this.deserialize(created);
  }

  static async replaceAssignmentQuestions(assignmentId, questions, connection = db) {
    if (!assignmentId) {
      throw new Error('assignmentId is required');
    }

    const ids = Array.isArray(questions) ? questions : [];

    await connection(TABLE).where({ assignment_id: assignmentId }).del();

    if (ids.length === 0) {
      return [];
    }

    const payloads = ids.map((question, index) => {
      const resolved = {
        ...question,
        assignmentId,
        position: question.position ?? index
      };
      return normaliseQuestionPayload(resolved, connection);
    });

    await connection(TABLE).insert(payloads);
    return this.listByAssignmentId(assignmentId, connection);
  }
}
