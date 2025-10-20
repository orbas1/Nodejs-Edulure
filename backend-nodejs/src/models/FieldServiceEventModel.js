import db from '../config/database.js';

const TABLE = 'field_service_events';

const BASE_COLUMNS = [
  'id',
  'order_id as orderId',
  'event_type as eventType',
  'status',
  'notes',
  'author',
  'occurred_at as occurredAt',
  'metadata',
  'created_at as createdAt'
];

function parseJson(value, fallback = {}) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value) ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function deserialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderId: row.orderId,
    eventType: row.eventType,
    status: row.status ?? null,
    notes: row.notes ?? null,
    author: row.author ?? null,
    occurredAt: row.occurredAt,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.createdAt
  };
}

export default class FieldServiceEventModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async listByOrderIds(orderIds, connection = db) {
    if (!orderIds || orderIds.length === 0) return [];
    const rows = await connection(TABLE)
      .select(BASE_COLUMNS)
      .whereIn('order_id', orderIds)
      .orderBy('occurred_at', 'asc');
    return rows.map(deserialize);
  }

  static async create(event, connection = db) {
    const payload = {
      order_id: event.orderId,
      event_type: event.eventType,
      status: event.status ?? null,
      notes: event.notes ?? null,
      author: event.author ?? null,
      occurred_at: event.occurredAt ?? connection.fn.now(),
      metadata: JSON.stringify(event.metadata ?? {})
    };
    const [id] = await connection(TABLE).insert(payload);
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return deserialize(row);
  }
}
