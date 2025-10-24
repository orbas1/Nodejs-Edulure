import db from '../config/database.js';

const TABLE = 'notification_device_registrations';

function parseJson(value, fallback = {}) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  try {
    return JSON.parse(trimmed);
  } catch (_error) {
    return fallback;
  }
}

function serialiseJson(value) {
  if (value === null || value === undefined) {
    return JSON.stringify({});
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return JSON.stringify({});
    }
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch (_error) {
      return JSON.stringify({});
    }
  }
  try {
    return JSON.stringify(value ?? {});
  } catch (_error) {
    return JSON.stringify({});
  }
}

function mapRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    userId: row.user_id,
    deviceToken: row.device_token,
    platform: row.platform,
    appVersion: row.app_version,
    osVersion: row.os_version,
    locale: row.locale,
    lastRegisteredAt: row.last_registered_at,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class NotificationDeviceModel {
  static mapRow = mapRow;

  static async register(payload, connection = db) {
    const insertPayload = {
      user_id: payload.userId ?? null,
      device_token: payload.deviceToken,
      platform: (payload.platform ?? 'unknown').toLowerCase(),
      app_version: payload.appVersion ?? null,
      os_version: payload.osVersion ?? null,
      locale: payload.locale ?? null,
      last_registered_at: payload.lastRegisteredAt ?? connection.fn.now(),
      metadata: serialiseJson(payload.metadata)
    };

    const query = connection(TABLE)
      .insert(insertPayload)
      .onConflict('device_token')
      .merge({
        user_id: payload.userId ?? insertPayload.user_id,
        platform: (payload.platform ?? 'unknown').toLowerCase(),
        app_version: payload.appVersion ?? null,
        os_version: payload.osVersion ?? null,
        locale: payload.locale ?? null,
        last_registered_at: payload.lastRegisteredAt ?? connection.fn.now(),
        metadata: serialiseJson(payload.metadata),
        updated_at: connection.fn.now()
      })
      .returning('*');

    const result = await query;
    const [row] = Array.isArray(result) ? result : [];
    if (row) {
      return mapRow(row);
    }
    const fallback = await connection(TABLE).where({ device_token: payload.deviceToken }).first();
    return mapRow(fallback);
  }
}

