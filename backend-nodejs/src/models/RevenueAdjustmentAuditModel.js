import db from '../config/database.js';

const TABLE = 'revenue_adjustment_audit_logs';

function toArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === 'string' && entry.trim().length > 0);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((entry) => typeof entry === 'string' && entry.trim().length > 0);
      }
    } catch (_error) {
      // ignore
    }
    return [trimmed];
  }
  return [];
}

function ensureJson(value, fallback) {
  if (value === null || value === undefined) {
    return JSON.stringify(fallback);
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return JSON.stringify(fallback);
  }
}

function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function mapRecord(record) {
  if (!record) {
    return null;
  }
  return {
    id: record.id,
    adjustmentId: record.adjustment_id,
    action: record.action,
    changedFields: toArray(record.changed_fields),
    previousValues: parseJson(record.previous_values, null),
    nextValues: parseJson(record.next_values, null),
    performedBy: record.performed_by ?? null,
    performedAt: record.performed_at
  };
}

export default class RevenueAdjustmentAuditModel {
  static async record(entry, connection = db) {
    if (!entry?.adjustmentId) {
      throw new Error('adjustmentId is required to record an audit event');
    }

    const payload = {
      adjustment_id: entry.adjustmentId,
      action: entry.action ?? 'updated',
      changed_fields: JSON.stringify(toArray(entry.changedFields)),
      previous_values: ensureJson(entry.previousValues, null),
      next_values: ensureJson(entry.nextValues, null),
      performed_by: entry.performedBy ?? null,
      performed_at: entry.performedAt ?? connection.fn.now()
    };

    await connection(TABLE).insert(payload);
  }

  static async listForAdjustment(adjustmentId, { limit = 25, offset = 0 } = {}, connection = db) {
    const rows = await connection(TABLE)
      .where({ adjustment_id: adjustmentId })
      .orderBy('performed_at', 'desc')
      .limit(limit)
      .offset(offset);
    return rows.map((row) => mapRecord(row));
  }
}
