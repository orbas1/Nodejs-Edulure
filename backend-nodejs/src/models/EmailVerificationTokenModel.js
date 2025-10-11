import db from '../config/database.js';

const TABLE_NAME = 'user_email_verification_tokens';

export default class EmailVerificationTokenModel {
  static async create(payload, connection = db) {
    const insertPayload = {
      user_id: payload.userId,
      token_hash: payload.tokenHash,
      expires_at: payload.expiresAt,
      consumed_at: payload.consumedAt ?? null,
      consumed_reason: payload.consumedReason ?? null
    };
    const [id] = await connection(TABLE_NAME).insert(insertPayload);
    return connection(TABLE_NAME).where({ id }).first();
  }

  static async invalidateActiveTokens(userId, connection = db) {
    return connection(TABLE_NAME)
      .where({ user_id: userId })
      .whereNull('consumed_at')
      .update({ consumed_at: connection.fn.now(), consumed_reason: 'replaced' });
  }

  static async findActiveByHash(tokenHash, connection = db) {
    return connection(TABLE_NAME)
      .where({ token_hash: tokenHash })
      .whereNull('consumed_at')
      .andWhere('expires_at', '>', connection.fn.now())
      .first();
  }

  static async consume(id, reason, connection = db) {
    return connection(TABLE_NAME)
      .where({ id })
      .update({ consumed_at: connection.fn.now(), consumed_reason: reason ?? null });
  }
}
