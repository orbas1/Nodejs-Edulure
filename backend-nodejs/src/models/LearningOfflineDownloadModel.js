import db from '../config/database.js';

const TABLE = 'learning_offline_downloads';

function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function mapRecord(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    userId: record.user_id,
    assetId: record.asset_id,
    assetPublicId: record.asset_public_id,
    courseId: record.course_id,
    moduleId: record.module_id,
    coursePublicId: record.course_public_id ?? null,
    moduleSlug: record.module_slug ?? null,
    filename: record.filename,
    state: record.state,
    progressRatio: toNumber(record.progress_ratio),
    filePath: record.file_path ?? null,
    errorMessage: record.error_message ?? null,
    queuedAt: toDate(record.queued_at),
    lastProgressAt: toDate(record.last_progress_at),
    completedAt: toDate(record.completed_at),
    failedAt: toDate(record.failed_at),
    metadata: parseJson(record.metadata),
    createdAt: toDate(record.created_at),
    updatedAt: toDate(record.updated_at)
  };
}

function serialiseMetadata(metadata) {
  if (!metadata) {
    return JSON.stringify({});
  }
  if (typeof metadata === 'string') {
    return metadata;
  }
  try {
    return JSON.stringify(metadata);
  } catch (_error) {
    return JSON.stringify({});
  }
}

export default class LearningOfflineDownloadModel {
  static async listByUserId(userId, connection = db) {
    if (!userId) {
      return [];
    }

    const rows = await connection(TABLE)
      .select([
        'id',
        'user_id',
        'asset_id',
        'asset_public_id',
        'course_id',
        'module_id',
        'course_public_id',
        'module_slug',
        'filename',
        'state',
        'progress_ratio',
        'file_path',
        'error_message',
        'queued_at',
        'last_progress_at',
        'completed_at',
        'failed_at',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .where({ user_id: userId })
      .orderBy('queued_at', 'desc');

    return rows.map((row) => mapRecord(row));
  }

  static async findByAsset(userId, assetPublicId, connection = db) {
    if (!userId || !assetPublicId) {
      return null;
    }

    const row = await connection(TABLE)
      .select([
        'id',
        'user_id',
        'asset_id',
        'asset_public_id',
        'course_id',
        'module_id',
        'course_public_id',
        'module_slug',
        'filename',
        'state',
        'progress_ratio',
        'file_path',
        'error_message',
        'queued_at',
        'last_progress_at',
        'completed_at',
        'failed_at',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .where({ user_id: userId, asset_public_id: assetPublicId })
      .first();

    return mapRecord(row);
  }

  static async upsertByAsset(userId, assetPublicId, input, connection = db) {
    if (!userId || !assetPublicId) {
      throw new Error('userId and assetPublicId are required for offline download upsert.');
    }

    const payload = {
      user_id: userId,
      asset_public_id: assetPublicId,
      asset_id: input.assetId ?? null,
      course_id: input.courseId ?? null,
      module_id: input.moduleId ?? null,
      course_public_id: input.coursePublicId ?? null,
      module_slug: input.moduleSlug ?? null,
      filename: input.filename ?? assetPublicId,
      state: input.state ?? 'queued',
      progress_ratio: toNumber(input.progressRatio ?? 0),
      file_path: input.filePath ?? null,
      error_message: input.errorMessage ?? null,
      queued_at: input.queuedAt ?? connection.fn.now(),
      last_progress_at: input.lastProgressAt ?? null,
      completed_at: input.completedAt ?? null,
      failed_at: input.failedAt ?? null,
      metadata: serialiseMetadata(input.metadata)
    };

    await connection(TABLE)
      .insert(payload)
      .onConflict(['user_id', 'asset_public_id'])
      .merge({
        asset_id: payload.asset_id,
        course_id: payload.course_id,
        module_id: payload.module_id,
        course_public_id: payload.course_public_id,
        module_slug: payload.module_slug,
        filename: payload.filename,
        state: payload.state,
        progress_ratio: payload.progress_ratio,
        file_path: payload.file_path,
        error_message: payload.error_message,
        last_progress_at: payload.last_progress_at,
        completed_at: payload.completed_at,
        failed_at: payload.failed_at,
        metadata: payload.metadata,
        updated_at: connection.fn.now()
      });

    return this.findByAsset(userId, assetPublicId, connection);
  }

  static async updateByAsset(userId, assetPublicId, updates, connection = db) {
    if (!userId || !assetPublicId) {
      throw new Error('userId and assetPublicId are required to update offline downloads.');
    }

    const patch = {};

    if (updates.assetId !== undefined) patch.asset_id = updates.assetId;
    if (updates.courseId !== undefined) patch.course_id = updates.courseId;
    if (updates.moduleId !== undefined) patch.module_id = updates.moduleId;
    if (updates.coursePublicId !== undefined) patch.course_public_id = updates.coursePublicId;
    if (updates.moduleSlug !== undefined) patch.module_slug = updates.moduleSlug;
    if (updates.filename !== undefined) patch.filename = updates.filename;
    if (updates.state !== undefined) patch.state = updates.state;
    if (updates.progressRatio !== undefined) patch.progress_ratio = toNumber(updates.progressRatio);
    if (updates.filePath !== undefined) patch.file_path = updates.filePath;
    if (updates.errorMessage !== undefined) patch.error_message = updates.errorMessage;
    if (updates.lastProgressAt !== undefined) patch.last_progress_at = updates.lastProgressAt;
    if (updates.completedAt !== undefined) patch.completed_at = updates.completedAt;
    if (updates.failedAt !== undefined) patch.failed_at = updates.failedAt;
    if (updates.metadata !== undefined) patch.metadata = serialiseMetadata(updates.metadata);

    if (Object.keys(patch).length === 0) {
      return this.findByAsset(userId, assetPublicId, connection);
    }

    patch.updated_at = connection.fn.now();

    await connection(TABLE).where({ user_id: userId, asset_public_id: assetPublicId }).update(patch);

    return this.findByAsset(userId, assetPublicId, connection);
  }
}
