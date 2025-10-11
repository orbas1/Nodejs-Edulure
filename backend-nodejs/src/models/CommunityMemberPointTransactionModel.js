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

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    communityId: row.community_id,
    userId: row.user_id,
    awardedBy: row.awarded_by ?? null,
    deltaPoints: Number(row.delta_points ?? 0),
    balanceAfter: Number(row.balance_after ?? 0),
    reason: row.reason,
    source: row.source,
    referenceId: row.reference_id ?? null,
    metadata: parseJson(row.metadata, {}),
    awardedAt: row.awarded_at
  };
}

export default class CommunityMemberPointTransactionModel {
  static table(connection = db) {
    return connection('community_member_point_transactions');
  }

  static async create(transaction, connection = db) {
    const payload = {
      community_id: transaction.communityId,
      user_id: transaction.userId,
      awarded_by: transaction.awardedBy ?? null,
      delta_points: transaction.deltaPoints,
      balance_after: transaction.balanceAfter,
      reason: transaction.reason,
      source: transaction.source ?? 'manual',
      reference_id: transaction.referenceId ?? null,
      metadata: JSON.stringify(transaction.metadata ?? {}),
      awarded_at: transaction.awardedAt ?? connection.fn.now()
    };

    const [id] = await this.table(connection).insert(payload);
    const row = await this.table(connection).where({ id }).first();
    return mapRow(row);
  }

  static async listRecentForUser(communityId, userId, { limit = 20 } = {}, connection = db) {
    const rows = await this.table(connection)
      .where({ community_id: communityId, user_id: userId })
      .orderBy('awarded_at', 'desc')
      .limit(limit);

    return rows.map((row) => mapRow(row));
  }
}
