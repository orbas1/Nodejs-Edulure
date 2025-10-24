import db from '../config/database.js';

const TABLE = 'notification_preferences';

function parseJson(value, fallback) {
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

function serialiseJson(value, fallback = '{}') {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch (_error) {
      return fallback;
    }
  }
  try {
    return JSON.stringify(value ?? {});
  } catch (_error) {
    return fallback;
  }
}

function mapRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    userId: row.user_id,
    channels: parseJson(row.channels, {}),
    categories: parseJson(row.categories, {}),
    slackChannel: row.slack_channel ?? null,
    slackWorkspace: row.slack_workspace ?? null,
    lastSyncedAt: row.last_synced_at,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class NotificationPreferenceModel {
  static mapRow = mapRow;

  static async findByUserId(userId, connection = db) {
    const row = await connection(TABLE).where({ user_id: userId }).first();
    return mapRow(row);
  }

  static async upsert(userId, payload = {}, connection = db) {
    const insertPayload = {
      user_id: userId,
      channels: serialiseJson(payload.channels),
      categories: serialiseJson(payload.categories),
      slack_channel: payload.slackChannel ?? null,
      slack_workspace: payload.slackWorkspace ?? null,
      last_synced_at: payload.lastSyncedAt ?? null,
      metadata: serialiseJson(payload.metadata)
    };

    const query = connection(TABLE)
      .insert(insertPayload)
      .onConflict('user_id')
      .merge({
        channels: serialiseJson(payload.channels),
        categories: serialiseJson(payload.categories),
        slack_channel: payload.slackChannel ?? null,
        slack_workspace: payload.slackWorkspace ?? null,
        last_synced_at: payload.lastSyncedAt ?? null,
        metadata: serialiseJson(payload.metadata),
        updated_at: connection.fn.now()
      })
      .returning('*');

    const result = await query;
    const [row] = Array.isArray(result) ? result : [];
    if (row) {
      return mapRow(row);
    }
    return this.findByUserId(userId, connection);
  }
}

