import db from '../config/database.js';

function parseJson(value, fallback) {
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

function mapDeliveryRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.delivery_id ?? row.id,
    deliveryUuid: row.delivery_uuid,
    status: row.delivery_status ?? row.status,
    attemptCount: Number(row.attempt_count ?? 0),
    maxAttempts: Number(row.max_attempts ?? 0),
    nextAttemptAt: row.next_attempt_at ? new Date(row.next_attempt_at) : null,
    lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at) : null,
    responseCode: row.response_code ?? null,
    responseBody: row.response_body ?? null,
    errorCode: row.error_code ?? null,
    errorMessage: row.error_message ?? null,
    deliveryHeaders: parseJson(row.delivery_headers, {}),
    deliveredAt: row.delivered_at ? new Date(row.delivered_at) : null,
    failedAt: row.failed_at ? new Date(row.failed_at) : null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    event: row.event_id
      ? {
          id: row.event_id,
          eventUuid: row.event_uuid,
          eventType: row.event_type,
          status: row.event_status,
          source: row.event_source,
          correlationId: row.event_correlation_id,
          payload: parseJson(row.event_payload, {}),
          metadata: parseJson(row.event_metadata, {}),
          firstQueuedAt: row.event_first_queued_at ? new Date(row.event_first_queued_at) : null
        }
      : null,
    subscription: row.subscription_id
      ? {
          id: row.subscription_id,
          publicId: row.subscription_public_id,
          name: row.subscription_name,
          targetUrl: row.subscription_target_url,
          signingSecret: row.subscription_signing_secret,
          deliveryTimeoutMs: Number(row.subscription_delivery_timeout_ms ?? 0),
          maxAttempts: Number(row.subscription_max_attempts ?? 0),
          retryBackoffSeconds: Number(row.subscription_retry_backoff_seconds ?? 0),
          circuitBreakerThreshold: Number(row.subscription_circuit_breaker_threshold ?? 0),
          circuitBreakerDurationSeconds: Number(row.subscription_circuit_breaker_duration_seconds ?? 0),
          consecutiveFailures: Number(row.subscription_consecutive_failures ?? 0),
          circuitOpenUntil: row.subscription_circuit_open_until
            ? new Date(row.subscription_circuit_open_until)
            : null,
          staticHeaders: parseJson(row.subscription_static_headers, {}),
          eventTypes: parseJson(row.subscription_event_types, []),
          enabled: Boolean(row.subscription_enabled)
        }
      : null
  };
}

export default class IntegrationWebhookDeliveryModel {
  static tableName = 'integration_webhook_deliveries';

  static mapRow(row) {
    return mapDeliveryRow(row);
  }

  static async enqueueMany(deliveries, connection = db) {
    if (!Array.isArray(deliveries) || deliveries.length === 0) {
      return;
    }

    const payloads = deliveries.map((delivery) => ({
      event_id: delivery.eventId,
      subscription_id: delivery.subscriptionId,
      status: delivery.status ?? 'pending',
      max_attempts: delivery.maxAttempts,
      next_attempt_at: delivery.nextAttemptAt ?? connection.fn.now(),
      delivery_headers: delivery.deliveryHeaders
        ? JSON.stringify(delivery.deliveryHeaders)
        : null
    }));

    await connection.batchInsert(this.tableName, payloads, 50);
  }

