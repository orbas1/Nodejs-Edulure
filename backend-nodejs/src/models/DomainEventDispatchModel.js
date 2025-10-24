import db from '../config/database.js';

function normaliseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseJson(value) {
  if (value === undefined || value === null) {
    return {};
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return {};
  }
}

function resolveDialect(connection = db) {
  const client = connection?.client ?? db?.client;
  const configuredClient = client?.config?.client ?? client?.driverName ?? '';
  return String(configuredClient).toLowerCase();
}

function buildMetadataMergeUpdate(connection, metadata) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  const serialized = JSON.stringify(metadata);
  const dialect = resolveDialect(connection);

  if (dialect.includes('pg')) {
    return connection.raw("COALESCE(metadata, '{}'::jsonb) || ?::jsonb", [serialized]);
  }

  if (dialect.includes('mysql')) {
    return connection.raw(
      'JSON_MERGE_PATCH(COALESCE(metadata, JSON_OBJECT()), CAST(? AS JSON))',
      [serialized]
    );
  }

  return serialized;
}

function mapRow(row) {
  if (!row) return null;
  const attempts = Number(row.attempts ?? 0);
  const metadata = parseJson(row.metadata);

  return {
    id: row.id,
    eventId: row.domain_event_id,
    status: row.status,
    deliveryChannel: row.delivery_channel ?? 'webhook',
    attempts,
    attemptCount: attempts,
    maxAttempts: Number(row.max_attempts ?? 0),
    availableAt: normaliseDate(row.available_at),
    lockedAt: normaliseDate(row.locked_at),
    lockedBy: row.locked_by ?? null,
    deliveredAt: normaliseDate(row.delivered_at),
    failedAt: normaliseDate(row.failed_at),
    lastError: row.last_error ?? null,
    lastErrorAt: normaliseDate(row.last_error_at),
    payloadChecksum: row.payload_checksum ?? null,
    metadata,
    dryRun: Boolean(row.dry_run),
    traceId: row.trace_id ?? null,
    correlationId: row.correlation_id ?? null,
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

    const availableAt = options.availableAt ? normaliseDate(options.availableAt) ?? new Date() : new Date();
    const status = options.status ?? 'pending';
    const metadata = options.metadata ?? {};
    const attempts = Number.isFinite(options.attempts) ? Math.max(0, options.attempts) : 0;
    const maxAttempts = Number.isFinite(options.maxAttempts) ? Math.max(1, options.maxAttempts) : 12;
    const deliveryChannel = options.deliveryChannel ?? 'webhook';
    const payloadChecksum = options.payloadChecksum ?? `evt:${event.id}:${Date.now()}`;

    const payload = {
      domain_event_id: event.id,
      status,
      delivery_channel: deliveryChannel,
      attempts,
      max_attempts: maxAttempts,
      available_at: availableAt,
      locked_at: null,
      locked_by: null,
      payload_checksum: payloadChecksum,
      metadata: JSON.stringify(metadata),
      dry_run: options.dryRun === true,
      trace_id: options.traceId ?? null,
      correlation_id: options.correlationId ?? null
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
        .where({ status: 'pending' })
        .andWhere('available_at', '<=', nowDate)
        .orderBy('available_at', 'asc')
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
          status: 'delivering',
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
      delivered_at: normaliseDate(deliveredAt) ?? new Date(),
      attempts: connection.raw('attempts + 1'),
      locked_at: null,
      locked_by: null,
      updated_at: connection.fn.now()
    };

    const metadataUpdate = buildMetadataMergeUpdate(connection, metadata);
    if (metadataUpdate) {
      updates.metadata = metadataUpdate;
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
      last_error_at: connection.fn.now(),
      attempts: connection.raw('attempts + 1'),
      available_at: nextAvailability,
      locked_at: null,
      locked_by: null,
      failed_at: terminal ? connection.fn.now() : null,
      updated_at: connection.fn.now()
    };

    const metadataUpdate = buildMetadataMergeUpdate(connection, metadata);
    if (metadataUpdate) {
      updates.metadata = metadataUpdate;
    }

    await this.table(connection).where({ id }).update(updates);
  }

  static async recoverStuck({ timeoutMinutes = 15, workerId } = {}, connection = db) {
    const threshold = new Date(Date.now() - Math.max(timeoutMinutes, 1) * 60 * 1000);

    const query = this.table(connection)
      .where({ status: 'delivering' })
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
      .where({ status: 'pending' })
      .count({ count: '*' })
      .first();
    return Number(result?.count ?? 0);
  }
}
