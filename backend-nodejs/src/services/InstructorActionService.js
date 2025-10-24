import InstructorActionQueueModel from '../models/InstructorActionQueueModel.js';

const ACTION_TYPES = new Set(['announcement', 'attendance', 'grading', 'schedule', 'note']);
const ACTION_STATES = new Set(['queued', 'processing', 'completed', 'failed']);

function normaliseActionType(value) {
  if (!value) {
    return 'announcement';
  }
  const normalised = String(value).trim().toLowerCase();
  return ACTION_TYPES.has(normalised) ? normalised : 'announcement';
}

function normaliseActionState(value) {
  if (!value) {
    return 'queued';
  }
  const normalised = String(value).trim().toLowerCase();
  return ACTION_STATES.has(normalised) ? normalised : 'queued';
}

function parseTimestamp(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapAction(record) {
  return {
    id: record.clientActionId,
    actionId: record.clientActionId,
    type: record.actionType,
    state: record.state,
    payload: record.payload ?? {},
    errorMessage: record.errorMessage ?? null,
    queuedAt: toIso(record.queuedAt),
    processedAt: toIso(record.processedAt),
    completedAt: toIso(record.completedAt),
    failedAt: toIso(record.failedAt),
    metadata: record.metadata ?? {}
  };
}

export default class InstructorActionService {
  static async list(userId) {
    if (!userId) {
      const error = new Error('User context required.');
      error.status = 401;
      throw error;
    }

    const actions = await InstructorActionQueueModel.listByUserId(userId);
    return actions.map(mapAction);
  }

  static async enqueue(userId, payload) {
    if (!userId) {
      const error = new Error('User context required.');
      error.status = 401;
      throw error;
    }

    const clientActionId = payload?.clientActionId ?? payload?.actionId ?? payload?.id;
    if (!clientActionId) {
      const error = new Error('clientActionId is required to queue an instructor action.');
      error.status = 400;
      throw error;
    }

    const record = await InstructorActionQueueModel.upsertByClientId(userId, String(clientActionId).trim(), {
      actionType: normaliseActionType(payload?.type),
      state: normaliseActionState(payload?.state),
      payload: payload?.payload ?? {},
      errorMessage: payload?.errorMessage ?? null,
      queuedAt: parseTimestamp(payload?.queuedAt) ?? undefined,
      processedAt: parseTimestamp(payload?.processedAt) ?? undefined,
      completedAt: parseTimestamp(payload?.completedAt) ?? undefined,
      failedAt: parseTimestamp(payload?.failedAt) ?? undefined,
      metadata: payload?.metadata ?? {}
    });

    return mapAction(record);
  }

  static async update(userId, clientActionId, payload) {
    if (!userId) {
      const error = new Error('User context required.');
      error.status = 401;
      throw error;
    }
    if (!clientActionId) {
      const error = new Error('clientActionId is required.');
      error.status = 400;
      throw error;
    }

    const updates = {};
    if (payload?.type !== undefined) updates.actionType = normaliseActionType(payload.type);
    if (payload?.state !== undefined) updates.state = normaliseActionState(payload.state);
    if (payload?.payload !== undefined) updates.payload = payload.payload ?? {};
    if (payload?.errorMessage !== undefined) updates.errorMessage = payload.errorMessage;
    if (payload?.queuedAt !== undefined) updates.queuedAt = parseTimestamp(payload.queuedAt);
    if (payload?.processedAt !== undefined) updates.processedAt = parseTimestamp(payload.processedAt);
    if (payload?.completedAt !== undefined) updates.completedAt = parseTimestamp(payload.completedAt);
    if (payload?.failedAt !== undefined) updates.failedAt = parseTimestamp(payload.failedAt);
    if (payload?.metadata !== undefined) updates.metadata = payload.metadata ?? {};

    const record = await InstructorActionQueueModel.updateByClientId(userId, String(clientActionId).trim(), updates);
    return mapAction(record);
  }

  static async clear(userId, clientActionId) {
    if (!userId || !clientActionId) {
      return;
    }
    await InstructorActionQueueModel.deleteByClientId(userId, String(clientActionId).trim());
  }
}
