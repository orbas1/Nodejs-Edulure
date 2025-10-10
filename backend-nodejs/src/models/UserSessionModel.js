import db from '../config/database.js';

export default class UserSessionModel {
  static async create(session, connection = db) {
    const payload = {
      user_id: session.userId,
      refresh_token_hash: session.refreshTokenHash,
      user_agent: session.userAgent ?? null,
      ip_address: session.ipAddress ?? null,
      expires_at: session.expiresAt
    };
    const [id] = await connection('user_sessions').insert(payload);
    return connection('user_sessions').where({ id }).first();
  }

  static async revoke(refreshTokenHash, reason, connection = db) {
    return connection('user_sessions')
      .where({ refresh_token_hash: refreshTokenHash })
      .update({ revoked_at: connection.fn.now(), revoked_reason: reason ?? null });
  }
}
