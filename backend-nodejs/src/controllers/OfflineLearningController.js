import OfflineLearningService from '../services/OfflineLearningService.js';
import { success } from '../utils/httpResponse.js';

const MAX_LOG_BATCH = 200;
const MAX_STRING_LENGTH = 2048;
const MAX_NOTES_LENGTH = 2000;
const SYNC_STATES = new Set(['pending', 'syncing', 'synced', 'conflict']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function coerceString(value, { maxLength = MAX_STRING_LENGTH, fallback = null } = {}) {
  if (value === null || value === undefined) {
    return fallback;
  }
  const stringValue = typeof value === 'string' ? value : `${value}`;
  const trimmed = stringValue.trim();
  if (!trimmed) {
    return fallback;
  }
  if (trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }
  return trimmed;
}

function coerceSyncState(value) {
  if (typeof value === 'string') {
    const candidate = value.trim().toLowerCase();
    if (SYNC_STATES.has(candidate)) {
      return candidate;
    }
  }
  return 'pending';
}

function coerceNumber(value, fallback = 0) {
  if (value === null || value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function coerceDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function sanitisePreviewPayload(body) {
  const payload = isPlainObject(body) ? body : {};
  const deviceId = coerceString(payload.deviceId, { maxLength: 120, fallback: null });
  const logs = Array.isArray(payload.logs) ? payload.logs.slice(0, MAX_LOG_BATCH) : [];

  const preparedLogs = logs
    .filter(isPlainObject)
    .map((log) => ({
      id: coerceString(log.id ?? log.logId, { maxLength: 120, fallback: null }),
      courseId: coerceString(log.courseId ?? log.course_id ?? log.course?.id, { maxLength: 120, fallback: null }),
      moduleId: coerceString(log.moduleId ?? log.module_id ?? log.module?.id, { maxLength: 120, fallback: null }),
      revision: coerceNumber(log.revision ?? log.revision_number, 0),
      updatedAt: coerceDate(log.updatedAt ?? log.updated_at ?? log.timestamp ?? null)
    }))
    .filter((log) => log.courseId && log.moduleId);

  return { deviceId, logs: preparedLogs };
}

function sanitiseCommitPayload(body) {
  const payload = isPlainObject(body) ? body : {};
  const deviceId = coerceString(payload.deviceId, { maxLength: 120, fallback: null });
  const logs = Array.isArray(payload.logs) ? payload.logs.slice(0, MAX_LOG_BATCH) : [];

  const preparedLogs = logs
    .filter(isPlainObject)
    .map((log) => {
      const metadata = isPlainObject(log.metadata) ? log.metadata : {};
      const remoteSuggestion = isPlainObject(log.remoteSuggestion)
        ? log.remoteSuggestion
        : isPlainObject(log.remote_snapshot)
          ? log.remote_snapshot
          : undefined;

      return {
        id: coerceString(log.id ?? log.logId, { maxLength: 120, fallback: null }),
        courseId: coerceString(log.courseId ?? log.course_id ?? log.course?.id, { maxLength: 120, fallback: null }),
        moduleId: coerceString(log.moduleId ?? log.module_id ?? log.module?.id, { maxLength: 120, fallback: null }),
        completedLessons: coerceNumber(log.completedLessons ?? log.completed_lessons, 0),
        notes: coerceString(log.notes, { maxLength: MAX_NOTES_LENGTH, fallback: null }),
        syncState: coerceSyncState(log.syncState ?? log.sync_state),
        revision: coerceNumber(log.revision ?? log.revision_number, 0),
        conflictReason: coerceString(log.conflictReason ?? log.conflict_reason, { maxLength: 240, fallback: null }),
        remoteSuggestion,
        metadata,
        timestamp: coerceDate(log.timestamp ?? log.occurredAt ?? log.occurred_at),
        syncedAt: coerceDate(log.syncedAt ?? log.synced_at),
        deviceId: coerceString(log.deviceId ?? log.device_id, { maxLength: 120, fallback: null })
      };
    })
    .filter((log) => log.id && log.courseId && log.moduleId);

  return { deviceId, logs: preparedLogs };
}

export default class OfflineLearningController {
  static async listModuleLogs(req, res, next) {
    try {
      const logs = await OfflineLearningService.listModuleLogs(req.user?.id, {});
      return success(res, {
        data: { logs },
        message: logs.length ? 'Offline progress logs retrieved.' : 'No offline progress logs found.'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async previewModuleLogs(req, res, next) {
    try {
      const payload = sanitisePreviewPayload(req.body);
      const result = await OfflineLearningService.previewModuleLogs(req.user?.id, payload);
      return success(res, {
        data: result,
        message: result.logs.length
          ? 'Remote progress signals ready for reconciliation.'
          : 'No remote progress updates available.'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async commitModuleLogs(req, res, next) {
    try {
      const payload = sanitiseCommitPayload(req.body);
      const result = await OfflineLearningService.syncModuleLogs(req.user?.id, payload);
      return success(res, {
        data: result,
        message: result.updated > 0
          ? 'Offline progress synchronised successfully.'
          : 'No offline progress changes were applied.'
      });
    } catch (error) {
      return next(error);
    }
  }
}
