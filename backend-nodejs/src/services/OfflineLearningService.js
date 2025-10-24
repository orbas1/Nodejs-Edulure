import logger from '../config/logger.js';
import CourseEnrollmentModel from '../models/CourseEnrollmentModel.js';
import LearnerLessonDownloadModel from '../models/LearnerLessonDownloadModel.js';
import LearnerModuleProgressLogModel from '../models/LearnerModuleProgressLogModel.js';

const log = logger.child({ service: 'OfflineLearningService' });

function normaliseNumericId(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const candidate = typeof value === 'string' ? value.trim() : `${value}`;
  if (!candidate) {
    return null;
  }
  const parsed = Number.parseInt(candidate, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function ensurePlainObject(value, fallback = {}) {
  if (value === null || value === undefined) {
    return { ...fallback };
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return { ...fallback, ...value };
  }
  return { ...fallback };
}

function deriveRemoteSuggestion(log) {
  const snapshot = ensurePlainObject(log.remoteSnapshot);
  if (!snapshot || Object.keys(snapshot).length === 0) {
    return null;
  }

  return {
    id: snapshot.id ?? log.id,
    courseId: (snapshot.courseId ?? log.courseId ?? '').toString(),
    moduleId: (snapshot.moduleId ?? log.moduleId ?? '').toString(),
    timestamp: toIso(snapshot.timestamp ?? log.occurredAt ?? log.createdAt),
    notes: typeof snapshot.notes === 'string' ? snapshot.notes : '',
    completedLessons: Number.isFinite(Number(snapshot.completedLessons))
      ? Number(snapshot.completedLessons)
      : log.completedLessons ?? 0,
    syncState: snapshot.syncState ?? 'synced',
    updatedAt: toIso(snapshot.updatedAt ?? snapshot.timestamp ?? log.updatedAt ?? log.occurredAt),
    syncedAt: toIso(snapshot.syncedAt ?? log.syncedAt),
    deviceId: snapshot.deviceId ?? log.deviceId ?? 'server',
    conflictReason: snapshot.conflictReason ?? null,
    revision: Number.isFinite(Number(snapshot.revision)) ? Number(snapshot.revision) : log.revision ?? 0,
    remoteSuggestion: null,
    metadata: ensurePlainObject(snapshot.metadata)
  };
}

function mapLogForClient(log) {
  if (!log) {
    return null;
  }

  const payload = {
    id: log.id,
    courseId: (log.courseId ?? '').toString(),
    moduleId: (log.moduleId ?? '').toString(),
    timestamp: toIso(log.occurredAt ?? log.createdAt),
    notes: typeof log.notes === 'string' ? log.notes : '',
    completedLessons: Number.isFinite(Number(log.completedLessons))
      ? Number(log.completedLessons)
      : 0,
    syncState: log.syncState ?? 'pending',
    updatedAt: toIso(log.updatedAt ?? log.occurredAt),
    syncedAt: toIso(log.syncedAt),
    deviceId: log.deviceId ?? 'unknown-device',
    conflictReason: log.conflictReason ?? null,
    revision: Number.isFinite(Number(log.revision)) ? Number(log.revision) : 0,
    remoteSuggestion: deriveRemoteSuggestion(log)
  };

  const metadata = ensurePlainObject(log.metadata);
  if (Object.keys(metadata).length > 0) {
    payload.metadata = metadata;
  }

  return payload;
}

export default class OfflineLearningService {
  static async listModuleLogs(userId, options = {}) {
    const records = await LearnerModuleProgressLogModel.listForUser(userId, options);
    return records.map((record) => mapLogForClient(record)).filter(Boolean);
  }

  static async previewModuleLogs(userId, payload = {}) {
    const localLogs = Array.isArray(payload.logs) ? payload.logs : [];
    const courseIds = new Set();
    const moduleIds = new Set();

    for (const entry of localLogs) {
      const courseId = normaliseNumericId(entry.courseId ?? entry.course_id ?? entry.course?.id);
      if (courseId) {
        courseIds.add(courseId);
      }
      const moduleId = normaliseNumericId(entry.moduleId ?? entry.module_id ?? entry.module?.id);
      if (moduleId) {
        moduleIds.add(moduleId);
      }
    }

    const records = await LearnerModuleProgressLogModel.listForUser(userId, {
      courseIds: courseIds.size ? Array.from(courseIds) : undefined,
      moduleIds: moduleIds.size ? Array.from(moduleIds) : undefined
    });

    return {
      deviceId: typeof payload.deviceId === 'string' ? payload.deviceId : null,
      logs: records.map((record) => mapLogForClient(record)).filter(Boolean)
    };
  }

  static async syncModuleLogs(userId, payload = {}) {
    if (!userId) {
      return { updated: 0 };
    }

    const logs = Array.isArray(payload.logs) ? payload.logs : [];
    if (logs.length === 0) {
      return { updated: 0 };
    }

    const deviceId = typeof payload.deviceId === 'string' && payload.deviceId.trim().length > 0
      ? payload.deviceId.trim()
      : null;

    let enrollments = [];
    try {
      enrollments = await CourseEnrollmentModel.listByUserId(userId);
    } catch (error) {
      log.error({ err: error, userId }, 'Failed to load enrollments for offline sync');
      throw error;
    }

    const enrollmentByCourseId = new Map(
      enrollments.map((enrollment) => [String(enrollment.courseId), enrollment])
    );

    const prepared = [];
    for (const entry of logs) {
      const logId = entry?.id ?? entry?.logId;
      const courseId = normaliseNumericId(entry.courseId ?? entry.course_id ?? entry.course?.id);
      const moduleId = normaliseNumericId(entry.moduleId ?? entry.module_id ?? entry.module?.id);
      if (!logId || !courseId || !moduleId) {
        continue;
      }
      const enrollment = enrollmentByCourseId.get(String(courseId));
      if (!enrollment) {
        continue;
      }

      const completedLessons = Number.isFinite(Number(entry.completedLessons ?? entry.completed_lessons))
        ? Number(entry.completedLessons ?? entry.completed_lessons)
        : 0;
      const revision = Number.isFinite(Number(entry.revision))
        ? Number(entry.revision)
        : Number.isFinite(Number(entry.revision_number))
          ? Number(entry.revision_number)
          : 0;

      prepared.push({
        id: logId,
        enrollmentId: enrollment.id,
        courseId,
        moduleId,
        deviceId: entry.deviceId ?? entry.device_id ?? deviceId ?? 'unknown-device',
        completedLessons,
        notes: typeof entry.notes === 'string' ? entry.notes : null,
        syncState: entry.syncState ?? entry.sync_state ?? 'pending',
        revision,
        conflictReason: entry.conflictReason ?? entry.conflict_reason ?? null,
        remoteSnapshot: ensurePlainObject(entry.remoteSuggestion ?? entry.remote_snapshot),
        metadata: ensurePlainObject(entry.metadata),
        occurredAt: entry.timestamp ?? entry.occurredAt ?? entry.occurred_at ?? null,
        syncedAt: entry.syncedAt ?? entry.synced_at ?? null
      });
    }

    const filtered = prepared.filter((entry) => entry.id && entry.enrollmentId && entry.moduleId);
    if (!filtered.length) {
      return { updated: 0 };
    }

    const updated = await LearnerModuleProgressLogModel.upsertMany(filtered);
    return { updated };
  }

  static async listLessonDownloads(userId, options = {}) {
    const records = await LearnerLessonDownloadModel.listForUser(userId, options);
    return records.map((record) => ({
      id: record.id,
      courseId: (record.courseId ?? '').toString(),
      moduleId: (record.moduleId ?? '').toString(),
      lessonId: (record.lessonId ?? '').toString(),
      status: record.status,
      progressPercent: record.progressPercent ?? 0,
      manifestUrl: record.manifestUrl ?? null,
      checksumSha256: record.checksumSha256 ?? null,
      errorMessage: record.errorMessage ?? null,
      enqueuedAt: toIso(record.enqueuedAt),
      startedAt: toIso(record.startedAt),
      completedAt: toIso(record.completedAt),
      metadata: ensurePlainObject(record.metadata)
    }));
  }
}
