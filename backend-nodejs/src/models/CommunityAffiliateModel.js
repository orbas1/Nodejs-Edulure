import db from '../config/database.js';
import { ensureIntegerInRange, readJsonColumn, writeJsonColumn } from '../utils/modelUtils.js';

const TABLE = 'community_affiliates';
const STATUS_WHITELIST = new Set(['pending', 'approved', 'suspended', 'revoked']);

function normaliseReferralCode(code) {
  const value = code === undefined || code === null ? '' : String(code).trim().toUpperCase();
  if (!value) {
    throw new Error('referralCode is required');
  }

  if (!/^[A-Z0-9\-]{3,60}$/.test(value)) {
    throw new Error('referralCode must contain only letters, numbers, or dashes');
  }

  return value;
}

function normaliseStatus(status, { allowNull = false } = {}) {
  if (status === undefined || status === null) {
    if (allowNull) {
      return null;
    }
    return 'pending';
  }

  const candidate = String(status).trim().toLowerCase();
  if (!STATUS_WHITELIST.has(candidate)) {
    throw new Error(`Unsupported affiliate status '${status}'`);
  }
  return candidate;
}

function mapRecord(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    communityId: record.community_id,
    userId: record.user_id,
    status: record.status,
    referralCode: record.referral_code ?? null,
    commissionRateBasisPoints: Number(record.commission_rate_bps ?? 0),
    totalEarnedCents: Number(record.total_earned_cents ?? 0),
    totalPaidCents: Number(record.total_paid_cents ?? 0),
    metadata: readJsonColumn(record.metadata, {}),
    approvedAt: record.approved_at ?? null,
    suspendedAt: record.suspended_at ?? null,
    revokedAt: record.revoked_at ?? null,
    createdAt: record.created_at ?? null,
    updatedAt: record.updated_at ?? null
  };
}

function buildInsertPayload(affiliate) {
  if (!affiliate?.communityId || !affiliate?.userId) {
    throw new Error('communityId and userId are required to create an affiliate');
  }

  return {
    community_id: ensureIntegerInRange(affiliate.communityId, {
      fieldName: 'communityId',
      min: 1
    }),
    user_id: ensureIntegerInRange(affiliate.userId, {
      fieldName: 'userId',
      min: 1
    }),
    status: normaliseStatus(affiliate.status),
    referral_code: normaliseReferralCode(affiliate.referralCode),
    commission_rate_bps: ensureIntegerInRange(affiliate.commissionRateBasisPoints, {
      fieldName: 'commissionRateBasisPoints',
      min: 0,
      max: 5000,
      defaultValue: 250
    }),
    total_earned_cents: ensureIntegerInRange(affiliate.totalEarnedCents, {
      fieldName: 'totalEarnedCents',
      min: 0,
      defaultValue: 0
    }),
    total_paid_cents: ensureIntegerInRange(affiliate.totalPaidCents, {
      fieldName: 'totalPaidCents',
      min: 0,
      defaultValue: 0
    }),
    metadata: writeJsonColumn(affiliate.metadata, {}),
    approved_at: affiliate.approvedAt ?? null,
    suspended_at: affiliate.suspendedAt ?? null,
    revoked_at: affiliate.revokedAt ?? null
  };
}

function buildUpdatePayload(updates) {
  const payload = {};

  if (updates.status !== undefined) {
    payload.status = normaliseStatus(updates.status);
  }

  if (updates.referralCode !== undefined) {
    payload.referral_code = normaliseReferralCode(updates.referralCode);
  }

  if (updates.commissionRateBasisPoints !== undefined) {
    payload.commission_rate_bps = ensureIntegerInRange(updates.commissionRateBasisPoints, {
      fieldName: 'commissionRateBasisPoints',
      min: 0,
      max: 5000,
      defaultValue: 250
    });
  }

  if (updates.totalEarnedCents !== undefined) {
    payload.total_earned_cents = ensureIntegerInRange(updates.totalEarnedCents, {
      fieldName: 'totalEarnedCents',
      min: 0,
      defaultValue: 0
    });
  }

  if (updates.totalPaidCents !== undefined) {
    payload.total_paid_cents = ensureIntegerInRange(updates.totalPaidCents, {
      fieldName: 'totalPaidCents',
      min: 0,
      defaultValue: 0
    });
  }

  if (updates.metadata !== undefined) {
    payload.metadata = writeJsonColumn(updates.metadata, {});
  }

  if (updates.approvedAt !== undefined) {
    payload.approved_at = updates.approvedAt ?? null;
  }

  if (updates.suspendedAt !== undefined) {
    payload.suspended_at = updates.suspendedAt ?? null;
  }

  if (updates.revokedAt !== undefined) {
    payload.revoked_at = updates.revokedAt ?? null;
  }

  if (updates.resetCounters === true) {
    payload.total_earned_cents = 0;
    payload.total_paid_cents = 0;
  }

  return payload;
}

export default class CommunityAffiliateModel {
  static async create(affiliate, connection = db) {
    const payload = buildInsertPayload(affiliate);
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.status !== undefined) {
      payload.status = updates.status;
    }
    if (updates.referralCode !== undefined) {
      payload.referral_code = updates.referralCode;
    }
    if (updates.commissionRateBasisPoints !== undefined) {
      payload.commission_rate_bps = updates.commissionRateBasisPoints;
    }
    if (updates.totalEarnedCents !== undefined) {
      payload.total_earned_cents = updates.totalEarnedCents;
    }
    if (updates.totalPaidCents !== undefined) {
      payload.total_paid_cents = updates.totalPaidCents;
    }
    if (updates.metadata !== undefined) {
      payload.metadata = JSON.stringify(updates.metadata ?? {});
    }
    if (updates.approvedAt !== undefined) {
      payload.approved_at = updates.approvedAt;
    }
    if (updates.suspendedAt !== undefined) {
      payload.suspended_at = updates.suspendedAt;
    }
    if (updates.revokedAt !== undefined) {
      payload.revoked_at = updates.revokedAt;
    }

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async incrementEarnings(id, { amountEarnedCents = 0, amountPaidCents = 0 }, connection = db) {
    const earned = ensureIntegerInRange(amountEarnedCents, {
      fieldName: 'amountEarnedCents',
      min: 0,
      defaultValue: 0
    });

    const paid = ensureIntegerInRange(amountPaidCents, {
      fieldName: 'amountPaidCents',
      min: 0,
      defaultValue: 0
    });

    await connection(TABLE)
      .where({ id })
      .increment({
        total_earned_cents: earned,
        total_paid_cents: paid
      })
      .update({ updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    if (!id) {
      return null;
    }
    const record = await connection(TABLE).where({ id }).first();
    return mapRecord(record);
  }

  static async findByReferralCode(referralCode, connection = db) {
    if (!referralCode) {
      return null;
    }
    const record = await connection(TABLE).where({ referral_code: normaliseReferralCode(referralCode) }).first();
    return mapRecord(record);
  }

  static async listByCommunity(communityId, { status } = {}, connection = db) {
    const community = ensureIntegerInRange(communityId, { fieldName: 'communityId', min: 1 });
    const query = connection(TABLE).where({ community_id: community });

    if (status) {
      query.andWhere({ status: normaliseStatus(status) });
    }

    const rows = await query.orderBy('created_at', 'desc');
    return rows.map((row) => mapRecord(row));
  }
}
