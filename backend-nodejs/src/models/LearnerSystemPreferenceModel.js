import db from '../config/database.js';

const TABLE = 'learner_system_preferences';

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
}

function deserialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    language: row.language,
    region: row.region,
    timezone: row.timezone,
    notificationsEnabled: Boolean(row.notifications_enabled),
    digestEnabled: Boolean(row.digest_enabled),
    autoPlayMedia: Boolean(row.auto_play_media),
    highContrast: Boolean(row.high_contrast),
    reducedMotion: Boolean(row.reduced_motion),
    preferences: parseJson(row.preferences, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class LearnerSystemPreferenceModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async getForUser(userId, connection = db) {
    if (!userId) return null;
    const row = await connection(TABLE).select('*').where({ user_id: userId }).first();
    return deserialize(row);
  }

  static async upsertForUser(userId, payload = {}, connection = db) {
    if (!userId) return null;
    const updates = {
      language: payload.language ?? 'en',
      region: payload.region ?? 'US',
      timezone: payload.timezone ?? 'UTC',
      notifications_enabled: payload.notificationsEnabled ?? true,
      digest_enabled: payload.digestEnabled ?? true,
      auto_play_media: payload.autoPlayMedia ?? false,
      high_contrast: payload.highContrast ?? false,
      reduced_motion: payload.reducedMotion ?? false,
      preferences: JSON.stringify(payload.preferences ?? {})
    };
    const existing = await connection(TABLE).select('id').where({ user_id: userId }).first();
    if (existing) {
      await connection(TABLE).where({ id: existing.id }).update(updates);
      const row = await connection(TABLE).select('*').where({ id: existing.id }).first();
      return deserialize(row);
    }
    const [id] = await connection(TABLE).insert({ user_id: userId, ...updates });
    const row = await connection(TABLE).select('*').where({ id }).first();
    return deserialize(row);
  }
}
