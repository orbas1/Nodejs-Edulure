import UserSessionModel from '../models/UserSessionModel.js';
import { env } from '../config/env.js';

function toDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildRevokedError(message = 'Session has been revoked or expired') {
  const error = new Error(message);
  error.status = 401;
  error.code = 'SESSION_REVOKED';
  return error;
}

function serializeSession(session) {
  const expiresAt = toDate(session.expiresAt);
  const lastUsedAt = toDate(session.lastUsedAt);
  const rotatedAt = toDate(session.rotatedAt);
  const revokedAt = toDate(session.revokedAt);

  return {
    id: session.id,
    userId: session.userId,
    ipAddress: session.ipAddress ?? null,
    userAgent: session.userAgent ?? null,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    lastUsedAt: lastUsedAt ? lastUsedAt.toISOString() : null,
    revokedAt: revokedAt ? revokedAt.toISOString() : null,
    rotatedAt: rotatedAt ? rotatedAt.toISOString() : null,
    revokedReason: session.revokedReason ?? null,
    revokedBy: session.revokedBy ?? null,
    client: session.client ?? null,
    clientMetadata:
      session.clientMetadata && typeof session.clientMetadata === 'object'
        ? { ...session.clientMetadata }
        : {}
  };
}

export class SessionRegistry {
  constructor({ ttlMs = env.security.sessionValidationCacheTtlMs } = {}) {
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  getCacheEntry(sessionId) {
    const entry = this.cache.get(sessionId);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(sessionId);
      return null;
    }

    return entry;
  }

  remember(session) {
    if (!session || !session.id) {
      return;
    }

    const serialized = serializeSession(session);
    this.cache.set(session.id, {
      status: 'active',
      session: serialized,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  markRevoked(sessionId, reason = 'revoked') {
    if (!sessionId) {
      return;
    }

    this.cache.set(sessionId, {
      status: 'revoked',
      reason,
      expiresAt: Date.now() + this.ttlMs
    });
  }

  clear(sessionId) {
    if (!sessionId) {
      return;
    }
    this.cache.delete(sessionId);
  }

  async ensureActive(sessionId, connection) {
    if (!sessionId) {
      throw buildRevokedError('Session identifier missing from token payload');
    }

    const cached = this.getCacheEntry(sessionId);
    if (cached) {
      if (cached.status === 'revoked') {
        throw buildRevokedError();
      }
      return cached.session;
    }

    const session = await UserSessionModel.findById(sessionId, connection);
    if (!session) {
      this.markRevoked(sessionId, 'unknown');
      throw buildRevokedError();
    }

    const expiresAt = toDate(session.expiresAt);
    if (!expiresAt || expiresAt.getTime() <= Date.now() || session.revokedAt) {
      this.markRevoked(sessionId, session.revokedReason ?? 'expired');
      throw buildRevokedError();
    }

    this.remember(session);
    return this.getCacheEntry(sessionId).session;
  }
}

export const sessionRegistry = new SessionRegistry();
