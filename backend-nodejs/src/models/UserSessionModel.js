import db from '../config/database.js';

const TABLE_NAME = 'user_sessions';

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
  'deleted_at as deletedAt',
  'client',
  'client_metadata as clientMetadata'
];

function baseQuery(connection, { includeDeleted = false } = {}) {
  const builder = connection(TABLE_NAME);
  if (!includeDeleted) {
    builder.whereNull('deleted_at');
  }
  return builder;
}

function resolveInsertedId(result) {
  if (result === null || result === undefined) {
    return null;
  }

  if (Array.isArray(result)) {
    if (result.length === 0) {
      return null;
    }
    if (result.length === 1) {
      return resolveInsertedId(result[0]);
    }
    const [first] = result;
    return resolveInsertedId(first);
  }

  if (typeof result === 'object') {
    if (result.id !== undefined && result.id !== null) {
      return result.id;
    }
    if (result.insertId !== undefined && result.insertId !== null) {
      return result.insertId;
    }
    if (result.insertedId !== undefined && result.insertedId !== null) {
      return result.insertedId;
    }
    if (typeof result.toString === 'function' && result.toString !== Object.prototype.toString) {
      const numeric = Number(result);
      if (!Number.isNaN(numeric)) {
        return numeric;
      }
    }
    return null;
  }

  if (typeof result === 'bigint') {
    return Number(result);
  }

  if (typeof result === 'number' || typeof result === 'string') {
    return result;
  }

  return null;
}

function parseClientMetadata(value) {
  if (!value) {
    return {};
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null ? { ...parsed } : {};
    } catch (_error) {
      return {};
    }
  }
  if (typeof value === 'object') {
    if (value instanceof Buffer) {
      try {
        const decoded = value.toString('utf8');
        const parsed = JSON.parse(decoded);
        return typeof parsed === 'object' && parsed !== null ? { ...parsed } : {};
      } catch (_error) {
        return {};
      }
    }
    return { ...value };
  }
  return {};
}

function mapSessionRow(row) {
  if (!row) {
    return row;
  }
  return {
    ...row,
    clientMetadata: parseClientMetadata(row.clientMetadata)
  };
}

export default class UserSessionModel {
  static query(connection = db, options = {}) {
    return baseQuery(connection, options);
  }

  static async create(session, connection = db) {
    const payload = {
      user_id: session.userId,
      refresh_token_hash: session.refreshTokenHash,
      user_agent: session.userAgent ?? null,
      ip_address: session.ipAddress ?? null,
      expires_at: session.expiresAt,
      last_used_at: connection.fn.now(),
      client: session.client ?? 'web',
      client_metadata: session.clientMetadata ? JSON.stringify(session.clientMetadata) : JSON.stringify({})
    };

    const insertResult = await baseQuery(connection, { includeDeleted: true }).insert(payload, ['id']);
    let sessionId = resolveInsertedId(insertResult);

    if (sessionId === null || sessionId === undefined) {
      const fallback = await baseQuery(connection, { includeDeleted: true })
        .select('id')
        .where({ user_id: session.userId, refresh_token_hash: session.refreshTokenHash })
        .orderBy('created_at', 'desc')
        .first();
      sessionId = fallback?.id ?? null;
    }

    return sessionId !== null && sessionId !== undefined ? this.findById(sessionId, connection) : null;
  }

  static async findById(id, connection = db, { forUpdate = false } = {}) {
    const builder = baseQuery(connection).select(BASE_COLUMNS).where({ id });
    if (forUpdate) {
      builder.forUpdate();
    }
    return builder.first().then(mapSessionRow);
  }

  static async findActiveByHash(refreshTokenHash, connection = db, { forUpdate = false } = {}) {
    const builder = baseQuery(connection)
      .select(BASE_COLUMNS)
      .where({ refresh_token_hash: refreshTokenHash })
      .whereNull('revoked_at')
      .andWhere('expires_at', '>', connection.fn.now());

    if (forUpdate) {
      builder.forUpdate();
    }

    return builder.first().then(mapSessionRow);
  }

  static async revokeById(id, reason, connection = db, revokedBy = null) {
    return baseQuery(connection)
      .where({ id })
      .update({
        revoked_at: connection.fn.now(),
        revoked_reason: reason ?? null,
        revoked_by: revokedBy
      });
  }

  static async markRotated(id, connection = db) {
    return baseQuery(connection)
      .where({ id })
      .update({ rotated_at: connection.fn.now() });
  }

  static async revokeByHash(refreshTokenHash, reason, connection = db) {
    return baseQuery(connection)
      .where({ refresh_token_hash: refreshTokenHash })
      .update({ revoked_at: connection.fn.now(), revoked_reason: reason ?? null });
  }

  static async revokeOtherSessions(userId, excludeSessionId, reason, connection = db, revokedBy = null) {
    const sessions = await baseQuery(connection)
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
    await baseQuery(connection)
      .whereIn('id', sessionIds)
      .update({
        revoked_at: connection.fn.now(),
        revoked_reason: reason ?? null,
        revoked_by: revokedBy
      });
    return sessionIds;
  }

  static async revokeExpiredSessions(userId, connection = db) {
    const expired = await baseQuery(connection)
      .select('id')
      .where({ user_id: userId })
      .where('expires_at', '<=', connection.fn.now())
      .whereNull('revoked_at');

    if (expired.length === 0) {
      return [];
    }

    const ids = expired.map((session) => session.id);
    await baseQuery(connection)
      .whereIn('id', ids)
      .update({ revoked_at: connection.fn.now(), revoked_reason: 'expired' });
    return ids;
  }

  static async pruneExcessSessions(userId, keep, connection = db) {
    if (keep <= 0) {
      return [];
    }

    const activeSessions = await baseQuery(connection)
      .select('id')
      .where({ user_id: userId })
      .whereNull('revoked_at')
      .andWhere('expires_at', '>', connection.fn.now())
      .orderBy('created_at', 'desc');

    if (activeSessions.length <= keep) {
      return [];
    }

    const toRevoke = activeSessions.slice(keep).map((session) => session.id);
    await baseQuery(connection)
      .whereIn('id', toRevoke)
      .update({ revoked_at: connection.fn.now(), revoked_reason: 'session_limit_exceeded' });
    return toRevoke;
  }

  static async touch(sessionId, connection = db) {
    return baseQuery(connection)
      .where({ id: sessionId })
      .update({ last_used_at: connection.fn.now() });
  }
}

export const __testables = {
  resolveInsertedId,
  baseQuery
};
