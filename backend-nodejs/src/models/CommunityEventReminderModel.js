import db from '../config/database.js';
import {
  ensureIntegerInRange,
  readJsonColumn,
  writeJsonColumn
} from '../utils/modelUtils.js';

const TABLE = 'community_event_reminders';
const STATUS_OPTIONS = new Set(['pending', 'processing', 'sent', 'failed', 'cancelled']);
const CHANNEL_OPTIONS = new Set(['email', 'sms', 'push', 'in_app']);

function normalisePrimaryId(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${fieldName} is required`);
  }

  return ensureIntegerInRange(value, { fieldName, min: 1 });
}

function normaliseStatus(status) {
  if (status === undefined || status === null || status === '') {
    return 'pending';
  }

  const candidate = String(status).trim().toLowerCase();
  if (!STATUS_OPTIONS.has(candidate)) {
    throw new Error(`Unsupported reminder status '${status}'`);
  }
  return candidate;
}

function normaliseChannel(channel) {
  if (channel === undefined || channel === null || channel === '') {
    return 'email';
  }

  const candidate = String(channel).trim().toLowerCase();
  if (!CHANNEL_OPTIONS.has(candidate)) {
    throw new Error(`Unsupported reminder channel '${channel}'`);
  }
  return candidate;
}

function normaliseTimestamp(value, { fieldName, required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new Error(`${fieldName} is required`);
    }
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid datetime`);
  }
  return date;
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    status: row.status,
    channel: row.channel,
    remindAt: row.remind_at ?? null,
    sentAt: row.sent_at ?? null,
    lastAttemptAt: row.last_attempt_at ?? null,
    attemptCount: Number(row.attempt_count ?? 0),
    failureReason: row.failure_reason ?? null,
    metadata: readJsonColumn(row.metadata, {})
  };
}

function buildPayload(reminder) {
  if (!reminder) {
    throw new Error('Reminder payload is required');
  }

  return {
    event_id: normalisePrimaryId(reminder.eventId, 'eventId'),
    user_id: normalisePrimaryId(reminder.userId, 'userId'),
    status: normaliseStatus(reminder.status),
    channel: normaliseChannel(reminder.channel),
    remind_at: normaliseTimestamp(reminder.remindAt, { fieldName: 'remindAt', required: true }),
    sent_at: normaliseTimestamp(reminder.sentAt, { fieldName: 'sentAt', required: false }),
    last_attempt_at: normaliseTimestamp(reminder.lastAttemptAt, {
      fieldName: 'lastAttemptAt',
      required: false
    }),
    attempt_count: ensureIntegerInRange(reminder.attemptCount, {
      fieldName: 'attemptCount',
      min: 0,
      max: 1_000,
      defaultValue: 0
    }),
    failure_reason: reminder.failureReason ? String(reminder.failureReason).slice(0, 500) : null,
    metadata: writeJsonColumn(reminder.metadata, {})
  };
}

export default class CommunityEventReminderModel {
  static table(connection = db) {
    return connection(TABLE);
  }

  static async upsert(reminder, connection = db) {
    const payload = buildPayload(reminder);

    const selector = {
      event_id: payload.event_id,
      user_id: payload.user_id,
      channel: payload.channel
    };

    const existing = await this.table(connection).where(selector).first();

    if (existing) {
      await this.table(connection)
        .where(selector)
        .update({
          ...payload,
          updated_at: connection.fn.now()
        });
    } else {
      await this.table(connection).insert(payload);
    }

    const row = await this.table(connection).where(selector).first();
    return mapRow(row);
  }

  static async markProcessing(ids, connection = db) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return 0;
    }

    const uniqueIds = ids
      .map((value) => ensureIntegerInRange(value, { fieldName: 'reminderId', min: 1 }))
      .filter((value, index, array) => array.indexOf(value) === index);

    if (uniqueIds.length === 0) {
      return 0;
    }

    const isMock = typeof connection.__getRows === 'function' || typeof connection.raw !== 'function';

    if (isMock) {
      const existing = await this.table(connection).whereIn('id', uniqueIds);
      await Promise.all(
        existing.map((row) =>
          this.table(connection)
            .where({ id: row.id })
            .update({
              status: 'processing',
              last_attempt_at: connection.fn.now(),
              attempt_count: Number(row.attempt_count ?? 0) + 1
            })
        )
      );
      return existing.length;
    }

    return this.table(connection)
      .whereIn('id', uniqueIds)
      .update({
        status: 'processing',
        last_attempt_at: connection.fn.now(),
        attempt_count: connection.raw('attempt_count + 1')
      });
  }

  static async markOutcome(id, outcome, connection = db) {
    if (!outcome || outcome.status === undefined || outcome.status === null || outcome.status === '') {
      throw new Error('status is required to mark reminder outcome');
    }

    const updates = {
      status: normaliseStatus(outcome?.status),
      last_attempt_at:
        normaliseTimestamp(outcome?.lastAttemptAt, { fieldName: 'lastAttemptAt', required: false }) ??
        connection.fn.now(),
      sent_at: normaliseTimestamp(outcome?.sentAt, { fieldName: 'sentAt', required: false }),
      failure_reason: outcome?.failureReason ? String(outcome.failureReason).slice(0, 500) : null
    };

    await this.table(connection)
      .where({ id: ensureIntegerInRange(id, { fieldName: 'id', min: 1 }) })
      .update({ ...updates, updated_at: connection.fn.now() });

    const row = await this.table(connection).where({ id }).first();
    return mapRow(row);
  }

  static async listDue({ now, lookaheadMinutes = 10, limit = 100 } = {}, connection = db) {
    const anchor = now ? normaliseTimestamp(now, { fieldName: 'now', required: true }) : new Date();
    const safeLookahead = Number.isFinite(lookaheadMinutes) && lookaheadMinutes > 0 ? lookaheadMinutes : 10;
    const upperBound = new Date(anchor.getTime() + safeLookahead * 60 * 1000);
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const isMock = typeof connection.__getRows === 'function';

    if (isMock) {
      const rows = await this.table(connection).whereIn('status', ['pending', 'processing']).orderBy('remind_at', 'asc');
      const filtered = rows
        .filter((row) => {
          const remind = new Date(row.remind_at ?? row.remindAt ?? 0);
          return remind instanceof Date && !Number.isNaN(remind.getTime()) && remind <= upperBound;
        })
        .slice(0, safeLimit);
      return filtered.map((row) => mapRow(row));
    }

    const rows = await this.table(connection)
      .whereIn('status', ['pending', 'processing'])
      .andWhere('remind_at', '<=', upperBound)
      .orderBy('remind_at', 'asc')
      .limit(safeLimit);

    return rows.map((row) => mapRow(row));
  }
}
