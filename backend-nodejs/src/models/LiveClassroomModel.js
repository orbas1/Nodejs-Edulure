import db from '../config/database.js';

const TABLE = 'live_classrooms';

const BASE_COLUMNS = [
  'lc.id',
  'lc.public_id as publicId',
  'lc.community_id as communityId',
  'lc.instructor_id as instructorId',
  'lc.title',
  'lc.slug',
  'lc.summary',
  'lc.description',
  'lc.type',
  'lc.status',
  'lc.is_ticketed as isTicketed',
  'lc.price_amount as priceAmount',
  'lc.price_currency as priceCurrency',
  'lc.capacity',
  'lc.reserved_seats as reservedSeats',
  'lc.timezone',
  'lc.start_at as startAt',
  'lc.end_at as endAt',
  'lc.topics',
  'lc.metadata',
  'community.name as communityName',
  'instructor.first_name as instructorFirstName',
  'instructor.last_name as instructorLastName'
];

const REGISTRATION_COLUMNS = [
  'reg.status as registrationStatus',
  'reg.ticket_type as registrationTicketType',
  'reg.amount_paid as registrationAmountPaid',
  'reg.currency as registrationCurrency',
  'reg.registered_at as registeredAt',
  'reg.attended_at as attendedAt',
  'reg.cancelled_at as cancelledAt',
  'reg.metadata as registrationMetadata'
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

export default class LiveClassroomModel {
  static baseQuery(connection = db) {
    return connection(`${TABLE} as lc`)
      .leftJoin('communities as community', 'lc.community_id', 'community.id')
      .leftJoin('users as instructor', 'lc.instructor_id', 'instructor.id');
  }

  static async listForLearner(userId, connection = db) {
    if (!userId) return [];
    const rows = await this.baseQuery(connection)
      .leftJoin('live_classroom_registrations as reg', function joinRegistrations() {
        this.on('reg.classroom_id', '=', 'lc.id').andOn('reg.user_id', '=', connection.raw('?', [userId]));
      })
      .select([...BASE_COLUMNS, ...REGISTRATION_COLUMNS])
      .where((builder) => {
        builder.where('reg.user_id', userId).orWhere('lc.instructor_id', userId);
      })
      .orderBy('lc.start_at', 'desc');
    return rows.map((row) => this.deserialize(row));
  }

  static deserialize(row) {
    if (!row) return null;
    return {
      id: row.id,
      publicId: row.publicId,
      communityId: row.communityId ?? null,
      communityName: row.communityName ?? null,
      instructorId: row.instructorId ?? null,
      instructorName: row.instructorFirstName || row.instructorLastName
        ? `${row.instructorFirstName ?? ''} ${row.instructorLastName ?? ''}`.trim()
        : null,
      title: row.title,
      slug: row.slug,
      summary: row.summary ?? null,
      description: row.description ?? null,
      type: row.type,
      status: row.status,
      isTicketed: Boolean(row.isTicketed),
      priceAmount: Number(row.priceAmount ?? 0),
      priceCurrency: row.priceCurrency ?? 'USD',
      capacity: Number(row.capacity ?? 0),
      reservedSeats: Number(row.reservedSeats ?? 0),
      timezone: row.timezone ?? 'Etc/UTC',
      startAt: toDate(row.startAt),
      endAt: toDate(row.endAt),
      topics: parseJson(row.topics, []),
      metadata: parseJson(row.metadata, {}),
      registration: row.registrationStatus
        ? {
            status: row.registrationStatus,
            ticketType: row.registrationTicketType ?? null,
            amountPaid: Number(row.registrationAmountPaid ?? 0),
            currency: row.registrationCurrency ?? 'USD',
            registeredAt: toDate(row.registeredAt),
            attendedAt: toDate(row.attendedAt),
            cancelledAt: toDate(row.cancelledAt),
            metadata: parseJson(row.registrationMetadata, {})
          }
        : null
    };
  }
}
