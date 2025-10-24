import db from '../config/database.js';

const TABLE = 'learning_offline_assessment_submissions';

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

function serialiseJson(value) {
  if (!value) {
    return JSON.stringify({});
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return JSON.stringify({});
  }
}

function mapRecord(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    userId: record.user_id,
    clientSubmissionId: record.client_submission_id,
    assignmentId: record.assignment_id,
    assessmentKey: record.assessment_key,
    state: record.state,
    payload: parseJson(record.payload),
    errorMessage: record.error_message ?? null,
    queuedAt: toDate(record.queued_at),
    syncedAt: toDate(record.synced_at),
    lastAttemptAt: toDate(record.last_attempt_at),
    metadata: parseJson(record.metadata),
    createdAt: toDate(record.created_at),
    updatedAt: toDate(record.updated_at)
  };
}

export default class LearningOfflineAssessmentSubmissionModel {
  static async listByUserId(userId, connection = db) {
    if (!userId) {
      return [];
    }

    const rows = await connection(TABLE)
      .select([
        'id',
        'user_id',
        'client_submission_id',
        'assignment_id',
        'assessment_key',
        'state',
        'payload',
        'error_message',
        'queued_at',
        'synced_at',
        'last_attempt_at',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .where({ user_id: userId })
      .orderBy('queued_at', 'asc');

    return rows.map((row) => mapRecord(row));
  }

  static async findByClientId(userId, clientSubmissionId, connection = db) {
    if (!userId || !clientSubmissionId) {
      return null;
    }

    const row = await connection(TABLE)
      .select([
        'id',
        'user_id',
        'client_submission_id',
        'assignment_id',
        'assessment_key',
        'state',
        'payload',
        'error_message',
        'queued_at',
        'synced_at',
        'last_attempt_at',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .where({ user_id: userId, client_submission_id: clientSubmissionId })
      .first();

    return mapRecord(row);
  }

  static async upsertByClientId(userId, clientSubmissionId, input, connection = db) {
    if (!userId || !clientSubmissionId) {
      throw new Error('userId and clientSubmissionId are required to upsert assessment submissions.');
    }

    const payload = {
      user_id: userId,
      client_submission_id: clientSubmissionId,
      assignment_id: input.assignmentId ?? null,
      assessment_key: input.assessmentKey ?? clientSubmissionId,
      state: input.state ?? 'queued',
      payload: serialiseJson(input.payload ?? {}),
      error_message: input.errorMessage ?? null,
      queued_at: input.queuedAt ?? connection.fn.now(),
      synced_at: input.syncedAt ?? null,
      last_attempt_at: input.lastAttemptAt ?? null,
      metadata: serialiseJson(input.metadata ?? {})
    };

    await connection(TABLE)
      .insert(payload)
      .onConflict(['user_id', 'client_submission_id'])
      .merge({
        assignment_id: payload.assignment_id,
        assessment_key: payload.assessment_key,
        state: payload.state,
        payload: payload.payload,
        error_message: payload.error_message,
        synced_at: payload.synced_at,
        last_attempt_at: payload.last_attempt_at,
        metadata: payload.metadata,
        updated_at: connection.fn.now()
      });

    return this.findByClientId(userId, clientSubmissionId, connection);
  }

  static async updateByClientId(userId, clientSubmissionId, updates, connection = db) {
    if (!userId || !clientSubmissionId) {
      throw new Error('userId and clientSubmissionId are required to update assessment submissions.');
    }

    const patch = {};

    if (updates.assignmentId !== undefined) patch.assignment_id = updates.assignmentId;
    if (updates.assessmentKey !== undefined) patch.assessment_key = updates.assessmentKey;
    if (updates.state !== undefined) patch.state = updates.state;
    if (updates.payload !== undefined) patch.payload = serialiseJson(updates.payload);
    if (updates.errorMessage !== undefined) patch.error_message = updates.errorMessage;
    if (updates.queuedAt !== undefined) patch.queued_at = updates.queuedAt;
    if (updates.syncedAt !== undefined) patch.synced_at = updates.syncedAt;
    if (updates.lastAttemptAt !== undefined) patch.last_attempt_at = updates.lastAttemptAt;
    if (updates.metadata !== undefined) patch.metadata = serialiseJson(updates.metadata);

    if (Object.keys(patch).length === 0) {
      return this.findByClientId(userId, clientSubmissionId, connection);
    }

    patch.updated_at = connection.fn.now();

    await connection(TABLE)
      .where({ user_id: userId, client_submission_id: clientSubmissionId })
      .update(patch);

    return this.findByClientId(userId, clientSubmissionId, connection);
  }

  static async deleteByClientId(userId, clientSubmissionId, connection = db) {
    if (!userId || !clientSubmissionId) {
      return;
    }

    await connection(TABLE).where({ user_id: userId, client_submission_id: clientSubmissionId }).delete();
  }
}
