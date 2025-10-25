import { createHash } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'billing_portal_sessions';

function parseJson(value, fallback = {}) {
  if (!value) {
    return fallback;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
}

function normaliseDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function deserialize(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    userId: row.user_id,
    portalUrl: row.portal_url,
    returnUrl: row.return_url,
    status: row.status,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    consumedAt: row.consumed_at ? new Date(row.consumed_at) : null,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null
  };
}

export default class BillingPortalSessionModel {
  static hashToken(token) {
    if (!token) {
      return null;
    }
    return createHash('sha256').update(String(token).trim()).digest('hex');
  }

  static deserialize(row) {
    return deserialize(row);
  }

  static async expireStaleSessions(referenceDate = new Date(), connection = db) {
    const timestamp = normaliseDate(referenceDate);
    if (!timestamp) {
      return 0;
    }

    return connection(TABLE)
      .where('status', 'active')
      .andWhere('expires_at', '<', timestamp)
      .update({ status: 'expired', updated_at: connection.fn.now() });
  }

  static async expireActiveSessionsForUser(userId, connection = db) {
    if (!userId) {
      return 0;
    }
    return connection(TABLE)
      .where({ user_id: userId, status: 'active' })
      .update({ status: 'expired', updated_at: connection.fn.now() });
  }

  static async create(session, connection = db) {
    if (!session?.userId) {
      throw new Error('A user identifier is required to create a billing portal session');
    }

    const tokenHash = this.hashToken(session.token);
    if (!tokenHash) {
      throw new Error('A non-empty session token is required');
    }

    const expiresAt = normaliseDate(session.expiresAt);
    if (!expiresAt) {
      throw new Error('A valid expiration time is required for billing portal sessions');
    }

    const payload = {
      user_id: session.userId,
      session_token_hash: tokenHash,
      portal_url: session.portalUrl,
      return_url: session.returnUrl ?? null,
      status: session.status ?? 'active',
      expires_at: expiresAt,
      consumed_at: session.consumedAt ?? null,
      metadata: JSON.stringify(session.metadata ?? {})
    };

    const executeInsert = async (trx) => {
      await this.expireActiveSessionsForUser(session.userId, trx);
      await trx(TABLE).insert(payload);
      const row = await trx(TABLE).where({ session_token_hash: tokenHash }).first();
      return deserialize(row);
    };

    if (connection?.isTransaction) {
      return executeInsert(connection);
    }

    return connection.transaction(executeInsert);
  }

  static async markConsumed(token, connection = db) {
    const tokenHash = this.hashToken(token);
    if (!tokenHash) {
      return null;
    }
    const updated = await connection(TABLE)
      .where({ session_token_hash: tokenHash, status: 'active' })
      .update({ status: 'consumed', consumed_at: connection.fn.now(), updated_at: connection.fn.now() });
    if (!updated) {
      return null;
    }
    const row = await connection(TABLE).where({ session_token_hash: tokenHash }).first();
    return deserialize(row);
  }

  static async findByToken(token, connection = db) {
    const tokenHash = this.hashToken(token);
    if (!tokenHash) {
      return null;
    }
    const row = await connection(TABLE).where({ session_token_hash: tokenHash }).first();
    return deserialize(row);
  }

  static async listActiveByUser(userId, connection = db) {
    if (!userId) {
      return [];
    }
    const query = connection(TABLE)
      .select('*')
      .where({ user_id: userId, status: 'active' })
      .orderBy('created_at', 'desc');

    let rows = await query;
    if (!Array.isArray(rows)) {
      if (typeof rows?.selectRows === 'function') {
        rows = await rows.selectRows();
      } else {
        rows = rows ? [rows] : [];
      }
    }

    return rows.map(deserialize);
  }
}
