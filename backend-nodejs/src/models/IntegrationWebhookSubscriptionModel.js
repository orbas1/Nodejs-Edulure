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

function normaliseBoolean(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return value === 1 || value === '1' || value === 'true';
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapRow(row) {
  if (!row) {
    return null;
  }

  const eventTypes = parseJson(row.event_types, []);
  const staticHeaders = parseJson(row.static_headers, {});
  const metadata = parseJson(row.metadata, {});
  const circuitOpenUntil = row.circuit_open_until ? new Date(row.circuit_open_until) : null;

  return {
    id: row.id,
    publicId: row.public_id,
    name: row.name,
    targetUrl: row.target_url,
    enabled: normaliseBoolean(row.enabled),
    eventTypes: Array.isArray(eventTypes) ? eventTypes : [],
    staticHeaders,
    signingSecret: row.signing_secret,
    deliveryTimeoutMs: toNumber(row.delivery_timeout_ms, 5000),
    maxAttempts: toNumber(row.max_attempts, 6),
    retryBackoffSeconds: toNumber(row.retry_backoff_seconds, 60),
    circuitBreakerThreshold: toNumber(row.circuit_breaker_threshold, 5),
    circuitBreakerDurationSeconds: toNumber(row.circuit_breaker_duration_seconds, 900),
    consecutiveFailures: toNumber(row.consecutive_failures, 0),
    lastFailureAt: row.last_failure_at ? new Date(row.last_failure_at) : null,
    circuitOpenUntil,
    metadata,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    get isCircuitOpen() {
      if (!circuitOpenUntil) {
        return false;
      }

      return circuitOpenUntil.getTime() > Date.now();
    }
  };
}

function eventTypeMatches(pattern, eventType) {
  if (!pattern) {
    return false;
  }

  if (pattern === '*') {
    return true;
  }

  if (pattern === eventType) {
    return true;
  }

  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return eventType.startsWith(prefix);
  }

  return false;
}

function matchesAnyPattern(patterns, eventType) {
  if (!Array.isArray(patterns) || patterns.length === 0) {
    return false;
  }

  return patterns.some((pattern) => eventTypeMatches(pattern, eventType));
}

export default class IntegrationWebhookSubscriptionModel {
  static tableName = 'integration_webhook_subscriptions';

  static mapRow(row) {
    return mapRow(row);
  }

  static async findById(id, connection = db) {
    const row = await connection(this.tableName).where({ id }).first();
    return mapRow(row);
  }

  static async findByPublicId(publicId, connection = db) {
    const row = await connection(this.tableName).where({ public_id: publicId }).first();
    return mapRow(row);
  }

  static async findForEvent(eventType, connection = db) {
    const rows = await connection(this.tableName)
      .where({ enabled: 1 })
      .orWhere({ enabled: true });

    return rows
      .map((row) => mapRow(row))
      .filter((subscription) => matchesAnyPattern(subscription.eventTypes, eventType));
  }

  static async recordSuccess(id, connection = db) {
    await connection(this.tableName)
      .where({ id })
      .update({
        consecutive_failures: 0,
        circuit_open_until: null,
        updated_at: connection.fn.now()
      });

    return this.findById(id, connection);
  }

  static async recordFailure(
    id,
    { failureAt = new Date(), circuitOpenUntil, errorCode } = {},
    connection = db
  ) {
    const updates = {
      consecutive_failures: connection.raw('consecutive_failures + 1'),
      last_failure_at: failureAt,
      updated_at: connection.fn.now()
    };

    if (circuitOpenUntil) {
      updates.circuit_open_until = circuitOpenUntil;
    }

    if (errorCode) {
      updates.metadata = connection.raw(
        'JSON_MERGE_PATCH(IFNULL(metadata, JSON_OBJECT()), ?)',
        JSON.stringify({ lastErrorCode: errorCode })
      );
    }

    await connection(this.tableName).where({ id }).update(updates);

    return this.findById(id, connection);
  }

  static matchesEventType(subscription, eventType) {
    if (!subscription) {
      return false;
    }

    return matchesAnyPattern(subscription.eventTypes, eventType);
  }
}
