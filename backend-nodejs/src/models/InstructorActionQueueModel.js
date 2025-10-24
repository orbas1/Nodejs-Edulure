import db from '../config/database.js';

const TABLE = 'instructor_action_queue';

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
    clientActionId: record.client_action_id,
    actionType: record.action_type,
    state: record.state,
    payload: parseJson(record.payload),
    errorMessage: record.error_message ?? null,
    queuedAt: toDate(record.queued_at),
    processedAt: toDate(record.processed_at),
    completedAt: toDate(record.completed_at),
    failedAt: toDate(record.failed_at),
    metadata: parseJson(record.metadata),
    createdAt: toDate(record.created_at),
    updatedAt: toDate(record.updated_at)
  };
}

export default class InstructorActionQueueModel {
  static async listByUserId(userId, connection = db) {
    if (!userId) {
      return [];
    }

    const rows = await connection(TABLE)
      .select([
        'id',
        'user_id',
        'client_action_id',
        'action_type',
        'state',
        'payload',
        'error_message',
        'queued_at',
        'processed_at',
        'completed_at',
        'failed_at',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .where({ user_id: userId })
      .orderBy('queued_at', 'asc');

    return rows.map((row) => mapRecord(row));
  }

  static async findByClientId(userId, clientActionId, connection = db) {
    if (!userId || !clientActionId) {
      return null;
    }

    const row = await connection(TABLE)
      .select([
        'id',
        'user_id',
        'client_action_id',
        'action_type',
        'state',
        'payload',
        'error_message',
        'queued_at',
        'processed_at',
        'completed_at',
        'failed_at',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .where({ user_id: userId, client_action_id: clientActionId })
      .first();

    return mapRecord(row);
  }

  static async upsertByClientId(userId, clientActionId, input, connection = db) {
    if (!userId || !clientActionId) {
      throw new Error('userId and clientActionId are required to upsert instructor actions.');
    }

    const payload = {
      user_id: userId,
      client_action_id: clientActionId,
      action_type: input.actionType,
      state: input.state ?? 'queued',
      payload: serialiseJson(input.payload ?? {}),
      error_message: input.errorMessage ?? null,
      queued_at: input.queuedAt ?? connection.fn.now(),
      processed_at: input.processedAt ?? null,
      completed_at: input.completedAt ?? null,
      failed_at: input.failedAt ?? null,
      metadata: serialiseJson(input.metadata ?? {})
    };

    await connection(TABLE)
      .insert(payload)
      .onConflict(['user_id', 'client_action_id'])
      .merge({
        action_type: payload.action_type,
        state: payload.state,
        payload: payload.payload,
        error_message: payload.error_message,
        processed_at: payload.processed_at,
        completed_at: payload.completed_at,
        failed_at: payload.failed_at,
        metadata: payload.metadata,
        updated_at: connection.fn.now()
      });

    return this.findByClientId(userId, clientActionId, connection);
  }

  static async updateByClientId(userId, clientActionId, updates, connection = db) {
    if (!userId || !clientActionId) {
      throw new Error('userId and clientActionId are required to update instructor actions.');
    }

    const patch = {};

    if (updates.actionType !== undefined) patch.action_type = updates.actionType;
    if (updates.state !== undefined) patch.state = updates.state;
    if (updates.payload !== undefined) patch.payload = serialiseJson(updates.payload);
    if (updates.errorMessage !== undefined) patch.error_message = updates.errorMessage;
    if (updates.queuedAt !== undefined) patch.queued_at = updates.queuedAt;
    if (updates.processedAt !== undefined) patch.processed_at = updates.processedAt;
    if (updates.completedAt !== undefined) patch.completed_at = updates.completedAt;
    if (updates.failedAt !== undefined) patch.failed_at = updates.failedAt;
    if (updates.metadata !== undefined) patch.metadata = serialiseJson(updates.metadata);

    if (Object.keys(patch).length === 0) {
      return this.findByClientId(userId, clientActionId, connection);
    }

    patch.updated_at = connection.fn.now();

    await connection(TABLE)
      .where({ user_id: userId, client_action_id: clientActionId })
      .update(patch);

    return this.findByClientId(userId, clientActionId, connection);
  }

  static async deleteByClientId(userId, clientActionId, connection = db) {
    if (!userId || !clientActionId) {
      return;
    }

    await connection(TABLE).where({ user_id: userId, client_action_id: clientActionId }).delete();
  }
}
