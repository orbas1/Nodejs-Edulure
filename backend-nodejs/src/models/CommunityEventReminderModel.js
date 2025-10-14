import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    status: row.status,
    channel: row.channel,
    remindAt: row.remind_at,
    sentAt: row.sent_at ?? null,
    lastAttemptAt: row.last_attempt_at ?? null,
    attemptCount: Number(row.attempt_count ?? 0),
    failureReason: row.failure_reason ?? null,
    metadata: parseJson(row.metadata, {})
  };
}

export default class CommunityEventReminderModel {
  static table(connection = db) {
    return connection('community_event_reminders');
  }

  static async upsert(reminder, connection = db) {
    const payload = {
      event_id: reminder.eventId,
      user_id: reminder.userId,
      status: reminder.status ?? 'pending',
      channel: reminder.channel ?? 'email',
      remind_at: reminder.remindAt,
      sent_at: reminder.sentAt ?? null,
      last_attempt_at: reminder.lastAttemptAt ?? null,
      attempt_count: reminder.attemptCount ?? 0,
      failure_reason: reminder.failureReason ?? null,
      metadata: JSON.stringify(reminder.metadata ?? {})
    };

    const existing = await this.table(connection)
      .where({ event_id: reminder.eventId, user_id: reminder.userId, channel: payload.channel })
      .first();

    if (existing) {
      await this.table(connection)
        .where({ event_id: reminder.eventId, user_id: reminder.userId, channel: payload.channel })
        .update({
          ...payload,
          updated_at: connection.fn.now()
        });
    } else {
      await this.table(connection).insert(payload);
    }

    const row = await this.table(connection)
      .where({ event_id: reminder.eventId, user_id: reminder.userId, channel: payload.channel })
      .first();
    return mapRow(row);
  }

  static async markProcessing(ids, connection = db) {
    if (!Array.isArray(ids) || ids.length === 0) {
      return 0;
    }

    return this.table(connection)
      .whereIn('id', ids)
      .update({
        status: 'processing',
        last_attempt_at: connection.fn.now(),
        attempt_count: connection.raw('attempt_count + 1')
      });
  }

  static async markOutcome(id, outcome, connection = db) {
    const updates = {
      status: outcome.status,
      last_attempt_at: outcome.lastAttemptAt ?? connection.fn.now(),
      sent_at: outcome.sentAt ?? null,
      failure_reason: outcome.failureReason ?? null
    };

    await this.table(connection)
      .where({ id })
      .update({ ...updates, updated_at: connection.fn.now() });

    const row = await this.table(connection).where({ id }).first();
    return mapRow(row);
  }

  static async listDue({ now, lookaheadMinutes = 10, limit = 100 } = {}, connection = db) {
    const anchor = now ?? new Date();
    const upperBound = new Date(anchor.getTime() + lookaheadMinutes * 60 * 1000);

    const rows = await this.table(connection)
      .whereIn('status', ['pending', 'processing'])
      .andWhere('remind_at', '<=', upperBound)
      .orderBy('remind_at', 'asc')
      .limit(limit);

    return rows.map((row) => mapRow(row));
  }
}
