import db from '../config/database.js';
import { TABLES as COMPLIANCE_TABLES } from '../database/domains/compliance.js';

const TABLE = COMPLIANCE_TABLES.DSR_REQUESTS;

function ensureObject(value, fallback = {}) {
  if (!value) {
    return { ...fallback };
  }

  if (typeof value === 'object') {
    return { ...fallback, ...value };
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return { ...fallback, ...parsed };
    }
  } catch (_error) {
    // fall through
  }

  return { ...fallback };
}

function normaliseHistoryEntry(entry, nowIso) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const assignedTo = entry.assignedTo ?? entry.assigneeId ?? entry.handledBy ?? null;
  if (!assignedTo) {
    return null;
  }

  return {
    assignedTo,
    assignedAt: entry.assignedAt ?? nowIso,
    assignedBy: entry.assignedBy ?? null,
    notes: entry.notes ?? null
  };
}

function buildBaseQuery(connection = db) {
  return connection({ dr: TABLE })
    .select(
      'dr.*',
      'reporter.id as reporter_id',
      'reporter.email as reporter_email',
      'reporter.first_name as reporter_first_name',
      'reporter.last_name as reporter_last_name',
      'assignee.id as assignee_id',
      'assignee.email as assignee_email',
      'assignee.first_name as assignee_first_name',
      'assignee.last_name as assignee_last_name'
    )
    .leftJoin({ reporter: 'users' }, 'dr.user_id', 'reporter.id')
    .leftJoin({ assignee: 'users' }, 'dr.handled_by', 'assignee.id');
}

function shapeRow(row) {
  if (!row) {
    return null;
  }

  const metadata = ensureObject(row.metadata);

  return {
    ...row,
    metadata,
    reporter: row.reporter_id
      ? {
          id: row.reporter_id,
          email: row.reporter_email,
          first_name: row.reporter_first_name,
          last_name: row.reporter_last_name
        }
      : null,
    assignee: row.assignee_id
      ? {
          id: row.assignee_id,
          email: row.assignee_email,
          first_name: row.assignee_first_name,
          last_name: row.assignee_last_name
        }
      : null
  };
}

function applyFilters(query, { status, dueBefore } = {}) {
  if (status) {
    query.where('dr.status', status);
  }

  if (dueBefore) {
    query.andWhere('dr.due_at', '<=', dueBefore);
  }

  return query;
}

export default class DataSubjectRequestModel {
  static async list({ status, dueBefore, limit = 25, offset = 0 } = {}, connection = db) {
    const query = buildBaseQuery(connection)
      .orderBy('dr.due_at', 'asc')
      .limit(Math.max(1, Number(limit) || 25))
      .offset(Math.max(0, Number(offset) || 0));

    applyFilters(query, { status, dueBefore });

    const rows = await query;
    return rows.map((row) => shapeRow(row));
  }

  static async count({ status, dueBefore } = {}, connection = db) {
    const query = connection({ dr: TABLE }).count({ total: '*' });
    applyFilters(query, { status, dueBefore });
    const [result] = await query;
    return Number(result?.total ?? 0);
  }

  static async countOverdue(connection = db) {
    const [result] = await connection({ dr: TABLE })
      .where('dr.status', '!=', 'completed')
      .andWhere('dr.due_at', '<', connection.fn.now())
      .count({ overdue: '*' });
    return Number(result?.overdue ?? 0);
  }

  static async findById(id, connection = db) {
    const row = await buildBaseQuery(connection).where('dr.id', id).first();
    return shapeRow(row);
  }

  static async assign(requestId, assigneeId, connection = db) {
    const existing = await this.findById(requestId, connection);
    if (!existing) {
      return null;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const metadata = ensureObject(existing.metadata);
    const history = Array.isArray(metadata.assignmentHistory) ? metadata.assignmentHistory.filter(Boolean) : [];
    history.push(
      normaliseHistoryEntry(
        { assignedTo: assigneeId, assignedAt: nowIso, assignedBy: metadata.lastAssignedBy ?? null },
        nowIso
      )
    );

    const cleanedHistory = history.filter(Boolean).slice(-10);

    await connection(TABLE)
      .where({ id: requestId })
      .update({
        handled_by: assigneeId,
        metadata: JSON.stringify({ ...metadata, assignmentHistory: cleanedHistory, lastAssignedAt: nowIso }),
        updated_at: now
      });

    return this.findById(requestId, connection);
  }

  static async updateStatus(requestId, { status, resolutionNotes } = {}, connection = db) {
    const existing = await this.findById(requestId, connection);
    if (!existing) {
      return null;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const metadata = ensureObject(existing.metadata);

    if (resolutionNotes !== undefined) {
      const trimmed = typeof resolutionNotes === 'string' ? resolutionNotes.trim() : resolutionNotes;
      metadata.resolutionNotes = trimmed && String(trimmed).length ? String(trimmed) : null;
      const history = Array.isArray(metadata.resolutionHistory) ? metadata.resolutionHistory.filter(Boolean) : [];
      history.push({ status, notes: metadata.resolutionNotes, updatedAt: nowIso });
      metadata.resolutionHistory = history.slice(-10);
    }

    const updates = { status, updated_at: now, metadata: JSON.stringify(metadata) };

    if (status === 'completed') {
      updates.closed_at = now;
    }

    if (status === 'escalated') {
      updates.escalated = true;
      updates.escalated_at = now;
    }

    await connection(TABLE).where({ id: requestId }).update(updates);

    return this.findById(requestId, connection);
  }
}

export { ensureObject };
