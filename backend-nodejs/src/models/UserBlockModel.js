import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function mapRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    userId: record.user_id,
    blockedUserId: record.blocked_user_id,
    reason: record.reason ?? null,
    metadata: parseJson(record.metadata, {}),
    blockedAt: record.blocked_at,
    expiresAt: record.expires_at
  };
}

export default class UserBlockModel {
  static async isBlocked(actorId, targetUserId, connection = db) {
    const record = await connection('user_block_list')
      .where({ user_id: actorId, blocked_user_id: targetUserId })
      .first();
    if (!record) return false;
    if (!record.expires_at) return true;
    return new Date(record.expires_at) > new Date();
  }

  static async block(actorId, targetUserId, payload = {}, connection = db) {
    const data = {
      user_id: actorId,
      blocked_user_id: targetUserId,
      reason: payload.reason ?? null,
      metadata: JSON.stringify(payload.metadata ?? {})
    };

    await connection('user_block_list')
      .insert(data)
      .onConflict(['user_id', 'blocked_user_id'])
      .merge({
        reason: data.reason,
        metadata: data.metadata,
        blocked_at: connection.fn.now(),
        expires_at: payload.expiresAt ?? null
      });

    const record = await connection('user_block_list')
      .where({ user_id: actorId, blocked_user_id: targetUserId })
      .first();
    return mapRecord(record);
  }

  static async unblock(actorId, targetUserId, connection = db) {
    await connection('user_block_list')
      .where({ user_id: actorId, blocked_user_id: targetUserId })
      .del();
  }

  static async listBlockedIds(actorId, connection = db) {
    const rows = await connection('user_block_list')
      .where({ user_id: actorId })
      .select('blocked_user_id');
    return rows.map((row) => row.blocked_user_id);
  }

  static async listBlockersFor(userId, connection = db) {
    const rows = await connection('user_block_list')
      .where({ blocked_user_id: userId })
      .select('user_id');
    return rows.map((row) => row.user_id);
  }
}
