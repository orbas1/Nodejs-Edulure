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
    mutedUserId: record.muted_user_id,
    mutedUntil: record.muted_until,
    reason: record.reason ?? null,
    metadata: parseJson(record.metadata, {}),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class UserMuteModel {
  static async mute(actorId, targetUserId, payload = {}, connection = db) {
    const data = {
      user_id: actorId,
      muted_user_id: targetUserId,
      muted_until: payload.mutedUntil ?? null,
      reason: payload.reason ?? null,
      metadata: JSON.stringify(payload.metadata ?? {})
    };

    await connection('user_mute_list')
      .insert(data)
      .onConflict(['user_id', 'muted_user_id'])
      .merge({
        muted_until: data.muted_until,
        reason: data.reason,
        metadata: data.metadata,
        updated_at: connection.fn.now()
      });

    const record = await connection('user_mute_list')
      .where({ user_id: actorId, muted_user_id: targetUserId })
      .first();
    return mapRecord(record);
  }

  static async unmute(actorId, targetUserId, connection = db) {
    await connection('user_mute_list')
      .where({ user_id: actorId, muted_user_id: targetUserId })
      .del();
  }

  static async isMuted(actorId, targetUserId, connection = db) {
    const record = await connection('user_mute_list')
      .where({ user_id: actorId, muted_user_id: targetUserId })
      .first();
    if (!record) return false;
    if (!record.muted_until) return true;
    return new Date(record.muted_until) > new Date();
  }

  static async listMutedIds(actorId, connection = db) {
    const rows = await connection('user_mute_list')
      .where({ user_id: actorId })
      .select('muted_user_id');
    return rows.map((row) => row.muted_user_id);
  }
}
