import db from '../config/database.js';

function normaliseDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseJson(value) {
  if (!value) {
    return null;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function mapRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    dispatchId: row.dispatch_id,
    eventId: row.event_id,
    eventType: row.event_type,
    attemptCount: Number(row.attempt_count ?? 0),
    failureReason: row.failure_reason,
    failureMessage: row.failure_message ?? null,
    eventPayload: parseJson(row.event_payload),
    metadata: parseJson(row.metadata) ?? {},
    failedAt: normaliseDate(row.failed_at),
    createdAt: normaliseDate(row.created_at),
    updatedAt: normaliseDate(row.updated_at)
  };
}

function sanitiseString(value, { maxLength, fallback = null } = {}) {
  if (value === null || value === undefined) {
    return fallback;
  }
  const text = String(value);
  if (!maxLength || text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength);
}

export default class DomainEventDeadLetterModel {
  static table(connection = db) {
    return connection('domain_event_dead_letters');
  }

  static async record(
    {
      dispatchId,
      eventId,
      eventType,
      attemptCount,
      failureReason,
      failureMessage,
      eventPayload,
      metadata,
      failedAt = new Date()
    },
    connection = db
  ) {
    if (!dispatchId) {
      throw new Error('DomainEventDeadLetterModel.record requires dispatchId');
    }
    if (!eventId) {
      throw new Error('DomainEventDeadLetterModel.record requires eventId');
    }

    const payload = {
      dispatch_id: dispatchId,
      event_id: eventId,
      event_type: sanitiseString(eventType ?? 'unknown', { maxLength: 255, fallback: 'unknown' }),
      attempt_count: Math.max(Number(attemptCount ?? 0), 0),
      failure_reason: sanitiseString(failureReason ?? 'dispatch_failed', { maxLength: 120, fallback: 'dispatch_failed' }),
      failure_message: sanitiseString(failureMessage ?? null, { maxLength: 4000, fallback: null }),
      event_payload: eventPayload ? JSON.stringify(eventPayload) : null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      failed_at: failedAt
    };

    await this.table(connection)
      .insert(payload)
      .onConflict('dispatch_id')
      .merge({
        event_type: payload.event_type,
        attempt_count: payload.attempt_count,
        failure_reason: payload.failure_reason,
        failure_message: payload.failure_message,
        event_payload: payload.event_payload,
        metadata: payload.metadata,
        failed_at: payload.failed_at,
        updated_at: connection.fn.now()
      });
  }

  static async count(connection = db) {
    const result = await this.table(connection).count({ total: '*' }).first();
    return Number(result?.total ?? result?.count ?? 0);
  }

  static async listRecent({ limit = 50 } = {}, connection = db) {
    const rows = await this.table(connection)
      .select()
      .orderBy('failed_at', 'desc')
      .limit(limit);
    return rows.map(mapRow);
  }

  static async purgeOlderThan({ olderThan }, connection = db) {
    const threshold = normaliseDate(olderThan);
    if (!threshold) {
      return 0;
    }
    const result = await this.table(connection).where('failed_at', '<', threshold).del();
    return result ?? 0;
  }

  static async findByDispatchId(dispatchId, connection = db) {
    const row = await this.table(connection).where({ dispatch_id: dispatchId }).first();
    return mapRow(row);
  }
}
