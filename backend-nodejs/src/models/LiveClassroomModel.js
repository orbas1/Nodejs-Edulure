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
  'lc.created_at as createdAt',
  'lc.updated_at as updatedAt',
  'comm.name as communityName',
  'reg.status as registrationStatus',
  'reg.ticket_type as ticketType',
  'reg.amount_paid as amountPaid',
  'reg.currency as registrationCurrency',
  'reg.registered_at as registeredAt'
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
    communityId: row.communityId,
    communityName: row.communityName ?? null,
    instructorId: row.instructorId,
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
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
    registration: row.registrationStatus
      ? {
          status: row.registrationStatus,
          ticketType: row.ticketType ?? null,
          amountPaid: Number(row.amountPaid ?? 0),
          currency: row.registrationCurrency ?? row.priceCurrency ?? 'USD',
          registeredAt: toDate(row.registeredAt)
        }
      : null
  };
}

export default class LiveClassroomModel {
  static async listForLearner(userId, { from, to, limit = 50 } = {}, connection = db) {
    const query = connection(`${TABLE} as lc`)
      .leftJoin('live_classroom_registrations as reg', function joinReg() {
        this.on('reg.classroom_id', '=', 'lc.id');
        if (userId) {
          this.andOn('reg.user_id', '=', connection.raw('?', [userId]));
        }
      })
      .leftJoin('communities as comm', 'lc.community_id', 'comm.id')
      .select(BASE_COLUMNS)
      .orderBy('lc.start_at', 'desc')
      .limit(limit);

    if (from) {
      query.where('lc.start_at', '>=', from);
    }
    if (to) {
      query.where('lc.start_at', '<=', to);
    }

    if (userId) {
      query.where(function whereUser() {
        this.where('reg.user_id', userId).orWhere('lc.start_at', '>=', connection.fn.now());
      });
    }

    const rows = await query;
    return rows.map((row) => deserialize(row));
  }
}
