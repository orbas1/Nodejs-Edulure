import db from '../config/database.js';
import {
  COMMUNITY_EVENT_PARTICIPANT_STATUSES
} from './communityEventConstants.js';
import {
  ensureIntegerInRange,
  readJsonColumn,
  writeJsonColumn
} from '../utils/modelUtils.js';

const TABLE = 'community_event_participants';
const STATUS_OPTIONS = new Set(COMMUNITY_EVENT_PARTICIPANT_STATUSES);

function normalisePrimaryId(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${fieldName} is required`);
  }

  return ensureIntegerInRange(value, { fieldName, min: 1 });
}

function normaliseStatus(status) {
  if (status === undefined || status === null || status === '') {
    return 'interested';
  }

  const candidate = String(status).trim().toLowerCase();
  if (!STATUS_OPTIONS.has(candidate)) {
    throw new Error(`Unsupported participant status '${status}'`);
  }
  return candidate;
}

function normaliseTimestamp(value, { fieldName, defaultValue } = {}) {
  if (value === undefined || value === null || value === '') {
    return defaultValue ?? null;
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
    rsvpAt: row.rsvp_at ?? null,
    checkInAt: row.check_in_at ?? null,
    reminderScheduledAt: row.reminder_scheduled_at ?? null,
    metadata: readJsonColumn(row.metadata, {})
  };
}

function buildPayload(participant, connection) {
  if (!participant) {
    throw new Error('Participant payload is required');
  }

  return {
    event_id: normalisePrimaryId(participant.eventId, 'eventId'),
    user_id: normalisePrimaryId(participant.userId, 'userId'),
    status: normaliseStatus(participant.status),
    rsvp_at: normaliseTimestamp(participant.rsvpAt, {
      fieldName: 'rsvpAt',
      defaultValue: connection.fn.now()
    }),
    check_in_at: normaliseTimestamp(participant.checkInAt, { fieldName: 'checkInAt' }),
    reminder_scheduled_at: normaliseTimestamp(participant.reminderScheduledAt, {
      fieldName: 'reminderScheduledAt'
    }),
    metadata: writeJsonColumn(participant.metadata, {})
  };
}

export default class CommunityEventParticipantModel {
  static table(connection = db) {
    return connection(TABLE);
  }

  static async upsert(participant, connection = db) {
    const payload = buildPayload(participant, connection);

    const selector = {
      event_id: payload.event_id,
      user_id: payload.user_id
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

  static async find(eventId, userId, connection = db) {
    const row = await this.table(connection)
      .where({
        event_id: normalisePrimaryId(eventId, 'eventId'),
        user_id: normalisePrimaryId(userId, 'userId')
      })
      .first();
    return mapRow(row);
  }

  static async countByStatus(eventId, status, connection = db) {
    const row = await this.table(connection)
      .where({
        event_id: normalisePrimaryId(eventId, 'eventId'),
        status: normaliseStatus(status)
      })
      .count({ count: '*' })
      .first();
    return Number(row?.count ?? 0);
  }

  static async listForEvent(eventId, connection = db) {
    const rows = await this.table(connection)
      .where({ event_id: normalisePrimaryId(eventId, 'eventId') })
      .orderBy('rsvp_at', 'asc');
    return rows.map((row) => mapRow(row));
  }
}
