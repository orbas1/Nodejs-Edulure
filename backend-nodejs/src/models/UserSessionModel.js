import db from '../config/database.js';

const BASE_COLUMNS = [
  'id',
  'user_id as userId',
  'refresh_token_hash as refreshTokenHash',
  'user_agent as userAgent',
  'ip_address as ipAddress',
  'expires_at as expiresAt',
  'created_at as createdAt',
  'last_used_at as lastUsedAt',
  'revoked_at as revokedAt',
  'revoked_reason as revokedReason',
  'revoked_by as revokedBy',
  'rotated_at as rotatedAt',
  'deleted_at as deletedAt'
];

export default class UserSessionModel {
  static query(connection = db, { includeDeleted = false } = {}) {
    const builder = connection('user_sessions');
    if (!includeDeleted) {
      builder.whereNull('deleted_at');
    }
    return builder;
  }

  static async create(session, connection = db) {
    const payload = {
      user_id: session.userId,
      refresh_token_hash: session.refreshTokenHash,
      user_agent: session.userAgent ?? null,
      ip_address: session.ipAddress ?? null,
      expires_at: session.expiresAt,
      last_used_at: connection.fn.now()
    };
    const [id] = await this.query(connection, { includeDeleted: true }).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db, { forUpdate = false } = {}) {
    const query = this.query(connection).select(BASE_COLUMNS).where({ id }).first();
    return forUpdate ? query.forUpdate() : query;
  }

  static async findActiveByHash(refreshTokenHash, connection = db, { forUpdate = false } = {}) {
    const query = this.query(connection)
      .select(BASE_COLUMNS)
      .where({ refresh_token_hash: refreshTokenHash })
      .whereNull('revoked_at')
      .andWhere('expires_at', '>', connection.fn.now())
      .first();
    return forUpdate ? query.forUpdate() : query;
  }

  static async revokeById(id, reason, connection = db, revokedBy = null) {
    return this.query(connection)
      .where({ id })
      .update({
        revoked_at: connection.fn.now(),
        revoked_reason: reason ?? null,
        revoked_by: revokedBy
      });
  }

  static async markRotated(id, connection = db) {
    return this.query(connection)
      .where({ id })
      .update({ rotated_at: connection.fn.now() });
  }

  static async revokeByHash(refreshTokenHash, reason, connection = db) {
    return this.query(connection)
      .where({ refresh_token_hash: refreshTokenHash })
      .update({ revoked_at: connection.fn.now(), revoked_reason: reason ?? null });
  }

  static async revokeOtherSessions(userId, excludeSessionId, reason, connection = db, revokedBy = null) {
    const sessions = await this.query(connection)
      .select('id')
      .where({ user_id: userId })
      .modify((query) => {
        if (excludeSessionId) {
          query.whereNot({ id: excludeSessionId });
        }
      })
      .whereNull('revoked_at');

    if (sessions.length === 0) {
      return [];
    }

    const sessionIds = sessions.map((session) => session.id);
    await this.query(connection)
      .whereIn('id', sessionIds)
      .update({
        revoked_at: connection.fn.now(),
        revoked_reason: reason ?? null,
        revoked_by: revokedBy
      });
    return sessionIds;
  }

  static async revokeExpiredSessions(userId, connection = db) {
    const expired = await this.query(connection)
      .select('id')
      .where({ user_id: userId })
      .where('expires_at', '<=', connection.fn.now())
      .whereNull('revoked_at');

    if (expired.length === 0) {
      return [];
    }

    const ids = expired.map((session) => session.id);
    await this.query(connection)
      .whereIn('id', ids)
      .update({ revoked_at: connection.fn.now(), revoked_reason: 'expired' });
    return ids;
  }

  static async pruneExcessSessions(userId, keep, connection = db) {
    if (keep <= 0) {
      return [];
    }

    const activeSessions = await this.query(connection)
      .select('id')
      .where({ user_id: userId })
      .whereNull('revoked_at')
      .andWhere('expires_at', '>', connection.fn.now())
      .orderBy('created_at', 'desc');

    if (activeSessions.length <= keep) {
      return [];
    }

    const toRevoke = activeSessions.slice(keep).map((session) => session.id);
    await this.query(connection)
      .whereIn('id', toRevoke)
      .update({ revoked_at: connection.fn.now(), revoked_reason: 'session_limit_exceeded' });
    return toRevoke;
  }

  static async touch(sessionId, connection = db) {
    return this.query(connection)
      .where({ id: sessionId })
      .update({ last_used_at: connection.fn.now() });
  }
}
