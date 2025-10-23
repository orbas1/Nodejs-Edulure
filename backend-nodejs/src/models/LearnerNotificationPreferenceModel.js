import db from '../config/database.js';

const TABLE = 'learner_notification_preferences';

const DEFAULTS = Object.freeze({
  weeklyDigest: true,
  communityDigest: true,
  productUpdates: true,
  smsAlerts: false,
  tutorReminders: true,
  metadata: {}
});

function parseMetadata(value, fallback = {}) {
  if (!value) {
    return { ...fallback };
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return { ...fallback, ...value };
  }

  if (typeof value !== 'string') {
    return { ...fallback };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ...fallback };
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ...fallback, ...parsed };
    }
  } catch (_error) {
    // swallow error and fall through to fallback
  }

  return { ...fallback };
}

function serialiseMetadata(metadata) {
  if (metadata === null || metadata === undefined) {
    return JSON.stringify({});
  }

  if (typeof metadata === 'string') {
    const trimmed = metadata.trim();
    if (!trimmed) {
      return JSON.stringify({});
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return JSON.stringify(parsed);
      }
    } catch (_error) {
      return JSON.stringify({});
    }
  }

  if (typeof metadata === 'object' && !Array.isArray(metadata)) {
    try {
      return JSON.stringify(metadata);
    } catch (_error) {
      return JSON.stringify({});
    }
  }

  return JSON.stringify({});
}

function resolveInsertedId(result) {
  if (Array.isArray(result)) {
    const [first] = result;
    if (!first) {
      return null;
    }

    if (typeof first === 'object') {
      if ('id' in first) {
        return first.id;
      }

      const values = Object.values(first);
      return values.length > 0 ? values[0] : null;
    }

    return first;
  }

  if (result && typeof result === 'object') {
    if ('id' in result) {
      return result.id;
    }

    const values = Object.values(result);
    return values.length > 0 ? values[0] : null;
  }

  return result ?? null;
}

function normaliseBoolean(value, fallback) {
  if (value === undefined || value === null) {
    return Boolean(fallback);
  }
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalised)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalised)) {
      return false;
    }
  }
  return Boolean(value);
}

function deserialize(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    weeklyDigest: Boolean(row.weekly_digest),
    communityDigest: Boolean(row.community_digest),
    productUpdates: Boolean(row.product_updates),
    smsAlerts: Boolean(row.sms_alerts),
    tutorReminders: Boolean(row.tutor_reminders),
    metadata: parseMetadata(row.metadata, DEFAULTS.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class LearnerNotificationPreferenceModel {
  static defaults() {
    return { ...DEFAULTS };
  }

  static deserialize(row) {
    return deserialize(row);
  }

  static async getForUser(userId, connection = db) {
    if (!userId) {
      return null;
    }

    const row = await connection(TABLE).select('*').where({ user_id: userId }).first();
    return deserialize(row);
  }

  static async upsertForUser(userId, payload = {}, connection = db) {
    if (!userId) {
      return null;
    }

    const weeklyDigest = normaliseBoolean(payload.weeklyDigest, DEFAULTS.weeklyDigest);
    const communityDigest = normaliseBoolean(payload.communityDigest, DEFAULTS.communityDigest);
    const productUpdates = normaliseBoolean(payload.productUpdates, DEFAULTS.productUpdates);
    const smsAlerts = normaliseBoolean(payload.smsAlerts, DEFAULTS.smsAlerts);
    const tutorReminders = normaliseBoolean(payload.tutorReminders, DEFAULTS.tutorReminders);

    const insert = {
      user_id: userId,
      weekly_digest: weeklyDigest,
      community_digest: communityDigest,
      product_updates: productUpdates,
      sms_alerts: smsAlerts,
      tutor_reminders: tutorReminders,
      metadata: serialiseMetadata(payload.metadata ?? {})
    };

    const existing = await connection(TABLE).select('id').where({ user_id: userId }).first();
    if (existing) {
      await connection(TABLE)
        .where({ id: existing.id })
        .update({
          weekly_digest: insert.weekly_digest,
          community_digest: insert.community_digest,
          product_updates: insert.product_updates,
          sms_alerts: insert.sms_alerts,
          tutor_reminders: insert.tutor_reminders,
          metadata: insert.metadata,
          updated_at: connection.fn.now()
        });

      const row = await connection(TABLE).select('*').where({ id: existing.id }).first();
      return deserialize(row);
    }

    const insertResult = await connection(TABLE).insert(insert, ['id']);
    const insertedId = resolveInsertedId(insertResult);
    const row = await connection(TABLE)
      .select('*')
      .where(insertedId ? { id: insertedId } : { user_id: userId })
      .first();
    return deserialize(row);
  }
}

export const __testables = {
  DEFAULTS,
  parseMetadata,
  serialiseMetadata,
  resolveInsertedId,
  normaliseBoolean
};
