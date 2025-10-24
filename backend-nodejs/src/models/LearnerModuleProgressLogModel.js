import db from '../config/database.js';

const TABLE = 'learner_module_progress_logs';

const BASE_COLUMNS = [
  'logs.id',
  'logs.enrollment_id as enrollmentId',
  'logs.course_id as courseId',
  'logs.module_id as moduleId',
  'logs.device_id as deviceId',
  'logs.completed_lessons as completedLessons',
  'logs.notes',
  'logs.sync_state as syncState',
  'logs.revision',
  'logs.conflict_reason as conflictReason',
  'logs.remote_snapshot as remoteSnapshot',
  'logs.metadata',
  'logs.occurred_at as occurredAt',
  'logs.synced_at as syncedAt',
  'logs.created_at as createdAt',
  'logs.updated_at as updatedAt',
  'ce.user_id as userId'
];

const SYNC_STATES = new Set(['pending', 'syncing', 'synced', 'conflict']);

function parseJson(value, fallback = {}) {
  if (value === null || value === undefined) {
    return structuredClone(fallback);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
      return structuredClone(fallback);
    } catch (_error) {
      return structuredClone(fallback);
    }
  }
  if (typeof value === 'object') {
    return { ...fallback, ...value };
  }
  return structuredClone(fallback);
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateInput(value) {
  const parsed = toDate(value);
  return parsed ? parsed : null;
}

function resolveSyncState(value) {
  const candidate = typeof value === 'string' ? value.toLowerCase() : value;
  if (typeof candidate === 'string' && SYNC_STATES.has(candidate)) {
    return candidate;
  }
  return 'pending';
}

export default class LearnerModuleProgressLogModel {
  static async listForUser(userId, { courseIds, moduleIds, since } = {}, connection = db) {
    if (!userId) return [];
    const query = connection(`${TABLE} as logs`)
      .select(BASE_COLUMNS)
      .leftJoin('course_enrollments as ce', 'ce.id', 'logs.enrollment_id')
      .where('ce.user_id', userId)
      .orderBy('logs.occurred_at', 'asc')
      .orderBy('logs.id', 'asc');

    if (Array.isArray(courseIds) && courseIds.length > 0) {
      query.whereIn('logs.course_id', courseIds);
    }

    if (Array.isArray(moduleIds) && moduleIds.length > 0) {
      query.whereIn('logs.module_id', moduleIds);
    }

    if (since) {
      const sinceDate = toDate(since);
      if (sinceDate) {
        query.andWhere('logs.updated_at', '>=', sinceDate);
      }
    }

    const rows = await query;
    return rows.map((record) => this.deserialize(record));
  }

  static deserialize(record) {
    if (!record) {
      return null;
    }

    return {
      id: record.id,
      enrollmentId: record.enrollmentId,
      courseId: record.courseId,
      moduleId: record.moduleId,
      deviceId: record.deviceId,
      completedLessons: Number.isFinite(Number(record.completedLessons))
        ? Number(record.completedLessons)
        : 0,
      notes: record.notes ?? '',
      syncState: resolveSyncState(record.syncState),
      revision: Number.isFinite(Number(record.revision)) ? Number(record.revision) : 0,
      conflictReason: record.conflictReason ?? null,
      remoteSnapshot: parseJson(record.remoteSnapshot, {}),
      metadata: parseJson(record.metadata, {}),
      occurredAt: toDate(record.occurredAt),
      syncedAt: toDate(record.syncedAt),
      createdAt: toDate(record.createdAt),
      updatedAt: toDate(record.updatedAt),
      userId: record.userId ?? null
    };
  }

  static serialize(payload = {}) {
    const syncState = resolveSyncState(payload.syncState);
    return {
      id: payload.id,
      enrollment_id: payload.enrollmentId,
      course_id: payload.courseId,
      module_id: payload.moduleId,
      device_id: payload.deviceId ?? 'unknown-device',
      completed_lessons: Number.isFinite(Number(payload.completedLessons))
        ? Number(payload.completedLessons)
        : 0,
      notes: payload.notes ?? null,
      sync_state: syncState,
      revision: Number.isFinite(Number(payload.revision)) ? Number(payload.revision) : 0,
      conflict_reason: payload.conflictReason ?? null,
      remote_snapshot: JSON.stringify(payload.remoteSnapshot ?? {}),
      metadata: JSON.stringify(payload.metadata ?? {}),
      occurred_at: toDateInput(payload.occurredAt) ?? new Date(),
      synced_at: toDateInput(payload.syncedAt)
    };
  }

  static async upsertMany(logs, connection = db) {
    if (!Array.isArray(logs) || logs.length === 0) {
      return 0;
    }

    let count = 0;
    for (const log of logs) {
      if (!log?.id) {
        continue;
      }
      const record = this.serialize(log);
      await connection(TABLE)
        .insert(record)
        .onConflict('id')
        .merge({
          enrollment_id: record.enrollment_id,
          course_id: record.course_id,
          module_id: record.module_id,
          device_id: record.device_id,
          completed_lessons: record.completed_lessons,
          notes: record.notes,
          sync_state: record.sync_state,
          revision: record.revision,
          conflict_reason: record.conflict_reason,
          remote_snapshot: record.remote_snapshot,
          metadata: record.metadata,
          occurred_at: record.occurred_at,
          synced_at: record.synced_at,
          updated_at: connection.fn.now()
        });
      count += 1;
    }

    return count;
  }
}
