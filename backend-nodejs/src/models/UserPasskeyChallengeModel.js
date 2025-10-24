import db from '../config/database.js';

const TABLE_NAME = 'user_passkey_challenges';

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function serialize(record) {
  if (!record) {
    return null;
  }
  return {
    requestId: record.request_id,
    userId: record.user_id,
    email: record.email,
    type: record.type,
    challenge: record.challenge,
    optionsSnapshot: parseJson(record.options_snapshot) ?? {},
    metadata: parseJson(record.metadata),
    expiresAt: record.expires_at,
    consumedAt: record.consumed_at,
    consumedReason: record.consumed_reason,
    consumedIp: record.consumed_ip,
    consumedUserAgent: record.consumed_user_agent,
    createdAt: record.created_at
  };
}

export default class UserPasskeyChallengeModel {
  static query(connection = db) {
    return connection(TABLE_NAME);
  }

  static async create(payload, connection = db) {
    const insertPayload = {
      request_id: payload.requestId,
      user_id: payload.userId ?? null,
      email: payload.email ?? null,
      type: payload.type,
      challenge: payload.challenge,
      options_snapshot: JSON.stringify(payload.optionsSnapshot ?? {}),
      metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
      expires_at: payload.expiresAt,
      consumed_at: null,
      consumed_reason: null,
      consumed_ip: null,
      consumed_user_agent: null
    };

    await this.query(connection).insert(insertPayload);
    return this.findById(payload.requestId, connection);
  }

  static async findById(requestId, connection = db, { forUpdate = false } = {}) {
    const builder = this.query(connection)
      .clone()
      .select('*')
      .where({ request_id: requestId });

    if (forUpdate) {
      builder.forUpdate();
    }

    const row = await builder.first();
    return serialize(row);
  }

  static async findActive(requestId, connection = db, { forUpdate = false } = {}) {
    const builder = this.query(connection)
      .clone()
      .select('*')
      .where({ request_id: requestId })
      .whereNull('consumed_at')
      .where('expires_at', '>', connection.fn.now());

    if (forUpdate) {
      builder.forUpdate();
    }

    const row = await builder.first();
    return serialize(row);
  }

  static async consume(requestId, { reason, ipAddress, userAgent }, connection = db) {
    await this.query(connection)
      .clone()
      .where({ request_id: requestId })
      .update({
        consumed_at: connection.fn.now(),
        consumed_reason: reason ?? null,
        consumed_ip: ipAddress ?? null,
        consumed_user_agent: userAgent ?? null
      });
    return this.findById(requestId, connection);
  }
}
