import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function serialiseJson(value, fallback) {
  if (value === undefined || value === null) {
    return JSON.stringify(fallback);
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    caseId: row.caseId,
    actionId: row.actionId ?? undefined,
    assignedTo: row.assignedTo ?? undefined,
    status: row.status,
    dueAt: row.dueAt,
    completedAt: row.completedAt ?? undefined,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export default class ModerationFollowUpModel {
  static async schedule(followUp, connection = db) {
    const payload = {
      case_id: followUp.caseId,
      action_id: followUp.actionId ?? null,
      assigned_to: followUp.assignedTo ?? null,
      status: followUp.status ?? 'pending',
      due_at: followUp.dueAt,
      completed_at: followUp.completedAt ?? null,
      metadata: serialiseJson(followUp.metadata ?? {}, {}),
      created_at: followUp.createdAt ?? undefined,
      updated_at: followUp.updatedAt ?? undefined
    };

    const insertPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    );

    const [id] = await connection('moderation_follow_ups').insert(insertPayload);
    const row = await connection('moderation_follow_ups')
      .select({
        id: 'id',
        caseId: 'case_id',
        actionId: 'action_id',
        assignedTo: 'assigned_to',
        status: 'status',
        dueAt: 'due_at',
        completedAt: 'completed_at',
        metadata: 'metadata',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      })
      .where({ id })
      .first();
    return mapRow(row);
  }

  static async listDue({ now = new Date(), limit = 50 } = {}, connection = db) {
    const rows = await connection('moderation_follow_ups')
      .select({
        id: 'id',
        caseId: 'case_id',
        actionId: 'action_id',
        assignedTo: 'assigned_to',
        status: 'status',
        dueAt: 'due_at',
        completedAt: 'completed_at',
        metadata: 'metadata',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      })
      .where('status', 'pending')
      .andWhere('due_at', '<=', now)
      .orderBy('due_at', 'asc')
      .limit(limit);
    return rows.map((row) => mapRow(row));
  }

  static async listForCase(caseId, connection = db) {
    const rows = await connection('moderation_follow_ups')
      .select({
        id: 'id',
        caseId: 'case_id',
        actionId: 'action_id',
        assignedTo: 'assigned_to',
        status: 'status',
        dueAt: 'due_at',
        completedAt: 'completed_at',
        metadata: 'metadata',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      })
      .where({ case_id: caseId })
      .orderBy('due_at', 'asc');
    return rows.map((row) => mapRow(row));
  }

  static async listForCases(caseIds = [], connection = db) {
    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      return [];
    }

    const rows = await connection('moderation_follow_ups')
      .select({
        id: 'id',
        caseId: 'case_id',
        actionId: 'action_id',
        assignedTo: 'assigned_to',
        status: 'status',
        dueAt: 'due_at',
        completedAt: 'completed_at',
        metadata: 'metadata',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      })
      .whereIn('case_id', caseIds)
      .orderBy('due_at', 'asc');

    return rows.map((row) => mapRow(row));
  }

  static async markCompleted(id, updates = {}, connection = db) {
    const payload = {
      status: updates.status ?? 'completed',
      completed_at: updates.completedAt ?? new Date(),
      updated_at: connection.fn.now(),
      metadata: updates.metadata !== undefined ? serialiseJson(updates.metadata, {}) : undefined
    };

    const updatePayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    );

    await connection('moderation_follow_ups').where({ id }).update(updatePayload);
    const row = await connection('moderation_follow_ups')
      .select({
        id: 'id',
        caseId: 'case_id',
        actionId: 'action_id',
        assignedTo: 'assigned_to',
        status: 'status',
        dueAt: 'due_at',
        completedAt: 'completed_at',
        metadata: 'metadata',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      })
      .where({ id })
      .first();
    return mapRow(row);
  }

  static async cancelByActionId(actionId, connection = db) {
    if (!actionId) {
      return 0;
    }

    const payload = {
      status: 'cancelled',
      updated_at: connection.fn.now()
    };

    return connection('moderation_follow_ups')
      .where({ action_id: actionId, status: 'pending' })
      .update(payload);
  }

  static async countPending(connection = db) {
    const [row] = await connection('moderation_follow_ups')
      .where({ status: 'pending' })
      .count({ total: '*' });
    return Number(row?.total ?? 0);
  }

  static async countDue(now = new Date(), connection = db) {
    const [row] = await connection('moderation_follow_ups')
      .where('status', 'pending')
      .andWhere('due_at', '<=', now)
      .count({ total: '*' });
    return Number(row?.total ?? 0);
  }
}
