import db from '../config/database.js';

const TABLE_NAME = 'user_two_factor_challenges';

export default class TwoFactorChallengeModel {
  static async create(payload, connection = db) {
    const insertPayload = {
      user_id: payload.userId,
      token_hash: payload.tokenHash,
      delivery_channel: payload.deliveryChannel ?? 'email',
      expires_at: payload.expiresAt,
      consumed_at: payload.consumedAt ?? null,
      consumed_reason: payload.consumedReason ?? null,
      attempt_count: payload.attemptCount ?? 0
    };

    const [id] = await connection(TABLE_NAME).insert(insertPayload);
    return connection(TABLE_NAME).where({ id }).first();
  }

  static async invalidateActive(userId, connection = db) {
    return connection(TABLE_NAME)
      .where({ user_id: userId })
      .whereNull('consumed_at')
      .update({ consumed_at: connection.fn.now(), consumed_reason: 'replaced' });
  }

  static async findActiveByHash(userId, tokenHash, connection = db) {
    return connection(TABLE_NAME)
      .where({ user_id: userId, token_hash: tokenHash })
      .whereNull('consumed_at')
      .andWhere('expires_at', '>', connection.fn.now())
      .first();
  }

  static async findLatestActive(userId, connection = db) {
    return connection(TABLE_NAME)
      .where({ user_id: userId })
      .whereNull('consumed_at')
      .andWhere('expires_at', '>', connection.fn.now())
      .orderBy('created_at', 'desc')
      .first();
  }

  static async incrementAttempts(id, connection = db) {
    return connection(TABLE_NAME)
      .where({ id })
      .update({ attempt_count: connection.raw('attempt_count + 1') });
  }

  static async consume(id, reason, connection = db) {
    return connection(TABLE_NAME)
      .where({ id })
      .update({ consumed_at: connection.fn.now(), consumed_reason: reason ?? null });
  }

  static async purgeExpired(connection = db) {
    return connection(TABLE_NAME)
      .where('expires_at', '<=', connection.fn.now())
      .whereNull('consumed_at')
      .update({ consumed_at: connection.fn.now(), consumed_reason: 'expired' });
  }
}
