import crypto from 'crypto';

import db from '../config/database.js';

const TABLE_NAME = 'user_magic_links';

function parseJson(value) {
  if (!value) {
    return null;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function baseQuery(connection = db) {
  return connection(TABLE_NAME);
}

function serialize(record) {
  if (!record) {
    return null;
  }
  return {
    id: record.id,
    userId: record.user_id,
    email: record.email,
    tokenHash: record.token_hash,
    redirectTo: record.redirect_to,
    metadata: parseJson(record.metadata),
    expiresAt: record.expires_at,
    consumedAt: record.consumed_at,
    consumedIp: record.consumed_ip,
    consumedUserAgent: record.consumed_user_agent,
    consumedReason: record.consumed_reason,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class UserMagicLinkModel {
  static parseMetadata(metadata) {
    return parseJson(metadata);
  }

  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async create(payload, connection = db) {
    const insertPayload = {
      user_id: payload.userId,
      email: payload.email,
      token_hash: payload.tokenHash,
      redirect_to: payload.redirectTo ?? null,
      metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
      expires_at: payload.expiresAt,
      consumed_at: null,
      consumed_ip: null,
      consumed_user_agent: null,
      consumed_reason: null
    };

    const [id] = await baseQuery(connection).insert(insertPayload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const record = await baseQuery(connection)
      .clone()
      .select('*')
      .where({ id })
      .first();
    return serialize(record);
  }

  static async findActiveByHash(tokenHash, connection = db, { forUpdate = false } = {}) {
    const query = baseQuery(connection)
      .clone()
      .select('*')
      .where({ token_hash: tokenHash })
      .whereNull('consumed_at')
      .where('expires_at', '>', connection.fn.now());

    if (forUpdate) {
      query.forUpdate();
    }

    const record = await query.first();
    return serialize(record);
  }

  static async markConsumed(id, { reason, ipAddress, userAgent }, connection = db) {
    await baseQuery(connection)
      .clone()
      .where({ id })
      .update({
        consumed_at: connection.fn.now(),
        consumed_reason: reason ?? null,
        consumed_ip: ipAddress ?? null,
        consumed_user_agent: userAgent ?? null
      });
    return this.findById(id, connection);
  }
}
