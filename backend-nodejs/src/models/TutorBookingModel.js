import db from '../config/database.js';

const TABLE = 'tutor_bookings';

const BASE_COLUMNS = [
  'tb.id',
  'tb.public_id as publicId',
  'tb.tutor_id as tutorId',
  'tb.learner_id as learnerId',
  'tb.requested_at as requestedAt',
  'tb.confirmed_at as confirmedAt',
  'tb.cancelled_at as cancelledAt',
  'tb.completed_at as completedAt',
  'tb.scheduled_start as scheduledStart',
  'tb.scheduled_end as scheduledEnd',
  'tb.duration_minutes as durationMinutes',
  'tb.hourly_rate_amount as hourlyRateAmount',
  'tb.hourly_rate_currency as hourlyRateCurrency',
  'tb.meeting_url as meetingUrl',
  'tb.status',
  'tb.metadata',
  'tp.display_name as tutorDisplayName',
  'tp.headline as tutorHeadline',
  'tp.metadata as tutorMetadata'
];

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

function deserialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    publicId: row.publicId,
    tutorId: row.tutorId,
    learnerId: row.learnerId,
    requestedAt: toDate(row.requestedAt),
    confirmedAt: toDate(row.confirmedAt),
    cancelledAt: toDate(row.cancelledAt),
    completedAt: toDate(row.completedAt),
    scheduledStart: toDate(row.scheduledStart),
    scheduledEnd: toDate(row.scheduledEnd),
    durationMinutes: Number(row.durationMinutes ?? 0),
    hourlyRateAmount: Number(row.hourlyRateAmount ?? 0),
    hourlyRateCurrency: row.hourlyRateCurrency ?? 'USD',
    meetingUrl: row.meetingUrl ?? null,
    status: row.status,
    metadata: parseJson(row.metadata, {}),
    tutorProfile: {
      id: row.tutorId,
      displayName: row.tutorDisplayName ?? null,
      headline: row.tutorHeadline ?? null,
      metadata: parseJson(row.tutorMetadata, {})
    }
  };
}

export default class TutorBookingModel {
  static async listByLearnerId(learnerId, { limit = 50 } = {}, connection = db) {
    if (!learnerId) return [];
    const rows = await connection(`${TABLE} as tb`)
      .leftJoin('tutor_profiles as tp', 'tb.tutor_id', 'tp.id')
      .select(BASE_COLUMNS)
      .where('tb.learner_id', learnerId)
      .orderBy('tb.scheduled_start', 'desc')
      .limit(limit);
    return rows.map((row) => deserialize(row));
  }
}
