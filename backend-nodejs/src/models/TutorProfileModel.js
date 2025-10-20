import db from '../config/database.js';

const TABLE = 'tutor_profiles';

const BASE_COLUMNS = [
  'id',
  'user_id as userId',
  'display_name as displayName',
  'headline',
  'bio',
  'skills',
  'languages',
  'country',
  'timezones',
  'availability_preferences as availabilityPreferences',
  'hourly_rate_amount as hourlyRateAmount',
  'hourly_rate_currency as hourlyRateCurrency',
  'rating_average as ratingAverage',
  'rating_count as ratingCount',
  'completed_sessions as completedSessions',
  'response_time_minutes as responseTimeMinutes',
  'is_verified as isVerified',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return structuredClone(fallback);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(fallback)) {
        return Array.isArray(parsed) ? parsed : structuredClone(fallback);
      }
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...fallback, ...parsed };
      }
      return structuredClone(fallback);
    } catch (_error) {
      return structuredClone(fallback);
    }
  }
  if (Array.isArray(fallback)) {
    return Array.isArray(value) ? value : structuredClone(fallback);
  }
  if (typeof value === 'object' && value !== null) {
    return { ...fallback, ...value };
  }
  return structuredClone(fallback);
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serialiseJson(value, fallback) {
  if (value === null || value === undefined) {
    return JSON.stringify(fallback);
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function deserialize(record) {
  if (!record) return null;
  return {
    id: record.id,
    userId: record.userId,
    displayName: record.displayName,
    headline: record.headline ?? null,
    bio: record.bio ?? null,
    skills: parseJson(record.skills, []),
    languages: parseJson(record.languages, ['en']),
    country: record.country ?? null,
    timezones: parseJson(record.timezones, ['Etc/UTC']),
    availabilityPreferences: parseJson(record.availabilityPreferences, {}),
    hourlyRateAmount: Number(record.hourlyRateAmount ?? 0),
    hourlyRateCurrency: record.hourlyRateCurrency ?? 'USD',
    ratingAverage: Number(record.ratingAverage ?? 0),
    ratingCount: Number(record.ratingCount ?? 0),
    completedSessions: Number(record.completedSessions ?? 0),
    responseTimeMinutes: Number(record.responseTimeMinutes ?? 0),
    isVerified: Boolean(record.isVerified),
    metadata: parseJson(record.metadata, {}),
    createdAt: toDate(record.createdAt),
    updatedAt: toDate(record.updatedAt)
  };
}

export default class TutorProfileModel {
  static async listAll({ search, limit = 50, offset = 0 } = {}, connection = db) {
    const query = connection(TABLE).select(BASE_COLUMNS).orderBy('updated_at', 'desc');

    if (search) {
      query.where((builder) => {
        builder
          .whereILike('display_name', `%${search}%`)
          .orWhereILike('headline', `%${search}%`)
          .orWhereILike('bio', `%${search}%`);
      });
    }

    const rows = await query.limit(limit).offset(offset);
    return rows.map((row) => deserialize(row));
  }

  static async listVerified({ search, limit = 12, offset = 0 } = {}, connection = db) {
    const query = connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ is_verified: true })
      .orderBy('rating_average', 'desc')
      .orderBy('updated_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (search) {
      query.andWhere((builder) => {
        builder
          .whereILike('display_name', `%${search}%`)
          .orWhereILike('headline', `%${search}%`)
          .orWhereILike('bio', `%${search}%`);
      });
    }

    const rows = await query;
    return rows.map((row) => deserialize(row));
  }

  static async countAll({ search } = {}, connection = db) {
    const query = connection(TABLE);
    if (search) {
      query.where((builder) => {
        builder
          .whereILike('display_name', `%${search}%`)
          .orWhereILike('headline', `%${search}%`)
          .orWhereILike('bio', `%${search}%`);
      });
    }
    const result = await query.count({ total: '*' }).first();
    return Number(result?.total ?? 0);
  }

  static async countVerified({ search } = {}, connection = db) {
    const query = connection(TABLE).where({ is_verified: true });

    if (search) {
      query.andWhere((builder) => {
        builder
          .whereILike('display_name', `%${search}%`)
          .orWhereILike('headline', `%${search}%`)
          .orWhereILike('bio', `%${search}%`);
      });
    }

    const result = await query.count({ total: '*' }).first();
    return Number(result?.total ?? 0);
  }

  static async findById(id, connection = db) {
    const row = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return deserialize(row);
  }

  static async create(profile, connection = db) {
    const payload = {
      user_id: profile.userId,
      display_name: profile.displayName,
      headline: profile.headline ?? null,
      bio: profile.bio ?? null,
      skills: serialiseJson(profile.skills ?? [], []),
      languages: serialiseJson(profile.languages ?? ['en'], ['en']),
      country: profile.country ?? null,
      timezones: serialiseJson(profile.timezones ?? ['Etc/UTC'], ['Etc/UTC']),
      availability_preferences: serialiseJson(profile.availabilityPreferences ?? {}, {}),
      hourly_rate_amount: profile.hourlyRateAmount ?? 0,
      hourly_rate_currency: profile.hourlyRateCurrency ?? 'USD',
      rating_average: profile.ratingAverage ?? 0,
      rating_count: profile.ratingCount ?? 0,
      completed_sessions: profile.completedSessions ?? 0,
      response_time_minutes: profile.responseTimeMinutes ?? 0,
      is_verified: profile.isVerified ?? false,
      metadata: serialiseJson(profile.metadata ?? {}, {})
    };

    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.displayName !== undefined) payload.display_name = updates.displayName;
    if (updates.headline !== undefined) payload.headline = updates.headline ?? null;
    if (updates.bio !== undefined) payload.bio = updates.bio ?? null;
    if (updates.skills !== undefined) payload.skills = serialiseJson(updates.skills ?? [], []);
    if (updates.languages !== undefined) payload.languages = serialiseJson(updates.languages ?? ['en'], ['en']);
    if (updates.country !== undefined) payload.country = updates.country ?? null;
    if (updates.timezones !== undefined) payload.timezones = serialiseJson(updates.timezones ?? ['Etc/UTC'], ['Etc/UTC']);
    if (updates.availabilityPreferences !== undefined)
      payload.availability_preferences = serialiseJson(updates.availabilityPreferences ?? {}, {});
    if (updates.hourlyRateAmount !== undefined) payload.hourly_rate_amount = updates.hourlyRateAmount ?? 0;
    if (updates.hourlyRateCurrency !== undefined) payload.hourly_rate_currency = updates.hourlyRateCurrency ?? 'USD';
    if (updates.ratingAverage !== undefined) payload.rating_average = updates.ratingAverage ?? 0;
    if (updates.ratingCount !== undefined) payload.rating_count = updates.ratingCount ?? 0;
    if (updates.completedSessions !== undefined) payload.completed_sessions = updates.completedSessions ?? 0;
    if (updates.responseTimeMinutes !== undefined) payload.response_time_minutes = updates.responseTimeMinutes ?? 0;
    if (updates.isVerified !== undefined) payload.is_verified = updates.isVerified;
    if (updates.metadata !== undefined) payload.metadata = serialiseJson(updates.metadata ?? {}, {});
    if (updates.userId !== undefined) payload.user_id = updates.userId;

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async deleteById(id, connection = db) {
    await connection('tutor_availability_slots').where({ tutor_id: id }).del();
    await connection('tutor_bookings').where({ tutor_id: id }).del();
    await connection(TABLE).where({ id }).del();
  }
}
