import db from '../config/database.js';
import LessonDownloadAssetModel from '../models/LessonDownloadAssetModel.js';
import LessonDownloadManifestModel from '../models/LessonDownloadManifestModel.js';
import LessonProgressSyncQueueModel from '../models/LessonProgressSyncQueueModel.js';

const PROGRESS_STATUSES = new Set(['pending', 'syncing', 'failed', 'completed']);

function normaliseIdentifier(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value).trim();
}

function isNumericIdentifier(value) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  return /^\d+$/.test(String(value));
}

async function resolveModuleId(courseId, identifier, connection = db) {
  const normalised = normaliseIdentifier(identifier);
  if (!courseId || !normalised) {
    return null;
  }
  const query = connection('course_modules').select('id').where('course_id', courseId);
  if (isNumericIdentifier(normalised)) {
    query.andWhere('id', Number(normalised));
  } else {
    query.andWhere('slug', normalised);
  }
  const row = await query.first();
  return row?.id ?? null;
}

async function resolveLessonId(courseId, moduleId, identifier, connection = db) {
  const normalised = normaliseIdentifier(identifier);
  if (!courseId || !normalised) {
    return null;
  }
  const query = connection('course_lessons').select('id').where('course_id', courseId);
  if (moduleId) {
    query.andWhere('module_id', moduleId);
  }
  if (isNumericIdentifier(normalised)) {
    query.andWhere('id', Number(normalised));
  } else {
    query.andWhere('slug', normalised);
  }
  const row = await query.first();
  return row?.id ?? null;
}

function hydrateAssets(manifests, assets) {
  if (!manifests.length) {
    return manifests;
  }
  const assetLookup = new Map();
  assets.forEach((asset) => {
    const list = assetLookup.get(asset.manifestId) ?? [];
    list.push(asset);
    assetLookup.set(asset.manifestId, list);
  });
  return manifests.map((manifest) => ({
    ...manifest,
    assets: assetLookup.get(manifest.id) ?? []
  }));
}

class LessonOfflineService {
  static getProgressStatuses() {
    return Array.from(PROGRESS_STATUSES);
  }

  static async listCourseManifests(courseId, { moduleSlug } = {}) {
    const manifests = await LessonDownloadManifestModel.listByCourseId(courseId);
    if (!manifests.length) {
      return [];
    }
    const filtered = moduleSlug
      ? manifests.filter((manifest) => (manifest.moduleSlug ?? '').toLowerCase() === moduleSlug.toLowerCase())
      : manifests;
    if (!filtered.length) {
      return [];
    }
    const manifestIds = filtered.map((manifest) => manifest.id);
    const assets = await LessonDownloadAssetModel.listByManifestIds(manifestIds);
    return hydrateAssets(filtered, assets);
  }

  static async getModuleManifest(courseId, { moduleId, moduleSlug } = {}) {
    const resolvedModuleId = moduleId
      ? Number(moduleId)
      : await resolveModuleId(courseId, moduleSlug ?? null);
    if (!resolvedModuleId) {
      return null;
    }
    const manifest = await LessonDownloadManifestModel.findByModule(courseId, resolvedModuleId);
    if (!manifest) {
      return null;
    }
    const assets = await LessonDownloadAssetModel.listByManifestId(manifest.id);
    return { ...manifest, assets };
  }

