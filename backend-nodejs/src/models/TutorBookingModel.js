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
  'tp.metadata as tutorMetadata',
  'tu.first_name as tutorFirstName',
  'tu.last_name as tutorLastName',
  'tu.email as tutorEmail',
  'lu.first_name as learnerFirstName',
  'lu.last_name as learnerLastName',
  'lu.email as learnerEmail'
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
      metadata: parseJson(row.tutorMetadata, {}),
      user: row.tutorEmail
        ? {
            email: row.tutorEmail,
            firstName: row.tutorFirstName ?? null,
            lastName: row.tutorLastName ?? null
          }
        : null
    },
    learner: row.learnerEmail
      ? {
          id: row.learnerId,
          email: row.learnerEmail,
          firstName: row.learnerFirstName ?? null,
          lastName: row.learnerLastName ?? null
        }
      : null
  };
}

function serializeMetadata(value) {
  if (value === null || value === undefined) return JSON.stringify({});
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function buildBaseQuery(connection = db) {
  return connection(`${TABLE} as tb`)
    .leftJoin('tutor_profiles as tp', 'tb.tutor_id', 'tp.id')
    .leftJoin('users as tu', 'tp.user_id', 'tu.id')
    .leftJoin('users as lu', 'tb.learner_id', 'lu.id')
    .select(BASE_COLUMNS);
}

function applyStatusFilter(query, status) {
  if (status && status !== 'all') {
    query.andWhere('tb.status', status);
  }
  return query;
}

function applySearchFilter(query, search) {
  if (!search) return query;
  const term = `%${search.toLowerCase()}%`;
  query.andWhere((builder) => {
    builder
      .whereRaw('LOWER(lu.email) LIKE ?', [term])
      .orWhereRaw('LOWER(lu.first_name) LIKE ?', [term])
      .orWhereRaw('LOWER(lu.last_name) LIKE ?', [term])
      .orWhereRaw("LOWER(COALESCE(tb.meeting_url, '')) LIKE ?", [term]);
  });
  return query;
}

export default class TutorBookingModel {
  static async listByLearnerId(learnerId, { limit = 50 } = {}, connection = db) {
    if (!learnerId) return [];
    const rows = await buildBaseQuery(connection)
      .where('tb.learner_id', learnerId)
      .orderBy('tb.scheduled_start', 'desc')
      .limit(limit);
    return rows.map((row) => deserialize(row));
  }

  static async listForInstructor(
    instructorUserId,
    { status = 'all', search, limit = 25, offset = 0 } = {},
    connection = db
  ) {
    if (!instructorUserId) return [];
    const query = buildBaseQuery(connection)
      .where('tp.user_id', instructorUserId)
      .orderBy('tb.scheduled_start', 'desc');
    applyStatusFilter(query, status);
    applySearchFilter(query, search);
    if (Number.isFinite(limit)) {
      query.limit(limit);
    }
    if (Number.isFinite(offset) && offset > 0) {
      query.offset(offset);
    }
    const rows = await query;
    return rows.map((row) => deserialize(row));
  }

  static async countForInstructor(instructorUserId, { status = 'all', search } = {}, connection = db) {
    if (!instructorUserId) return 0;
    const query = connection(`${TABLE} as tb`)
      .leftJoin('tutor_profiles as tp', 'tb.tutor_id', 'tp.id')
      .leftJoin('users as lu', 'tb.learner_id', 'lu.id');
    query.where('tp.user_id', instructorUserId);
    applyStatusFilter(query, status);
    applySearchFilter(query, search);
    const result = await query.count({ total: '*' }).first();
    return Number(result?.total ?? 0);
  }

  static async findConflictingBookings(
    tutorId,
    start,
    end,
    { excludePublicId } = {},
    connection = db
  ) {
    if (!tutorId || !start || !end) return [];
    const query = buildBaseQuery(connection)
      .where('tb.tutor_id', tutorId)
      .whereIn('tb.status', ['requested', 'confirmed'])
      .andWhere('tb.scheduled_start', '<', end)
      .andWhere('tb.scheduled_end', '>', start)
      .orderBy('tb.scheduled_start', 'asc');
    if (excludePublicId) {
      query.andWhereNot('tb.public_id', excludePublicId);
    }
    const rows = await query;
    return rows.map((row) => deserialize(row));
  }

  static async findByPublicId(publicId, connection = db) {
    if (!publicId) return null;
    const row = await buildBaseQuery(connection).where('tb.public_id', publicId).first();
    return deserialize(row);
  }

  static async create(booking, connection = db) {
    const payload = {
      public_id: booking.publicId,
      tutor_id: booking.tutorId,
      learner_id: booking.learnerId,
      requested_at: booking.requestedAt ?? new Date(),
      confirmed_at: booking.confirmedAt ?? null,
      cancelled_at: booking.cancelledAt ?? null,
      completed_at: booking.completedAt ?? null,
      scheduled_start: booking.scheduledStart,
      scheduled_end: booking.scheduledEnd,
      duration_minutes: booking.durationMinutes ?? null,
      hourly_rate_amount: booking.hourlyRateAmount ?? null,
      hourly_rate_currency: booking.hourlyRateCurrency ?? 'USD',
      meeting_url: booking.meetingUrl ?? null,
      status: booking.status ?? 'requested',
      metadata: serializeMetadata(booking.metadata ?? {})
    };

    const [id] = await connection(TABLE).insert(payload);
    const created = await connection(TABLE)
      .select('public_id as publicId')
      .where({ id })
      .first();
    return this.findByPublicId(created?.publicId ?? booking.publicId, connection);
  }

  static async updateByPublicId(publicId, updates, connection = db) {
    if (!publicId) return null;
    const payload = {};
    if (updates.tutorId !== undefined) payload.tutor_id = updates.tutorId;
    if (updates.learnerId !== undefined) payload.learner_id = updates.learnerId;
    if (updates.requestedAt !== undefined) payload.requested_at = updates.requestedAt;
    if (updates.confirmedAt !== undefined) payload.confirmed_at = updates.confirmedAt;
    if (updates.cancelledAt !== undefined) payload.cancelled_at = updates.cancelledAt;
    if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt;
    if (updates.scheduledStart !== undefined) payload.scheduled_start = updates.scheduledStart;
    if (updates.scheduledEnd !== undefined) payload.scheduled_end = updates.scheduledEnd;
    if (updates.durationMinutes !== undefined) payload.duration_minutes = updates.durationMinutes;
    if (updates.hourlyRateAmount !== undefined) payload.hourly_rate_amount = updates.hourlyRateAmount;
    if (updates.hourlyRateCurrency !== undefined) payload.hourly_rate_currency = updates.hourlyRateCurrency;
    if (updates.meetingUrl !== undefined) payload.meeting_url = updates.meetingUrl;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.metadata !== undefined) payload.metadata = serializeMetadata(updates.metadata ?? {});

    if (Object.keys(payload).length > 0) {
      await connection(TABLE).where({ public_id: publicId }).update(payload);
    }

    return this.findByPublicId(publicId, connection);
  }

  static async deleteByPublicId(publicId, connection = db) {
    if (!publicId) return;
    await connection(TABLE).where({ public_id: publicId }).del();
  }
}
