import { randomUUID } from 'node:crypto';

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
  'learner.first_name as learnerFirstName',
  'learner.last_name as learnerLastName',
  'learner.email as learnerEmail'
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
    },
    learner: {
      id: row.learnerId,
      firstName: row.learnerFirstName ?? null,
      lastName: row.learnerLastName ?? null,
      email: row.learnerEmail ?? null
    }
  };
}

export default class TutorBookingModel {
  static async listByLearnerId(learnerId, { limit = 50 } = {}, connection = db) {
    if (!learnerId) return [];
    const rows = await connection(`${TABLE} as tb`)
      .leftJoin('tutor_profiles as tp', 'tb.tutor_id', 'tp.id')
      .leftJoin('users as learner', 'tb.learner_id', 'learner.id')
      .select(BASE_COLUMNS)
      .where('tb.learner_id', learnerId)
      .orderBy('tb.scheduled_start', 'desc')
      .limit(limit);
    return rows.map((row) => deserialize(row));
  }

  static async list(
    { search, status, tutorId, learnerId, from, to, limit = 25, offset = 0 } = {},
    connection = db
  ) {
    const query = connection(`${TABLE} as tb`)
      .leftJoin('tutor_profiles as tp', 'tb.tutor_id', 'tp.id')
      .leftJoin('users as learner', 'tb.learner_id', 'learner.id')
      .select(BASE_COLUMNS)
      .orderBy('tb.scheduled_start', 'desc');

    if (tutorId) {
      query.where('tb.tutor_id', tutorId);
    }

    if (learnerId) {
      query.where('tb.learner_id', learnerId);
    }

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      query.whereIn('tb.status', statuses);
    }

    if (from) {
      query.where('tb.scheduled_start', '>=', from);
    }

    if (to) {
      query.where('tb.scheduled_start', '<=', to);
    }

    if (search) {
      query.andWhere((builder) => {
        builder
          .whereILike('tp.display_name', `%${search}%`)
          .orWhereILike('learner.email', `%${search}%`)
          .orWhereILike('tb.meeting_url', `%${search}%`);
      });
    }

    const rows = await query.limit(limit).offset(offset);
    return rows.map((row) => deserialize(row));
  }

  static async count(
    { search, status, tutorId, learnerId, from, to } = {},
    connection = db
  ) {
    const query = connection(`${TABLE} as tb`)
      .leftJoin('tutor_profiles as tp', 'tb.tutor_id', 'tp.id')
      .leftJoin('users as learner', 'tb.learner_id', 'learner.id');

    if (tutorId) {
      query.where('tb.tutor_id', tutorId);
    }

    if (learnerId) {
      query.where('tb.learner_id', learnerId);
    }

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      query.whereIn('tb.status', statuses);
    }

    if (from) {
      query.where('tb.scheduled_start', '>=', from);
    }

    if (to) {
      query.where('tb.scheduled_start', '<=', to);
    }

    if (search) {
      query.andWhere((builder) => {
        builder
          .whereILike('tp.display_name', `%${search}%`)
          .orWhereILike('learner.email', `%${search}%`)
          .orWhereILike('tb.meeting_url', `%${search}%`);
      });
    }

    const result = await query.count({ total: '*' }).first();
    return Number(result?.total ?? 0);
  }

  static async findById(id, connection = db) {
    const row = await connection(`${TABLE} as tb`)
      .leftJoin('tutor_profiles as tp', 'tb.tutor_id', 'tp.id')
      .leftJoin('users as learner', 'tb.learner_id', 'learner.id')
      .select(BASE_COLUMNS)
      .where('tb.id', id)
      .first();
    return deserialize(row);
  }

  static async findByPublicId(publicId, connection = db) {
    const row = await connection(`${TABLE} as tb`)
      .leftJoin('tutor_profiles as tp', 'tb.tutor_id', 'tp.id')
      .leftJoin('users as learner', 'tb.learner_id', 'learner.id')
      .select(BASE_COLUMNS)
      .where('tb.public_id', publicId)
      .first();
    return deserialize(row);
  }

  static async create(booking, connection = db) {
    const payload = {
      public_id: booking.publicId ?? randomUUID(),
      tutor_id: booking.tutorId,
      learner_id: booking.learnerId,
      requested_at: booking.requestedAt ?? connection.fn.now(),
      confirmed_at: booking.confirmedAt ?? null,
      cancelled_at: booking.cancelledAt ?? null,
      completed_at: booking.completedAt ?? null,
      scheduled_start: booking.scheduledStart,
      scheduled_end: booking.scheduledEnd,
      duration_minutes: booking.durationMinutes ?? 60,
      hourly_rate_amount: booking.hourlyRateAmount ?? 0,
      hourly_rate_currency: booking.hourlyRateCurrency ?? 'USD',
      meeting_url: booking.meetingUrl ?? null,
      status: booking.status ?? 'requested',
      metadata: JSON.stringify(booking.metadata ?? {})
    };

    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
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
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE)
      .where({ id })
      .update(payload);

    return this.findById(id, connection);
  }

  static async deleteById(id, connection = db) {
    await connection(TABLE).where({ id }).del();
  }
}
