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
  'comm.name as communityName'
];

const REGISTRATION_COLUMNS = [
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

function buildAnalyticsFromMetadata(metadata) {
  if (!metadata) {
    return { totalCheckIns: 0, totalJoins: 0, lastEventAt: null, lastEventType: null, averageLatencyMs: null, peakBandwidthKbps: null };
  }

  const checkpoints = Array.isArray(metadata.attendanceCheckpoints)
    ? metadata.attendanceCheckpoints
    : [];

  const aggregate = checkpoints.reduce(
    (acc, checkpoint) => {
      if (checkpoint.type === 'check-in') {
        acc.checkIns += 1;
      }
      if (checkpoint.type === 'join') {
        acc.joins += 1;
      }
      if (!acc.lastEventAt || (checkpoint.occurredAt && checkpoint.occurredAt > acc.lastEventAt)) {
        acc.lastEventAt = checkpoint.occurredAt;
        acc.lastEventType = checkpoint.type;
      }
      if (typeof checkpoint.latencyMs === 'number') {
        acc.latencySamples.push(checkpoint.latencyMs);
      }
      if (typeof checkpoint.bandwidthCapKbps === 'number') {
        acc.peakBandwidth = Math.max(acc.peakBandwidth, checkpoint.bandwidthCapKbps);
      }
      return acc;
    },
    { checkIns: 0, joins: 0, lastEventAt: null, lastEventType: null, latencySamples: [], peakBandwidth: 0 }
  );

  const metadataAnalytics = metadata.analytics ?? {};
  const averageLatency = aggregate.latencySamples.length
    ? Math.round(aggregate.latencySamples.reduce((sum, value) => sum + value, 0) / aggregate.latencySamples.length)
    : metadataAnalytics.averageLatencyMs ?? null;

  return {
    totalCheckIns: metadataAnalytics.totalCheckIns ?? aggregate.checkIns,
    totalJoins: metadataAnalytics.totalJoins ?? aggregate.joins,
    lastEventAt: metadataAnalytics.lastEventAt ?? aggregate.lastEventAt,
    lastEventType: metadataAnalytics.lastEventType ?? aggregate.lastEventType,
    averageLatencyMs: averageLatency,
    peakBandwidthKbps: metadataAnalytics.peakBandwidthKbps ?? (aggregate.peakBandwidth || null)
  };
}

function selectColumns(query, includeRegistration = false) {
  query.select(BASE_COLUMNS);
  if (includeRegistration) {
    query.select(REGISTRATION_COLUMNS);
  }
  return query;
}

function applyRegistrationJoin(query, connection, userId) {
  return query.leftJoin('live_classroom_registrations as reg', function joinReg() {
    this.on('reg.classroom_id', '=', 'lc.id');
    if (userId) {
      this.andOn('reg.user_id', '=', connection.raw('?', [userId]));
    }
  });
}

function deserialize(row) {
  if (!row) return null;
  const metadata = parseJson(row.metadata, {});
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
    metadata,
    analytics: buildAnalyticsFromMetadata(metadata),
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
  static async findByPublicId(publicId, connection = db, { registrationForUserId } = {}) {
    if (!publicId) {
      return null;
    }

    const query = connection(`${TABLE} as lc`).leftJoin('communities as comm', 'lc.community_id', 'comm.id');

    if (registrationForUserId) {
      applyRegistrationJoin(query, connection, registrationForUserId);
    }

    selectColumns(query, Boolean(registrationForUserId));

    const row = await query.where('lc.public_id', publicId).first();

    return deserialize(row);
  }

  static async findByIdentifier(identifier, connection = db, options = {}) {
    if (!identifier) {
      return null;
    }

    const byPublicId = await this.findByPublicId(identifier, connection, options);
    if (byPublicId) {
      return byPublicId;
    }

    const numericId = Number(identifier);
    if (Number.isInteger(numericId) && numericId > 0) {
      return this.findById(numericId, connection, options);
    }

    return null;
  }

  static async appendAttendanceCheckpoint(classroomId, checkpoint, connection = db) {
    if (!classroomId || !checkpoint) {
      return null;
    }

    const row = await connection(TABLE).select(['metadata']).where({ id: classroomId }).first();
    if (!row) {
      return null;
    }

    const metadata = parseJson(row.metadata, {});
    const history = Array.isArray(metadata.attendanceCheckpoints)
      ? [...metadata.attendanceCheckpoints]
      : [];

    const occurredAt = checkpoint.occurredAt ?? new Date().toISOString();
    const normalisedCheckpoint = {
      ...checkpoint,
      occurredAt
    };

    if (checkpoint.userId) {
      const existingIndex = history.findIndex(
        (entry) => entry.userId === checkpoint.userId && entry.type === checkpoint.type
      );
      if (existingIndex >= 0) {
        history[existingIndex] = { ...history[existingIndex], ...normalisedCheckpoint };
      } else {
        history.push(normalisedCheckpoint);
      }
    } else {
      history.push(normalisedCheckpoint);
    }

    metadata.attendanceCheckpoints = history.slice(-200);

    const analytics = metadata.analytics ?? {};
    const totalCheckIns = history.filter((entry) => entry.type === 'check-in').length;
    const totalJoins = history.filter((entry) => entry.type === 'join').length;
    const latencyValues = history
      .filter((entry) => typeof entry.latencyMs === 'number')
      .map((entry) => entry.latencyMs);
    const peakBandwidth = history
      .filter((entry) => typeof entry.bandwidthCapKbps === 'number')
      .map((entry) => entry.bandwidthCapKbps)
      .reduce((max, value) => Math.max(max, value), analytics.peakBandwidthKbps ?? 0);

    let averageLatency = analytics.averageLatencyMs ?? null;
    if (latencyValues.length > 0) {
      const totalLatency = latencyValues.reduce((sum, value) => sum + value, 0);
      averageLatency = Math.round(totalLatency / latencyValues.length);
    }

    metadata.analytics = {
      ...analytics,
      totalCheckIns,
      totalJoins,
      lastEventAt: occurredAt,
      lastEventType: checkpoint.type,
      averageLatencyMs: averageLatency,
      peakBandwidthKbps: peakBandwidth || analytics.peakBandwidthKbps || null
    };

    await connection(TABLE)
      .where({ id: classroomId })
      .update({ metadata: JSON.stringify(metadata), updated_at: connection.fn.now() });

    return metadata;
  }

  static normaliseSlug(value, fallback) {
    const base = value || fallback;
    if (!base) {
      return null;
    }
    return slugify(base, { lower: true, strict: true });
  }

  static async listAll(
    { search, status, limit = 50, offset = 0, registrationForUserId } = {},
    connection = db
  ) {
    const query = connection(`${TABLE} as lc`).leftJoin('communities as comm', 'lc.community_id', 'comm.id');

    if (registrationForUserId) {
      applyRegistrationJoin(query, connection, registrationForUserId);
    }

    selectColumns(query, Boolean(registrationForUserId));

    query.orderBy('lc.updated_at', 'desc');

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
    { search, statuses, limit = 12, offset = 0, upcomingOnly = true, registrationForUserId } = {},
    connection = db
  ) {
    const resolvedStatuses = normaliseStatuses(statuses);
    const query = connection(`${TABLE} as lc`).leftJoin('communities as comm', 'lc.community_id', 'comm.id');

    if (registrationForUserId) {
      applyRegistrationJoin(query, connection, registrationForUserId);
    }

    selectColumns(query, Boolean(registrationForUserId));

    query
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
    const query = connection(`${TABLE} as lc`).leftJoin('communities as comm', 'lc.community_id', 'comm.id');

    if (userId) {
      applyRegistrationJoin(query, connection, userId);
    }

    selectColumns(query, Boolean(userId));

    query.orderBy('lc.start_at', 'desc').limit(limit);

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

  static async findById(id, connection = db, { registrationForUserId } = {}) {
    const query = connection(`${TABLE} as lc`).leftJoin('communities as comm', 'lc.community_id', 'comm.id');

    if (registrationForUserId) {
      applyRegistrationJoin(query, connection, registrationForUserId);
    }

    selectColumns(query, Boolean(registrationForUserId));

    const row = await query.where('lc.id', id).first();
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
}
