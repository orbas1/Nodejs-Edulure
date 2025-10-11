import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
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
    rsvpAt: row.rsvp_at,
    checkInAt: row.check_in_at ?? null,
    reminderScheduledAt: row.reminder_scheduled_at ?? null,
    metadata: parseJson(row.metadata, {})
  };
}

export default class CommunityEventParticipantModel {
  static table(connection = db) {
    return connection('community_event_participants');
  }

  static async upsert(participant, connection = db) {
    const payload = {
      event_id: participant.eventId,
      user_id: participant.userId,
      status: participant.status ?? 'interested',
      rsvp_at: participant.rsvpAt ?? connection.fn.now(),
      check_in_at: participant.checkInAt ?? null,
      reminder_scheduled_at: participant.reminderScheduledAt ?? null,
      metadata: JSON.stringify(participant.metadata ?? {})
    };

    const existing = await this.table(connection)
      .where({ event_id: participant.eventId, user_id: participant.userId })
      .first();

    if (existing) {
      await this.table(connection)
        .where({ event_id: participant.eventId, user_id: participant.userId })
        .update({
          ...payload,
          updated_at: connection.fn.now()
        });
    } else {
      await this.table(connection).insert(payload);
    }

    const row = await this.table(connection)
      .where({ event_id: participant.eventId, user_id: participant.userId })
      .first();
    return mapRow(row);
  }

  static async find(eventId, userId, connection = db) {
    const row = await this.table(connection)
      .where({ event_id: eventId, user_id: userId })
      .first();
    return mapRow(row);
  }

  static async countByStatus(eventId, status, connection = db) {
    const row = await this.table(connection)
      .where({ event_id: eventId, status })
      .count({ count: '*' })
      .first();
    return Number(row?.count ?? 0);
  }

  static async listForEvent(eventId, connection = db) {
    const rows = await this.table(connection)
      .where({ event_id: eventId })
      .orderBy('rsvp_at', 'asc');
    return rows.map((row) => mapRow(row));
  }
}
