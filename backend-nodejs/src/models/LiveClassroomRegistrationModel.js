import db from '../config/database.js';

const TABLE = 'live_classroom_registrations';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serialiseMetadata(metadata) {
  try {
    return JSON.stringify(metadata ?? {});
  } catch (_error) {
    return JSON.stringify({});
  }
}

function deserialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    classroomId: row.classroomId,
    userId: row.userId,
    status: row.status,
    ticketType: row.ticketType ?? null,
    amountPaid: Number(row.amountPaid ?? 0),
    currency: row.currency ?? 'USD',
    registeredAt: toDate(row.registeredAt),
    attendedAt: toDate(row.attendedAt),
    cancelledAt: toDate(row.cancelledAt),
    metadata: parseJson(row.metadata, {})
  };
}

export default class LiveClassroomRegistrationModel {
  static async findByClassroomAndUser(classroomId, userId, connection = db) {
    if (!classroomId || !userId) {
      return null;
    }

    const row = await connection(`${TABLE} as reg`)
      .select({
        id: 'reg.id',
        classroomId: 'reg.classroom_id',
        userId: 'reg.user_id',
        status: 'reg.status',
        ticketType: 'reg.ticket_type',
        amountPaid: 'reg.amount_paid',
        currency: 'reg.currency',
        registeredAt: 'reg.registered_at',
        attendedAt: 'reg.attended_at',
        cancelledAt: 'reg.cancelled_at',
        metadata: 'reg.metadata'
      })
      .where({ classroom_id: classroomId, user_id: userId })
      .first();

    return deserialize(row);
  }

  static async registerOrUpdate({
    classroomId,
    userId,
    status,
    ticketType,
    amountPaid,
    currency,
    metadata,
    checkpoint
  } = {}, connection = db) {
    if (!classroomId || !userId) {
      throw new Error('Classroom and user identifiers are required to register attendance');
    }

    const existing = await this.findByClassroomAndUser(classroomId, userId, connection);
    const nowIso = new Date().toISOString();

    const existingMetadata = existing?.metadata ?? {};
    const nextMetadata = { ...existingMetadata, ...(metadata ?? {}) };

    if (checkpoint) {
      const history = Array.isArray(existingMetadata.checkpoints)
        ? [...existingMetadata.checkpoints]
        : [];
      const normalisedCheckpoint = {
        ...checkpoint,
        occurredAt: checkpoint.occurredAt ?? nowIso
      };

      if (checkpoint.userId) {
        const existingIndex = history.findIndex(
          (entry) => entry.userId === checkpoint.userId && entry.type === checkpoint.type
        );
        if (existingIndex >= 0) {
          history[existingIndex] = { ...history[existingIndex], ...normalisedCheckpoint };
        } else {
          history.push(normalisedCheckpoint);
        }
      } else {
        history.push(normalisedCheckpoint);
      }

      nextMetadata.checkpoints = history.slice(-50);
      nextMetadata.lastCheckpoint = normalisedCheckpoint;
    }

    if (existing) {
      const patch = {
        metadata: serialiseMetadata(nextMetadata)
      };

      if (status && status !== existing.status) {
        patch.status = status;
        if (status === 'attended') {
          patch.attended_at = connection.fn.now();
        }
        if (status === 'cancelled') {
          patch.cancelled_at = connection.fn.now();
        }
      }

      if (ticketType !== undefined) patch.ticket_type = ticketType ?? null;
      if (amountPaid !== undefined) patch.amount_paid = Number(amountPaid ?? 0);
      if (currency !== undefined) patch.currency = currency ?? 'USD';

      await connection(TABLE).where({ id: existing.id }).update(patch);
      return this.findByClassroomAndUser(classroomId, userId, connection);
    }

    const insert = {
      classroom_id: classroomId,
      user_id: userId,
      status: status ?? 'registered',
      ticket_type: ticketType ?? null,
      amount_paid: Number(amountPaid ?? 0),
      currency: currency ?? 'USD',
      metadata: serialiseMetadata(nextMetadata)
    };

    await connection(TABLE).insert(insert);
    return this.findByClassroomAndUser(classroomId, userId, connection);
  }
}

