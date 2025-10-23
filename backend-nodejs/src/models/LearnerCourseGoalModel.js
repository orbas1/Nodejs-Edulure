import crypto from 'crypto';

import db from '../config/database.js';

const TABLE = 'learner_course_goals';

function parseJson(value, fallback = {}) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function serialiseJson(value, fallback = {}) {
  if (value === null || value === undefined) {
    return JSON.stringify(fallback);
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function toDomain(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    goalUuid: row.goal_uuid,
    userId: row.user_id,
    courseId: row.course_id,
    enrollmentId: row.enrollment_id,
    title: row.title,
    status: row.status,
    isActive: row.is_active === null ? true : Boolean(row.is_active),
    priority: row.priority ?? 0,
    targetLessons: row.target_lessons ?? 0,
    remainingLessons: row.remaining_lessons ?? 0,
    focusMinutesPerWeek: row.focus_minutes_per_week ?? 0,
    progressPercent: row.progress_percent != null ? Number(row.progress_percent) : 0,
    dueDate: row.due_date,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class LearnerCourseGoalModel {
  static deserialize(row) {
    return toDomain(row);
  }

  static async listActiveByUserId(userId, connection = db) {
    if (!userId) {
      return [];
    }

    const rows = await connection(TABLE)
      .select([
        'id',
        'goal_uuid',
        'user_id',
        'course_id',
        'enrollment_id',
        'title',
        'status',
        'is_active',
        'priority',
        'target_lessons',
        'remaining_lessons',
        'focus_minutes_per_week',
        'progress_percent',
        'due_date',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .where({ user_id: userId })
      .andWhere((builder) => builder.whereNull('is_active').orWhere('is_active', true))
      .orderBy('priority', 'desc')
      .orderBy('due_date', 'asc')
      .orderBy('updated_at', 'desc');

    return rows.map(toDomain);
  }

  static async findActiveForCourse(userId, courseId, connection = db) {
    if (!userId || !courseId) {
      return null;
    }

    const row = await connection(TABLE)
      .select([
        'id',
        'goal_uuid',
        'user_id',
        'course_id',
        'enrollment_id',
        'title',
        'status',
        'is_active',
        'priority',
        'target_lessons',
        'remaining_lessons',
        'focus_minutes_per_week',
        'progress_percent',
        'due_date',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .where({ user_id: userId, course_id: courseId })
      .andWhere((builder) => builder.whereNull('is_active').orWhere('is_active', true))
      .orderBy('updated_at', 'desc')
      .first();

    return toDomain(row);
  }

  static async create(goal, connection = db) {
    const payload = {
      goal_uuid: goal.goalUuid ?? goal.goalUuid?.toString?.() ?? crypto.randomUUID(),
      user_id: goal.userId,
      course_id: goal.courseId,
      enrollment_id: goal.enrollmentId ?? null,
      title: goal.title,
      status: goal.status ?? 'planned',
      is_active: goal.isActive ?? true,
      priority: goal.priority ?? 0,
      target_lessons: goal.targetLessons ?? 0,
      remaining_lessons: goal.remainingLessons ?? 0,
      focus_minutes_per_week: goal.focusMinutesPerWeek ?? 0,
      progress_percent: goal.progressPercent ?? 0,
      due_date: goal.dueDate ?? null,
      metadata: serialiseJson(goal.metadata, {})
    };

    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    if (!id) {
      return null;
    }

    const payload = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.targetLessons !== undefined) payload.target_lessons = updates.targetLessons;
    if (updates.remainingLessons !== undefined) payload.remaining_lessons = updates.remainingLessons;
    if (updates.focusMinutesPerWeek !== undefined) payload.focus_minutes_per_week = updates.focusMinutesPerWeek;
    if (updates.progressPercent !== undefined) payload.progress_percent = updates.progressPercent;
    if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
    if (updates.metadata !== undefined) payload.metadata = serialiseJson(updates.metadata, {});

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE).where({ id }).update(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    if (!id) {
      return null;
    }

    const row = await connection(TABLE)
      .select([
        'id',
        'goal_uuid',
        'user_id',
        'course_id',
        'enrollment_id',
        'title',
        'status',
        'is_active',
        'priority',
        'target_lessons',
        'remaining_lessons',
        'focus_minutes_per_week',
        'progress_percent',
        'due_date',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .where({ id })
      .first();

    return toDomain(row);
  }
}
