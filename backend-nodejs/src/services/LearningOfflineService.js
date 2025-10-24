import db from '../config/database.js';
import ContentAssetModel from '../models/ContentAssetModel.js';
import LearningOfflineAssessmentSubmissionModel from '../models/LearningOfflineAssessmentSubmissionModel.js';
import LearningOfflineDownloadModel from '../models/LearningOfflineDownloadModel.js';
import LearningOfflineModuleSnapshotModel from '../models/LearningOfflineModuleSnapshotModel.js';

const DOWNLOAD_STATE_TO_DB = new Map([
  ['queued', 'queued'],
  ['inprogress', 'in_progress'],
  ['in_progress', 'in_progress'],
  ['completed', 'completed'],
  ['failed', 'failed']
]);

const DOWNLOAD_STATE_FROM_DB = new Map([
  ['queued', 'queued'],
  ['in_progress', 'inProgress'],
  ['completed', 'completed'],
  ['failed', 'failed']
]);

const ASSESSMENT_STATE_TO_DB = new Map([
  ['queued', 'queued'],
  ['syncing', 'syncing'],
  ['completed', 'completed'],
  ['failed', 'failed']
]);

const ASSESSMENT_STATE_FROM_DB = new Map([
  ['queued', 'queued'],
  ['syncing', 'syncing'],
  ['completed', 'completed'],
  ['failed', 'failed']
]);

