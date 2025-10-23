import { randomUUID } from 'crypto';
import slugify from 'slugify';

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

const PUBLIC_STATUSES = ['scheduled', 'live'];

function normaliseStatuses(statuses) {
  if (!statuses) {
    return [...PUBLIC_STATUSES];
  }

  if (typeof statuses === 'string') {
    return [statuses];
  }

  if (Array.isArray(statuses) && statuses.length > 0) {
    return statuses;
  }

  return [...PUBLIC_STATUSES];
}

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

function createCheckpointId() {
  try {
    return randomUUID();
  } catch (_error) {
    return `checkpoint-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function normaliseCheckpoint(checkpoint = {}) {
  const recordedAt = checkpoint.recordedAt ? new Date(checkpoint.recordedAt) : new Date();
  const safeRecordedAt = Number.isNaN(recordedAt.getTime()) ? new Date() : recordedAt;
  return {
    id: checkpoint.id ?? createCheckpointId(),
    type: checkpoint.type ?? 'attendance',
    source: checkpoint.source ?? 'learner',
    userId: checkpoint.userId ?? null,
    recordedAt: safeRecordedAt.toISOString(),
    metadata: checkpoint.metadata ?? null
  };
}

export default class LiveClassroomModel {
  static normaliseSlug(value, fallback) {
    const base = value || fallback;
    if (!base) {
      return null;
    }
    return slugify(base, { lower: true, strict: true });
  }

  static async listAll({ search, status, limit = 50, offset = 0 } = {}, connection = db) {
    const query = connection(`${TABLE} as lc`)
      .leftJoin('communities as comm', 'lc.community_id', 'comm.id')
      .select(BASE_COLUMNS)
      .orderBy('lc.updated_at', 'desc');

    if (status) {
      query.andWhere('lc.status', status);
    }

    if (search) {
      query.andWhere((builder) => {
        builder
          .whereILike('lc.title', `%${search}%`)
          .orWhereILike('lc.slug', `%${search}%`)
          .orWhereILike('lc.summary', `%${search}%`);
      });
    }

    const rows = await query.limit(limit).offset(offset);
    return rows.map((row) => deserialize(row));
  }

  static async listPublic(
    { search, statuses, limit = 12, offset = 0, upcomingOnly = true } = {},
    connection = db
  ) {
    const resolvedStatuses = normaliseStatuses(statuses);
    const query = connection(`${TABLE} as lc`)
      .leftJoin('communities as comm', 'lc.community_id', 'comm.id')
      .select(BASE_COLUMNS)
      .whereIn('lc.status', resolvedStatuses)
      .orderBy(upcomingOnly ? 'lc.start_at' : 'lc.updated_at', upcomingOnly ? 'asc' : 'desc')
      .limit(limit)
      .offset(offset);

    if (upcomingOnly) {
      query.andWhere('lc.start_at', '>=', connection.fn.now());
    }

    if (search) {
      query.andWhere((builder) => {
        builder
          .whereILike('lc.title', `%${search}%`)
          .orWhereILike('lc.slug', `%${search}%`)
          .orWhereILike('lc.summary', `%${search}%`)
          .orWhereILike('lc.description', `%${search}%`);
      });
    }

    const rows = await query;
    return rows.map((row) => deserialize(row));
  }

  static async countAll({ search, status } = {}, connection = db) {
    const query = connection(TABLE);

    if (status) {
      query.andWhere('status', status);
    }

    if (search) {
      query.andWhere((builder) => {
        builder
          .whereILike('title', `%${search}%`)
          .orWhereILike('slug', `%${search}%`)
          .orWhereILike('summary', `%${search}%`);
      });
    }

    const result = await query.count({ total: '*' }).first();
    return Number(result?.total ?? 0);
  }

  static async countPublic({ search, statuses, upcomingOnly = true } = {}, connection = db) {
    const resolvedStatuses = normaliseStatuses(statuses);
    const query = connection(TABLE).whereIn('status', resolvedStatuses);

    if (upcomingOnly) {
      query.andWhere('start_at', '>=', connection.fn.now());
    }

    if (search) {
      query.andWhere((builder) => {
        builder
          .whereILike('title', `%${search}%`)
          .orWhereILike('slug', `%${search}%`)
          .orWhereILike('summary', `%${search}%`)
          .orWhereILike('description', `%${search}%`);
      });
    }

    const result = await query.count({ total: '*' }).first();
    return Number(result?.total ?? 0);
  }

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

  static async create(classroom, connection = db) {
    const payload = {
      public_id: classroom.publicId,
      community_id: classroom.communityId ?? null,
      instructor_id: classroom.instructorId ?? null,
      title: classroom.title,
      slug: this.normaliseSlug(classroom.slug, classroom.title),
      summary: classroom.summary ?? null,
      description: classroom.description ?? null,
      type: classroom.type ?? 'workshop',
      status: classroom.status ?? 'draft',
      is_ticketed: classroom.isTicketed ?? false,
      price_amount: classroom.priceAmount ?? 0,
      price_currency: classroom.priceCurrency ?? 'USD',
      capacity: classroom.capacity ?? 0,
      reserved_seats: classroom.reservedSeats ?? 0,
      timezone: classroom.timezone ?? 'Etc/UTC',
      start_at: classroom.startAt,
      end_at: classroom.endAt,
      topics: JSON.stringify(classroom.topics ?? []),
      metadata: JSON.stringify(classroom.metadata ?? {})
    };

    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const row = await connection(`${TABLE} as lc`)
      .leftJoin('communities as comm', 'lc.community_id', 'comm.id')
      .leftJoin('live_classroom_registrations as reg', function joinReg() {
        this.on('reg.classroom_id', '=', 'lc.id');
      })
      .select(BASE_COLUMNS)
      .where('lc.id', id)
      .first();
    return deserialize(row);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.communityId !== undefined) payload.community_id = updates.communityId ?? null;
    if (updates.instructorId !== undefined) payload.instructor_id = updates.instructorId ?? null;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.slug !== undefined) payload.slug = this.normaliseSlug(updates.slug, updates.title);
    if (updates.summary !== undefined) payload.summary = updates.summary ?? null;
    if (updates.description !== undefined) payload.description = updates.description ?? null;
    if (updates.type !== undefined) payload.type = updates.type ?? 'workshop';
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.isTicketed !== undefined) payload.is_ticketed = updates.isTicketed;
    if (updates.priceAmount !== undefined) payload.price_amount = updates.priceAmount ?? 0;
    if (updates.priceCurrency !== undefined) payload.price_currency = updates.priceCurrency ?? 'USD';
    if (updates.capacity !== undefined) payload.capacity = updates.capacity ?? 0;
    if (updates.reservedSeats !== undefined) payload.reserved_seats = updates.reservedSeats ?? 0;
    if (updates.timezone !== undefined) payload.timezone = updates.timezone ?? 'Etc/UTC';
    if (updates.startAt !== undefined) payload.start_at = updates.startAt;
    if (updates.endAt !== undefined) payload.end_at = updates.endAt;
    if (updates.topics !== undefined) payload.topics = JSON.stringify(updates.topics ?? []);
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async deleteById(id, connection = db) {
    await connection('live_classroom_registrations').where({ classroom_id: id }).del();
    await connection(TABLE).where({ id }).del();
  }

  static async findByPublicId(publicId, connection = db) {
    if (!publicId) {
      return null;
    }

    const row = await connection(`${TABLE} as lc`)
      .leftJoin('communities as comm', 'lc.community_id', 'comm.id')
      .leftJoin('live_classroom_registrations as reg', function joinReg() {
        this.on('reg.classroom_id', '=', 'lc.id');
      })
      .select(BASE_COLUMNS)
      .where('lc.public_id', publicId)
      .first();

    return deserialize(row);
  }

  static async appendAttendanceCheckpointByPublicId(publicId, checkpoint, connection = db) {
    if (!publicId) {
      return null;
    }

    const classroom = await this.findByPublicId(publicId, connection);
    if (!classroom) {
      return null;
    }

    const metadata = { ...(classroom.metadata ?? {}) };
    const checkpoints = Array.isArray(metadata.attendanceCheckpoints)
      ? metadata.attendanceCheckpoints.slice()
      : [];

    const entry = normaliseCheckpoint(checkpoint);
    checkpoints.push(entry);

    const MAX_ENTRIES = 50;
    const trimmed = checkpoints.slice(-MAX_ENTRIES);

    const analytics = metadata.attendanceAnalytics ?? {};
    const total = Number.isFinite(Number(analytics.total))
      ? Number(analytics.total) + 1
      : trimmed.length;

    const nextAnalytics = {
      ...analytics,
      total,
      lastRecordedAt: entry.recordedAt,
      lastRecordedBy: entry.userId ?? analytics.lastRecordedBy ?? null
    };

    const nextMetadata = {
      ...metadata,
      attendanceCheckpoints: trimmed,
      attendanceAnalytics: nextAnalytics
    };

    await connection(TABLE)
      .where({ id: classroom.id })
      .update({
        metadata: JSON.stringify(nextMetadata),
        updated_at: connection.fn.now()
      });

    return {
      attendanceCheckpoints: trimmed,
      attendanceAnalytics: nextAnalytics
    };
  }
}
