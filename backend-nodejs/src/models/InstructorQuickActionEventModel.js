import db from '../config/database.js';

const TABLE = 'instructor_quick_action_events';

const BASE_COLUMNS = [
  'event.id',
  'event.action_id as actionId',
  'event.event_key as eventKey',
  'event.performed_by as performedBy',
  'event.details',
  'event.created_at as createdAt',
  'event.updated_at as updatedAt'
];

function parseJson(value) {
  if (!value) {
    return {};
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_error) {
      return {};
    }
  }
  if (typeof value === 'object' && value !== null) {
    return { ...value };
  }
  return {};
}

function toDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function deserialize(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    actionId: row.actionId,
    eventKey: row.eventKey,
    performedBy: row.performedBy ?? null,
    details: parseJson(row.details),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt)
  };
}

export default class InstructorQuickActionEventModel {
  static async listByActionIds(actionIds, connection = db) {
    if (!actionIds?.length) {
      return [];
    }
    const rows = await connection(`${TABLE} as event`)
      .select(BASE_COLUMNS)
      .whereIn('event.action_id', actionIds)
      .orderBy('event.created_at', 'asc');
    return rows.map(deserialize).filter(Boolean);
  }

  static async create(event, connection = db) {
    const payload = {
      action_id: event.actionId,
      event_key: event.eventKey,
      performed_by: event.performedBy ?? null,
      details: JSON.stringify(event.details ?? {})
    };
    const [id] = await connection(TABLE).insert(payload);
    const row = await connection(`${TABLE} as event`).select(BASE_COLUMNS).where('event.id', id).first();
    return deserialize(row);
  }
}
