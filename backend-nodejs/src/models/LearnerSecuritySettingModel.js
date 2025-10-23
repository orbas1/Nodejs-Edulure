import db from '../config/database.js';

const TABLE = 'learner_security_settings';

const DEFAULTS = Object.freeze({
  requireMfa: false,
  notifyOnNewDevice: true,
  sessionTimeoutMinutes: 60,
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
    // ignore parse errors
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

function normaliseTimeout(value, fallback = DEFAULTS.sessionTimeoutMinutes) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    const rounded = Math.round(numeric);
    if (rounded >= 15 && rounded <= 720) {
      return rounded;
    }
  }
  return fallback;
}

function deserialize(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    requireMfa: Boolean(row.require_mfa),
    notifyOnNewDevice: Boolean(row.notify_on_new_device),
    sessionTimeoutMinutes: Number(row.session_timeout_minutes ?? DEFAULTS.sessionTimeoutMinutes),
    metadata: parseMetadata(row.metadata, DEFAULTS.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class LearnerSecuritySettingModel {
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

    const requireMfa = normaliseBoolean(payload.requireMfa, DEFAULTS.requireMfa);
    const notifyOnNewDevice = normaliseBoolean(payload.notifyOnNewDevice, DEFAULTS.notifyOnNewDevice);
    const sessionTimeoutMinutes = normaliseTimeout(payload.sessionTimeoutMinutes, DEFAULTS.sessionTimeoutMinutes);

    const insert = {
      user_id: userId,
      require_mfa: requireMfa,
      notify_on_new_device: notifyOnNewDevice,
      session_timeout_minutes: sessionTimeoutMinutes,
      metadata: serialiseMetadata(payload.metadata ?? {})
    };

    const existing = await connection(TABLE).select('id').where({ user_id: userId }).first();
    if (existing) {
      await connection(TABLE)
        .where({ id: existing.id })
        .update({
          require_mfa: insert.require_mfa,
          notify_on_new_device: insert.notify_on_new_device,
          session_timeout_minutes: insert.session_timeout_minutes,
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
  normaliseBoolean,
  normaliseTimeout
};
