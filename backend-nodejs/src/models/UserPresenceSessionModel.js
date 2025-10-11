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
    sessionId: record.session_id,
    client: record.client,
    status: record.status,
    connectedAt: record.connected_at,
    lastSeenAt: record.last_seen_at,
    expiresAt: record.expires_at,
    metadata: parseJson(record.metadata, {})
  };
}

export default class UserPresenceSessionModel {
  static async upsert(session, connection = db) {
    const payload = {
      user_id: session.userId,
      session_id: session.sessionId,
      client: session.client ?? 'web',
      status: session.status ?? 'online',
      connected_at: session.connectedAt ?? connection.fn.now(),
      last_seen_at: session.lastSeenAt ?? connection.fn.now(),
      expires_at: session.expiresAt ?? null,
      metadata: JSON.stringify(session.metadata ?? {})
    };

    await connection('user_presence_sessions')
      .insert(payload)
      .onConflict('session_id')
      .merge({
        status: payload.status,
        client: payload.client,
        last_seen_at: payload.last_seen_at,
        expires_at: payload.expires_at,
        metadata: payload.metadata
      });

    const row = await connection('user_presence_sessions').where({ session_id: session.sessionId }).first();
    return mapRecord(row);
  }

  static async clear(sessionId, connection = db) {
    await connection('user_presence_sessions').where({ session_id: sessionId }).delete();
  }

  static async listActiveByUserIds(userIds, connection = db) {
    if (!userIds?.length) return [];
    const rows = await connection('user_presence_sessions')
      .whereIn('user_id', userIds)
      .andWhere((builder) => {
        builder.whereNull('expires_at').orWhere('expires_at', '>', connection.fn.now());
      });
    return rows.map((row) => mapRecord(row));
  }

  static async listActiveForCommunity(communityId, connection = db) {
    const rows = await connection('user_presence_sessions as ups')
      .innerJoin('community_members as cm', 'ups.user_id', 'cm.user_id')
      .where('cm.community_id', communityId)
      .andWhere('cm.status', 'active')
      .andWhere((builder) => {
        builder.whereNull('ups.expires_at').orWhere('ups.expires_at', '>', connection.fn.now());
      })
      .select([
        'ups.id',
        'ups.user_id',
        'ups.session_id',
        'ups.client',
        'ups.status',
        'ups.connected_at',
        'ups.last_seen_at',
        'ups.expires_at',
        'ups.metadata'
      ]);

    return rows.map((row) => mapRecord(row));
  }
}