function clampRatio(value) {
  if (typeof value !== 'number') {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    value = parsed;
  }
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function toIso(value) {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function mapDownloadRecord(record) {
  return {
    id: record.id,
    assetId: record.assetPublicId,
    filename: record.filename,
    state: DOWNLOAD_STATE_FROM_DB.get(record.state) ?? 'queued',
    progress: clampRatio(record.progressRatio ?? 0),
    filePath: record.filePath ?? null,
    errorMessage: record.errorMessage ?? null,
    queuedAt: toIso(record.queuedAt),
    updatedAt: toIso(record.updatedAt),
    completedAt: toIso(record.completedAt),
    failedAt: toIso(record.failedAt),
    lastProgressAt: toIso(record.lastProgressAt),
    courseId: record.coursePublicId ?? (record.courseId ? String(record.courseId) : null),
    moduleId: record.moduleSlug ?? (record.moduleId ? String(record.moduleId) : null),
    metadata: record.metadata ?? {}
  };
}

function mapAssessmentRecord(record) {
  return {
    id: record.clientSubmissionId,
    submissionId: record.clientSubmissionId,
    assessmentId: record.assessmentKey,
    state: ASSESSMENT_STATE_FROM_DB.get(record.state) ?? 'queued',
    payload: record.payload ?? {},
    errorMessage: record.errorMessage ?? null,
    queuedAt: toIso(record.queuedAt),
    syncedAt: toIso(record.syncedAt),
    lastAttemptAt: toIso(record.lastAttemptAt),
    metadata: record.metadata ?? {}
  };
}

function mapSnapshotRecord(record) {
  return {
    id: record.id,
    courseId: record.coursePublicId,
    moduleId: record.moduleSlug,
    completionRatio: clampRatio(record.completionRatio ?? 0),
    notes: record.notes ?? null,
    capturedAt: toIso(record.capturedAt),
    metadata: record.metadata ?? {}
  };
}

function normaliseDownloadState(state) {
  if (!state) return 'queued';
  const normalised = String(state).trim().toLowerCase();
  return DOWNLOAD_STATE_TO_DB.get(normalised) ?? 'queued';
}

function normaliseAssessmentState(state) {
  if (!state) return 'queued';
  const normalised = String(state).trim().toLowerCase();
  return ASSESSMENT_STATE_TO_DB.get(normalised) ?? 'queued';
}

async function resolveAssetId(assetPublicId) {
  if (!assetPublicId) {
    return null;
  }
  try {
    const asset = await ContentAssetModel.findByPublicId(assetPublicId, db);
    return asset?.id ?? null;
  } catch (_error) {
    return null;
  }
}

async function resolveCourseReference({ courseId, moduleId }) {
  const connection = db;
  let courseRowId = null;
  let coursePublicId = courseId ? String(courseId).trim() : null;

  if (coursePublicId) {
    if (/^\d+$/.test(coursePublicId)) {
      const numericId = Number(coursePublicId);
      const row = await connection('courses').select(['id', 'public_id']).where({ id: numericId }).first();
      if (row) {
        courseRowId = row.id;
        coursePublicId = row.public_id ?? coursePublicId;
      }
    } else {
      const row = await connection('courses')
        .select(['id', 'public_id', 'slug'])
        .where({ public_id: coursePublicId })
        .orWhere({ slug: coursePublicId })
        .first();
      if (row) {
        courseRowId = row.id;
        coursePublicId = row.public_id ?? coursePublicId;
      }
    }
  }

  let moduleRowId = null;
  let moduleSlug = moduleId ? String(moduleId).trim() : null;

  if (moduleSlug) {
    if (/^\d+$/.test(moduleSlug)) {
      const numericId = Number(moduleSlug);
      const row = await connection('course_modules').select(['id', 'slug']).where({ id: numericId }).first();
      if (row) {
        moduleRowId = row.id;
        moduleSlug = row.slug ?? moduleSlug;
      }
    } else if (courseRowId) {
      const row = await connection('course_modules')
        .select(['id', 'slug'])
        .where({ course_id: courseRowId, slug: moduleSlug })
        .first();
      if (row) {
        moduleRowId = row.id;
        moduleSlug = row.slug ?? moduleSlug;
      }
    }
  }

  return {
    courseId: courseRowId,
    coursePublicId: coursePublicId ?? (courseId ? String(courseId) : null),
    moduleId: moduleRowId,
    moduleSlug: moduleSlug ?? (moduleId ? String(moduleId) : null)
  };
}

async function resolveAssignment(assessmentId) {
  if (!assessmentId) {
    return { assignmentId: null, assessmentKey: null };
  }

  const trimmed = String(assessmentId).trim();
  if (!trimmed) {
    return { assignmentId: null, assessmentKey: null };
  }

  if (/^\d+$/.test(trimmed)) {
    const numericId = Number(trimmed);
    const row = await db('course_assignments').select(['id']).where({ id: numericId }).first();
    if (row) {
      return { assignmentId: row.id, assessmentKey: `assignment:${row.id}` };
    }
    return { assignmentId: null, assessmentKey: trimmed };
  }

  const row = await db('course_assignments').select(['id', 'title']).where({ title: trimmed }).first();
  if (row) {
    return { assignmentId: row.id, assessmentKey: trimmed };
  }

  return { assignmentId: null, assessmentKey: trimmed };
}

function parseTimestamp(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default class LearningOfflineService {
  static async getSnapshot(userId) {
    if (!userId) {
      const error = new Error('User context required for offline snapshot.');
      error.status = 401;
      throw error;
    }

    const [downloads, assessments, snapshots] = await Promise.all([
      LearningOfflineDownloadModel.listByUserId(userId),
      LearningOfflineAssessmentSubmissionModel.listByUserId(userId),
      LearningOfflineModuleSnapshotModel.listByUserId(userId)
    ]);

    return {
      downloads: downloads.map(mapDownloadRecord),
      assessments: assessments.map(mapAssessmentRecord),
      snapshots: snapshots.map(mapSnapshotRecord)
    };
  }

  static async recordDownload(userId, payload) {
    if (!userId) {
      const error = new Error('User context required.');
      error.status = 401;
      throw error;
    }
    if (!payload?.assetId) {
      const error = new Error('assetId is required to record an offline download.');
      error.status = 400;
      throw error;
    }

    const assetPublicId = String(payload.assetId).trim();
    const assetRowId = await resolveAssetId(assetPublicId);
    const courseReference = await resolveCourseReference({ courseId: payload.courseId, moduleId: payload.moduleId });

    const record = await LearningOfflineDownloadModel.upsertByAsset(userId, assetPublicId, {
      assetId: assetRowId,
      filename: payload.filename ?? assetPublicId,
      state: normaliseDownloadState(payload.state),
      progressRatio: clampRatio(payload.progress ?? payload.progressRatio ?? 0),
      filePath: payload.filePath ?? null,
      errorMessage: payload.errorMessage ?? null,
      queuedAt: parseTimestamp(payload.queuedAt) ?? undefined,
      lastProgressAt: parseTimestamp(payload.lastProgressAt) ?? undefined,
      completedAt: parseTimestamp(payload.completedAt) ?? undefined,
      failedAt: parseTimestamp(payload.failedAt) ?? undefined,
      courseId: courseReference.courseId,
      moduleId: courseReference.moduleId,
      coursePublicId: courseReference.coursePublicId,
      moduleSlug: courseReference.moduleSlug,
      metadata: payload.metadata ?? {}
    });

    return mapDownloadRecord(record);
  }

  static async updateDownload(userId, assetPublicId, payload) {
    if (!userId) {
      const error = new Error('User context required.');
      error.status = 401;
      throw error;
    }
    if (!assetPublicId) {
      const error = new Error('assetId is required.');
      error.status = 400;
      throw error;
    }

    const courseReference = await resolveCourseReference({ courseId: payload?.courseId, moduleId: payload?.moduleId });
    const updates = {};

    if (payload?.state !== undefined) {
      updates.state = normaliseDownloadState(payload.state);
    }
    if (payload?.progress !== undefined || payload?.progressRatio !== undefined) {
      updates.progressRatio = clampRatio(payload.progress ?? payload.progressRatio ?? 0);
    }
    if (payload?.filename !== undefined) updates.filename = payload.filename;
    if (payload?.filePath !== undefined) updates.filePath = payload.filePath;
    if (payload?.errorMessage !== undefined) updates.errorMessage = payload.errorMessage;
    if (payload?.lastProgressAt !== undefined) updates.lastProgressAt = parseTimestamp(payload.lastProgressAt);
    if (payload?.completedAt !== undefined) updates.completedAt = parseTimestamp(payload.completedAt);
    if (payload?.failedAt !== undefined) updates.failedAt = parseTimestamp(payload.failedAt);
    if (payload?.metadata !== undefined) updates.metadata = payload.metadata ?? {};

    if (courseReference.courseId !== undefined) updates.courseId = courseReference.courseId;
    if (courseReference.moduleId !== undefined) updates.moduleId = courseReference.moduleId;
    if (courseReference.coursePublicId !== undefined) updates.coursePublicId = courseReference.coursePublicId;
    if (courseReference.moduleSlug !== undefined) updates.moduleSlug = courseReference.moduleSlug;

    if (payload?.assetId) {
      updates.assetId = await resolveAssetId(String(payload.assetId).trim());
    }

    const record = await LearningOfflineDownloadModel.updateByAsset(userId, String(assetPublicId).trim(), updates);
    if (!record) {
      const created = await LearningOfflineDownloadModel.upsertByAsset(userId, String(assetPublicId).trim(), {
        assetId: updates.assetId ?? (payload?.assetId ? await resolveAssetId(String(payload.assetId).trim()) : null),
        filename: updates.filename ?? payload?.filename ?? String(assetPublicId).trim(),
        state: updates.state ?? normaliseDownloadState(payload?.state),
        progressRatio: updates.progressRatio ?? clampRatio(payload?.progress ?? payload?.progressRatio ?? 0),
        filePath: updates.filePath ?? payload?.filePath ?? null,
        errorMessage: updates.errorMessage ?? payload?.errorMessage ?? null,
        lastProgressAt: updates.lastProgressAt ?? parseTimestamp(payload?.lastProgressAt) ?? undefined,
        completedAt: updates.completedAt ?? parseTimestamp(payload?.completedAt) ?? undefined,
        failedAt: updates.failedAt ?? parseTimestamp(payload?.failedAt) ?? undefined,
        courseId: courseReference.courseId,
        moduleId: courseReference.moduleId,
        coursePublicId: courseReference.coursePublicId,
        moduleSlug: courseReference.moduleSlug,
        metadata: updates.metadata ?? payload?.metadata ?? {}
      });
      return mapDownloadRecord(created);
    }
    return mapDownloadRecord(record);
  }

  static async queueAssessment(userId, payload) {
    if (!userId) {
      const error = new Error('User context required.');
      error.status = 401;
      throw error;
    }
    const submissionId = payload?.submissionId ?? payload?.id ?? payload?.clientSubmissionId;
    if (!submissionId) {
      const error = new Error('submissionId is required to queue an offline assessment.');
      error.status = 400;
      throw error;
    }

    const assignment = await resolveAssignment(payload?.assessmentId ?? payload?.assessmentKey);

    const record = await LearningOfflineAssessmentSubmissionModel.upsertByClientId(userId, String(submissionId).trim(), {
      assignmentId: assignment.assignmentId,
      assessmentKey: assignment.assessmentKey ?? String(payload?.assessmentId ?? submissionId),
      state: normaliseAssessmentState(payload?.state),
      payload: payload?.payload ?? {},
      errorMessage: payload?.errorMessage ?? null,
      queuedAt: parseTimestamp(payload?.queuedAt) ?? undefined,
      syncedAt: parseTimestamp(payload?.syncedAt) ?? undefined,
      lastAttemptAt: parseTimestamp(payload?.lastAttemptAt) ?? undefined,
      metadata: payload?.metadata ?? {}
    });

    return mapAssessmentRecord(record);
  }

  static async updateAssessment(userId, submissionId, payload) {
    if (!userId) {
      const error = new Error('User context required.');
      error.status = 401;
      throw error;
    }
    if (!submissionId) {
      const error = new Error('submissionId is required.');
      error.status = 400;
      throw error;
    }

    const assignment = payload?.assessmentId ? await resolveAssignment(payload.assessmentId) : null;

    const updates = {};
    if (assignment?.assignmentId !== undefined) updates.assignmentId = assignment.assignmentId;
    if (assignment?.assessmentKey !== undefined) updates.assessmentKey = assignment.assessmentKey;
    if (payload?.state !== undefined) updates.state = normaliseAssessmentState(payload.state);
    if (payload?.payload !== undefined) updates.payload = payload.payload;
    if (payload?.errorMessage !== undefined) updates.errorMessage = payload.errorMessage;
    if (payload?.queuedAt !== undefined) updates.queuedAt = parseTimestamp(payload.queuedAt);
    if (payload?.syncedAt !== undefined) updates.syncedAt = parseTimestamp(payload.syncedAt);
    if (payload?.lastAttemptAt !== undefined) updates.lastAttemptAt = parseTimestamp(payload.lastAttemptAt);
    if (payload?.metadata !== undefined) updates.metadata = payload.metadata ?? {};

    const record = await LearningOfflineAssessmentSubmissionModel.updateByClientId(
      userId,
      String(submissionId).trim(),
      updates
    );

    return mapAssessmentRecord(record);
  }

  static async recordModuleSnapshot(userId, payload) {
    if (!userId) {
      const error = new Error('User context required.');
      error.status = 401;
      throw error;
    }
    if (!payload?.courseId || !payload?.moduleId) {
      const error = new Error('courseId and moduleId are required to record module progress.');
      error.status = 400;
      throw error;
    }

    const courseReference = await resolveCourseReference({ courseId: payload.courseId, moduleId: payload.moduleId });

    if (!courseReference.coursePublicId || !courseReference.moduleSlug) {
      const error = new Error('Unable to resolve course/module identifiers for snapshot.');
      error.status = 400;
      throw error;
    }

    const record = await LearningOfflineModuleSnapshotModel.upsertSnapshot(
      userId,
      courseReference.coursePublicId,
      courseReference.moduleSlug,
      {
        courseId: courseReference.courseId,
        moduleId: courseReference.moduleId,
        completionRatio: clampRatio(payload.completionRatio ?? payload.progress ?? 0),
        notes: payload.notes ?? null,
        metadata: payload.metadata ?? {},
        capturedAt: parseTimestamp(payload.capturedAt) ?? undefined
      }
    );

    return mapSnapshotRecord(record);
  }
}