  static async claimPending({ limit = 25 } = {}, connection = db) {
    return connection.transaction(async (trx) => {
      const rows = await trx
        .select({
          delivery_id: 'd.id',
          delivery_uuid: 'd.delivery_uuid',
          delivery_status: 'd.status',
          attempt_count: 'd.attempt_count',
          max_attempts: 'd.max_attempts',
          next_attempt_at: 'd.next_attempt_at',
          last_attempt_at: 'd.last_attempt_at',
          response_code: 'd.response_code',
          response_body: 'd.response_body',
          error_code: 'd.error_code',
          error_message: 'd.error_message',
          delivery_headers: 'd.delivery_headers',
          delivered_at: 'd.delivered_at',
          failed_at: 'd.failed_at',
          created_at: 'd.created_at',
          updated_at: 'd.updated_at',
          event_id: 'e.id',
          event_uuid: 'e.event_uuid',
          event_type: 'e.event_type',
          event_status: 'e.status',
          event_source: 'e.source',
          event_correlation_id: 'e.correlation_id',
          event_payload: 'e.payload',
          event_metadata: 'e.metadata',
          event_first_queued_at: 'e.first_queued_at',
          subscription_id: 's.id',
          subscription_public_id: 's.public_id',
          subscription_name: 's.name',
          subscription_target_url: 's.target_url',
          subscription_signing_secret: 's.signing_secret',
          subscription_delivery_timeout_ms: 's.delivery_timeout_ms',
          subscription_max_attempts: 's.max_attempts',
          subscription_retry_backoff_seconds: 's.retry_backoff_seconds',
          subscription_circuit_breaker_threshold: 's.circuit_breaker_threshold',
          subscription_circuit_breaker_duration_seconds: 's.circuit_breaker_duration_seconds',
          subscription_consecutive_failures: 's.consecutive_failures',
          subscription_circuit_open_until: 's.circuit_open_until',
          subscription_static_headers: 's.static_headers',
          subscription_event_types: 's.event_types',
          subscription_enabled: 's.enabled'
        })
        .from({ d: this.tableName })
        .innerJoin({ e: 'integration_webhook_events' }, 'e.id', 'd.event_id')
        .innerJoin({ s: 'integration_webhook_subscriptions' }, 's.id', 'd.subscription_id')
        .where('d.status', 'pending')
        .andWhere('d.next_attempt_at', '<=', trx.fn.now())
        .andWhere((builder) => {
          builder.whereNull('s.circuit_open_until').orWhere('s.circuit_open_until', '<=', trx.fn.now());
        })
        .andWhere((builder) => {
          builder.where('s.enabled', 1).orWhere('s.enabled', true);
        })
        .orderBy('d.next_attempt_at', 'asc')
        .limit(limit)
        .forUpdate()
        .skipLocked();

      if (!rows.length) {
        return [];
      }

      const ids = rows.map((row) => row.delivery_id);

      await trx(this.tableName)
        .whereIn('id', ids)
        .update({ status: 'delivering', last_attempt_at: trx.fn.now(), updated_at: trx.fn.now() });

      return rows.map((row) => mapDeliveryRow(row));
    });
  }

  static async markDelivered(id, { responseCode, responseBody, headers, deliveredAt } = {}, connection = db) {
    await connection(this.tableName)
      .where({ id })
      .update({
        status: 'delivered',
        response_code: responseCode ?? null,
        response_body: responseBody ?? null,
        delivery_headers: headers ? JSON.stringify(headers) : null,
        delivered_at: deliveredAt ?? new Date(),
        attempt_count: connection.raw('attempt_count + 1'),
        updated_at: connection.fn.now()
      });
  }

  static async markFailed(
    id,
    { errorCode, errorMessage, nextAttemptAt, headers, terminal = false } = {},
    connection = db
  ) {
    const updates = {
      error_code: errorCode ?? null,
      error_message: errorMessage ?? null,
      delivery_headers: headers ? JSON.stringify(headers) : null,
      attempt_count: connection.raw('attempt_count + 1'),
      updated_at: connection.fn.now()
    };

    if (terminal) {
      updates.status = 'failed';
      updates.failed_at = connection.fn.now();
    } else {
      updates.status = 'pending';
      updates.next_attempt_at = nextAttemptAt ?? connection.fn.now();
    }

    await connection(this.tableName).where({ id }).update(updates);
  }

  static async summariseStatuses(eventId, connection = db) {
    const rows = await connection(this.tableName)
      .select('status')
      .count({ count: '*' })
      .where({ event_id: eventId })
      .groupBy('status');

    return rows.reduce((acc, row) => {
      acc[row.status] = Number(row.count ?? 0);
      return acc;
    }, {});
  }

  static async recoverStuck({ olderThanMs = 5 * 60 * 1000 } = {}, connection = db) {
    const cutoff = new Date(Date.now() - olderThanMs);

    await connection(this.tableName)
      .where('status', 'delivering')
      .andWhere((builder) => {
        builder.whereNull('last_attempt_at').orWhere('last_attempt_at', '<', cutoff);
      })
      .update({
        status: 'pending',
        next_attempt_at: connection.fn.now(),
        updated_at: connection.fn.now()
      });
  }
}
