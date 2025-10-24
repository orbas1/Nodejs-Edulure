import db from '../config/database.js';
import { TABLES as COMPLIANCE_TABLES } from '../database/domains/compliance.js';

const TABLE_NAME = COMPLIANCE_TABLES.DSR_REQUESTS;

function safeParseJson(value, fallback = {}) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function extractUser(row, prefix) {
  const id = row?.[`${prefix}_id`];
  const email = row?.[`${prefix}_email`] ?? null;
  const firstName = row?.[`${prefix}_first_name`] ?? row?.[`${prefix}_firstName`] ?? null;
  const lastName = row?.[`${prefix}_last_name`] ?? row?.[`${prefix}_lastName`] ?? null;

  if (id === undefined && !email && !firstName && !lastName) {
    return null;
  }

  const displayName = [firstName, lastName].filter(Boolean).join(' ');

  return {
    id: id ?? null,
    email,
    firstName,
    lastName,
    displayName: displayName || email || null
  };
}

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    requestUuid: row.request_uuid,
    tenantId: row.tenant_id,
    userId: row.user_id,
    requestType: row.request_type,
    status: row.status,
    submittedAt: row.submitted_at,
    dueAt: row.due_at,
    closedAt: row.closed_at,
    handledBy: row.handled_by,
    escalated: Boolean(row.escalated),
    escalatedAt: row.escalated_at,
    caseReference: row.case_reference,
    slaDays: row.sla_days !== undefined && row.sla_days !== null ? Number(row.sla_days) : null,
    metadata: safeParseJson(row.metadata, {}),
    reporter: extractUser(row, 'reporter'),
    assignee: extractUser(row, 'assignee')
  };
}

function baseQuery(connection = db) {
  return connection({ dr: TABLE_NAME })
    .select(
      'dr.*',
      'reporters.id as reporter_id',
      'reporters.email as reporter_email',
      'reporters.first_name as reporter_first_name',
      'reporters.last_name as reporter_last_name',
      'assignees.id as assignee_id',
      'assignees.email as assignee_email',
      'assignees.first_name as assignee_first_name',
      'assignees.last_name as assignee_last_name'
    )
    .leftJoin({ reporters: 'users' }, 'dr.user_id', 'reporters.id')
    .leftJoin({ assignees: 'users' }, 'dr.handled_by', 'assignees.id');
}

export default class DataSubjectRequestModel {
  static mapRow(row) {
    return mapRow(row);
  }

  static async list({ status, dueBefore, limit = 25, offset = 0 } = {}, connection = db) {
    const query = baseQuery(connection)
      .orderBy('dr.due_at', 'asc')
      .limit(Math.max(0, Number(limit ?? 25)))
      .offset(Math.max(0, Number(offset ?? 0)));

    if (status) {
      query.where('dr.status', status);
    }

    if (dueBefore) {
      query.andWhere('dr.due_at', '<=', dueBefore);
    }

    const rows = await query;
    return rows.map((row) => mapRow(row));
  }

  static async count({ status } = {}, connection = db) {
    const builder = connection(TABLE_NAME);
    if (status) {
      builder.where('status', status);
    }
    const [{ total }] = await builder.count({ total: '*' });
    return Number(total ?? 0);
  }

  static async countOverdue(connection = db) {
    const [{ overdue }] = await connection(TABLE_NAME)
      .whereNot('status', 'completed')
      .andWhere('due_at', '<', connection.fn.now())
      .count({ overdue: '*' });

    return Number(overdue ?? 0);
  }

  static async assign({ requestId, assigneeId }, connection = db) {
    return connection(TABLE_NAME)
      .where({ id: requestId })
      .update({ handled_by: assigneeId, updated_at: connection.fn.now() });
  }

  static async updateStatus({ requestId, status, updates = {} }, connection = db) {
    const payload = { status, updated_at: connection.fn.now(), ...updates };
    return connection(TABLE_NAME).where({ id: requestId }).update(payload);
  }

  static async findById(requestId, connection = db) {
    const row = await baseQuery(connection).where('dr.id', requestId).first();
    if (!row) {
      return null;
    }
    return mapRow(row);
  }
}

export { mapRow as mapDataSubjectRequestRow };
