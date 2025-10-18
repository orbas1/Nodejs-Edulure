import db from '../config/database.js';

function normaliseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    status: row.status,
    priority: row.priority,
    availableAt: normaliseDate(row.available_at),
    attemptCount: Number(row.attempt_count ?? 0),
    lockedAt: normaliseDate(row.locked_at),
    lockedBy: row.locked_by ?? null,
    deliveredAt: normaliseDate(row.delivered_at),
    lastError: row.last_error ?? null,
    metadata: typeof row.metadata === 'object' ? row.metadata : null,
    createdAt: normaliseDate(row.created_at),
    updatedAt: normaliseDate(row.updated_at)
  };
}

export default class DomainEventDispatchModel {
  static table(connection = db) {
    return connection('domain_event_dispatch_queue');
  }

  static async enqueue(event, options = {}, connection = db) {
    if (!event?.id) {
      throw new Error('DomainEventDispatchModel.enqueue requires an event with an id');
    }

    const priority = Number.isFinite(options.priority) ? Math.max(-100, Math.min(100, options.priority)) : 0;
    const availableAt = options.availableAt ? normaliseDate(options.availableAt) ?? new Date() : new Date();
    const status = options.status ?? 'pending';
    const metadata = options.metadata ?? null;

    const payload = {
      event_id: event.id,
      status,
      priority,
      available_at: availableAt,
      metadata: metadata ? JSON.stringify(metadata) : null
    };

    const [id] = await this.table(connection).insert(payload);
    const row = await this.table(connection).where({ id }).first();
    return mapRow(row);
  }

  static async takeBatch({ limit = 25, workerId, now = new Date() } = {}, connection = db) {
    if (!workerId) {
      throw new Error('takeBatch requires a workerId to claim jobs');
    }

    const nowDate = normaliseDate(now) ?? new Date();

    return connection.transaction(async (trx) => {
      const rows = await trx('domain_event_dispatch_queue')
        .whereIn('status', ['pending', 'failed'])
        .andWhere('available_at', '<=', nowDate)
        .orderBy('priority', 'desc')
        .orderBy('id', 'asc')
        .limit(limit)
        .forUpdate()
        .skipLocked();

      if (!rows.length) {
        return [];
      }

      const ids = rows.map((row) => row.id);

      await trx('domain_event_dispatch_queue')
        .whereIn('id', ids)
        .update({
          status: 'processing',
          locked_at: trx.fn.now(),
          locked_by: workerId,
          updated_at: trx.fn.now()
        });

      return rows.map(mapRow);
    });
  }

  static async markDelivered(id, { deliveredAt = new Date(), metadata } = {}, connection = db) {
    if (!id) {
      throw new Error('markDelivered requires a dispatch id');
    }

    const updates = {
      status: 'delivered',
      delivered_at: deliveredAt,
      updated_at: connection.fn.now(),
      locked_at: null,
      locked_by: null
    };

    if (metadata && Object.keys(metadata).length) {
      updates.metadata = JSON.stringify(metadata);
    }

    await this.table(connection).where({ id }).update(updates);
  }

  static async markFailed(
    id,
    { error, nextAvailableAt, terminal = false, metadata } = {},
    connection = db
  ) {
    if (!id) {
      throw new Error('markFailed requires a dispatch id');
    }

    const message = error instanceof Error ? error.message : String(error ?? 'Dispatch failed');
    const nextAvailability = terminal
      ? null
      : normaliseDate(nextAvailableAt) ?? new Date(Date.now() + 60 * 1000);

    const updates = {
      status: terminal ? 'failed' : 'pending',
      last_error: message.slice(0, 2000),
      attempt_count: connection.raw('attempt_count + 1'),
      available_at: nextAvailability,
      locked_at: null,
      locked_by: null,
      updated_at: connection.fn.now()
    };

    if (metadata && Object.keys(metadata).length) {
      updates.metadata = JSON.stringify(metadata);
    }

    await this.table(connection).where({ id }).update(updates);
  }

  static async recoverStuck({ timeoutMinutes = 15, workerId } = {}, connection = db) {
    const threshold = new Date(Date.now() - Math.max(timeoutMinutes, 1) * 60 * 1000);

    const query = this.table(connection)
      .where({ status: 'processing' })
      .andWhere('locked_at', '<=', threshold);

    if (workerId) {
      query.andWhere('locked_by', workerId);
    }

    const rows = await query.select();

    if (!rows.length) {
      return [];
    }

    await this.table(connection)
      .whereIn('id', rows.map((row) => row.id))
      .update({
        status: 'pending',
        locked_at: null,
        locked_by: null,
        updated_at: connection.fn.now()
      });

    return rows.map(mapRow);
  }

  static async countPending(connection = db) {
    const result = await this.table(connection)
      .whereIn('status', ['pending', 'failed'])
      .count({ count: '*' })
      .first();
    return Number(result?.count ?? 0);
  }
}
