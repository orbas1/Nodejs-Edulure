import db from '../config/database.js';

const TABLE = 'tutor_availability_slots';

const BASE_COLUMNS = [
  'id',
  'tutor_id as tutorId',
  'start_at as startAt',
  'end_at as endAt',
  'status',
  'is_recurring as isRecurring',
  'recurrence_rule as recurrenceRule',
  'metadata',
  'created_at as createdAt'
];

function parseJson(value, fallback = {}) {
  if (!value) return { ...fallback };
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') {
        return { ...fallback, ...parsed };
      }
      return { ...fallback };
    } catch (_error) {
      return { ...fallback };
    }
  }
  if (typeof value === 'object' && value !== null) {
    return { ...fallback, ...value };
  }
  return { ...fallback };
}

function serializeJson(value, fallback = {}) {
  if (value === null || value === undefined) return JSON.stringify(fallback);
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function deserialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    tutorId: row.tutorId,
    startAt: row.startAt instanceof Date ? row.startAt : row.startAt ? new Date(row.startAt) : null,
    endAt: row.endAt instanceof Date ? row.endAt : row.endAt ? new Date(row.endAt) : null,
    status: row.status,
    isRecurring: Boolean(row.isRecurring),
    recurrenceRule: row.recurrenceRule ?? null,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.createdAt instanceof Date ? row.createdAt : row.createdAt ? new Date(row.createdAt) : null
  };
}

export default class TutorAvailabilitySlotModel {
  static async listByTutorId(tutorId, { status, from, to } = {}, connection = db) {
    if (!tutorId) return [];
    const query = connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ tutor_id: tutorId })
      .orderBy('start_at', 'asc');

    if (status && status !== 'all') {
      query.andWhere('status', status);
    }

    if (from) {
      query.andWhere('start_at', '>=', from);
    }

    if (to) {
      query.andWhere('start_at', '<=', to);
    }

    const rows = await query;
    return rows.map(deserialize);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return deserialize(row);
  }

  static async create(slot, connection = db) {
    const payload = {
      tutor_id: slot.tutorId,
      start_at: slot.startAt,
      end_at: slot.endAt,
      status: slot.status ?? 'open',
      is_recurring: slot.isRecurring ? 1 : 0,
      recurrence_rule: slot.recurrenceRule ?? null,
      metadata: serializeJson(slot.metadata ?? {}, {})
    };

    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.startAt !== undefined) payload.start_at = updates.startAt;
    if (updates.endAt !== undefined) payload.end_at = updates.endAt;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.isRecurring !== undefined) payload.is_recurring = updates.isRecurring ? 1 : 0;
    if (updates.recurrenceRule !== undefined) payload.recurrence_rule = updates.recurrenceRule ?? null;
    if (updates.metadata !== undefined) payload.metadata = serializeJson(updates.metadata ?? {}, {});

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE).where({ id }).update(payload);
    return this.findById(id, connection);
  }

  static async deleteById(id, connection = db) {
    await connection(TABLE).where({ id }).del();
  }
}