  static async enqueueProgress(enrollmentId, courseId, input = {}) {
    if (!enrollmentId) {
      const error = new Error('Enrollment identifier missing');
      error.status = 400;
      throw error;
    }
    return db.transaction(async (trx) => {
      const moduleId =
        input.moduleId !== undefined
          ? (isNumericIdentifier(input.moduleId) ? Number(input.moduleId) : await resolveModuleId(courseId, input.moduleId, trx))
          : await resolveModuleId(courseId, input.moduleSlug ?? null, trx);
      const lessonIdentifier = input.lessonId ?? input.lessonSlug;
      const lessonId = await resolveLessonId(courseId, moduleId, lessonIdentifier, trx);
      if (!lessonId) {
        const error = new Error('Lesson not found for offline progress');
        error.status = 404;
        throw error;
      }

      const status = PROGRESS_STATUSES.has(String(input.status ?? '').toLowerCase())
        ? String(input.status).toLowerCase()
        : 'pending';

      const payload = {
        notes: input.notes ?? null,
        recordedAt: input.recordedAt ? new Date(input.recordedAt).toISOString() : new Date().toISOString(),
        offline: true,
        device: input.device ?? 'mobile',
        attachments: Array.isArray(input.attachments) ? input.attachments : [],
        metrics: input.metrics ?? {},
        source: input.source ?? 'mobile.offline',
        localLogId: input.localLogId ?? null
      };

      const metadata = {
        moduleSlug: input.moduleSlug ?? null,
        lessonSlug: input.lessonSlug ?? null,
        appVersion: input.appVersion ?? null,
        networkQuality: input.networkQuality ?? null,
        ...input.metadata
      };

      const entry = await LessonProgressSyncQueueModel.create(
        {
          enrollmentId,
          lessonId,
          moduleId,
          status,
          progressPercent: input.progressPercent ?? 0,
          requiresReview: Boolean(input.requiresReview),
          attempts: input.attempts ?? 0,
          lastAttemptAt: input.lastAttemptAt ?? null,
          lastError: input.lastError ?? null,
          payload,
          metadata
        },
        trx
      );

      return entry;
    });
  }

  static async listProgressQueue(enrollmentId, options = {}) {
    return LessonProgressSyncQueueModel.listByEnrollmentId(enrollmentId, options);
  }

  static async updateProgressTask(enrollmentId, taskPublicId, updates = {}) {
    if (!enrollmentId || !taskPublicId) {
      const error = new Error('Offline task identifier missing');
      error.status = 400;
      throw error;
    }

    return db.transaction(async (trx) => {
      const task = await LessonProgressSyncQueueModel.findByPublicId(taskPublicId, trx);
      if (!task || task.enrollmentId !== enrollmentId) {
        const error = new Error('Offline progress task not found');
        error.status = 404;
        throw error;
      }

      const patch = {};
      if (updates.progressPercent !== undefined) {
        patch.progressPercent = updates.progressPercent;
      }
      if (updates.requiresReview !== undefined) {
        patch.requiresReview = Boolean(updates.requiresReview);
      }
      if (updates.metadata) {
        patch.metadata = { ...task.metadata, ...updates.metadata };
      }
      if (updates.payload) {
        patch.payload = { ...task.payload, ...updates.payload };
      }
      if (updates.lastError !== undefined) {
        patch.lastError = updates.lastError ?? null;
      }
      if (updates.attempts !== undefined) {
        patch.attempts = updates.attempts;
      }

      if (updates.status) {
        const status = String(updates.status).toLowerCase();
        if (!PROGRESS_STATUSES.has(status)) {
          const error = new Error('Unsupported offline progress status');
          error.status = 422;
          throw error;
        }
        patch.status = status;
        const now = new Date();
        if (status === 'syncing' || status === 'failed') {
          patch.lastAttemptAt = updates.lastAttemptAt ?? now;
          if (updates.attempts === undefined) {
            patch.attempts = task.attempts + 1;
          }
          if (status === 'failed' && updates.requiresReview === undefined) {
            patch.requiresReview = true;
          }
        }
        if (status === 'completed') {
          patch.completedAt = updates.completedAt ?? now;
          patch.syncedAt = updates.syncedAt ?? patch.completedAt;
          patch.lastError = null;
          if (updates.requiresReview === undefined) {
            patch.requiresReview = false;
          }
        }
      }

      if (updates.markSynced) {
        patch.syncedAt = updates.syncedAt ?? new Date();
        if (updates.requiresReview === undefined) {
          patch.requiresReview = false;
        }
      }
      if (updates.lastAttemptAt && !patch.lastAttemptAt) {
        patch.lastAttemptAt = updates.lastAttemptAt;
      }

      const updated = await LessonProgressSyncQueueModel.updateById(task.id, patch, trx);
      return updated;
    });
  }
}

const lessonOfflineService = LessonOfflineService;

export default lessonOfflineService;
