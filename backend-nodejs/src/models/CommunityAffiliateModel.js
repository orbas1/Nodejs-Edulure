import db from '../config/database.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function mapRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    communityId: record.community_id,
    userId: record.user_id,
    status: record.status,
    referralCode: record.referral_code,
    commissionRateBasisPoints: Number(record.commission_rate_bps),
    totalEarnedCents: Number(record.total_earned_cents ?? 0),
    totalPaidCents: Number(record.total_paid_cents ?? 0),
    metadata: parseJson(record.metadata, {}),
    approvedAt: record.approved_at,
    suspendedAt: record.suspended_at,
    revokedAt: record.revoked_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class CommunityAffiliateModel {
  static async create(affiliate, connection = db) {
    const payload = {
      community_id: affiliate.communityId,
      user_id: affiliate.userId,
      status: affiliate.status ?? 'pending',
      referral_code: affiliate.referralCode,
      commission_rate_bps: affiliate.commissionRateBasisPoints ?? 250,
      total_earned_cents: affiliate.totalEarnedCents ?? 0,
      total_paid_cents: affiliate.totalPaidCents ?? 0,
      metadata: JSON.stringify(affiliate.metadata ?? {}),
      approved_at: affiliate.approvedAt ?? null,
      suspended_at: affiliate.suspendedAt ?? null,
      revoked_at: affiliate.revokedAt ?? null
    };
    const [id] = await connection('community_affiliates').insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.referralCode !== undefined) payload.referral_code = updates.referralCode;
    if (updates.commissionRateBasisPoints !== undefined)
      payload.commission_rate_bps = updates.commissionRateBasisPoints;
    if (updates.totalEarnedCents !== undefined) payload.total_earned_cents = updates.totalEarnedCents;
    if (updates.totalPaidCents !== undefined) payload.total_paid_cents = updates.totalPaidCents;
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});
    if (updates.approvedAt !== undefined) payload.approved_at = updates.approvedAt;
    if (updates.suspendedAt !== undefined) payload.suspended_at = updates.suspendedAt;
    if (updates.revokedAt !== undefined) payload.revoked_at = updates.revokedAt;

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection('community_affiliates')
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async incrementEarnings(id, { amountEarnedCents = 0, amountPaidCents = 0 }, connection = db) {
    await connection('community_affiliates')
      .where({ id })
      .increment({
        total_earned_cents: amountEarnedCents,
        total_paid_cents: amountPaidCents
      })
      .update({ updated_at: connection.fn.now() });
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const record = await connection('community_affiliates').where({ id }).first();
    return mapRecord(record);
  }

  static async findByReferralCode(referralCode, connection = db) {
    const record = await connection('community_affiliates').where({ referral_code: referralCode }).first();
    return mapRecord(record);
  }

  static async listByCommunity(communityId, { status } = {}, connection = db) {
    const query = connection('community_affiliates').where({ community_id: communityId });
    if (status) {
      query.andWhere({ status });
    }
    const rows = await query.orderBy('created_at', 'desc');
    return rows.map((row) => mapRecord(row));
  }
}
