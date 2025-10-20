import db from '../config/database.js';

const TABLE = 'learner_affiliate_channels';

function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : fallback;
    }
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
}

function deserialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    handle: row.handle ?? null,
    referralCode: row.referral_code,
    trackingUrl: row.tracking_url ?? null,
    status: row.status,
    commissionRateBps: Number(row.commission_rate_bps ?? 0),
    totalEarningsCents: Number(row.total_earnings_cents ?? 0),
    totalPaidCents: Number(row.total_paid_cents ?? 0),
    notes: parseJson(row.notes, []),
    performance: parseJson(row.performance, {}),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class LearnerAffiliateChannelModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async listByUserId(userId, connection = db) {
    if (!userId) return [];
    const rows = await connection(TABLE)
      .select([
        'id',
        'user_id',
        'platform',
        'handle',
        'referral_code',
        'tracking_url',
        'status',
        'commission_rate_bps',
        'total_earnings_cents',
        'total_paid_cents',
        'notes',
        'performance',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
    return rows.map(deserialize);
  }

  static async findByIdForUser(userId, id, connection = db) {
    if (!userId || !id) return null;
    const row = await connection(TABLE)
      .select('*')
      .where({ id, user_id: userId })
      .first();
    return deserialize(row);
  }

  static async create(channel, connection = db) {
    const payload = {
      user_id: channel.userId,
      platform: channel.platform,
      handle: channel.handle ?? null,
      referral_code: channel.referralCode,
      tracking_url: channel.trackingUrl ?? null,
      status: channel.status ?? 'draft',
      commission_rate_bps: channel.commissionRateBps ?? 250,
      total_earnings_cents: channel.totalEarningsCents ?? 0,
      total_paid_cents: channel.totalPaidCents ?? 0,
      notes: JSON.stringify(channel.notes ?? []),
      performance: JSON.stringify(channel.performance ?? {}),
      metadata: JSON.stringify(channel.metadata ?? {})
    };
    const [id] = await connection(TABLE).insert(payload);
    return this.findByIdForUser(channel.userId, id, connection);
  }

  static async updateById(id, updates, connection = db) {
    if (!id) return null;
    const payload = {};
    if (updates.platform !== undefined) payload.platform = updates.platform;
    if (updates.handle !== undefined) payload.handle = updates.handle ?? null;
    if (updates.referralCode !== undefined) payload.referral_code = updates.referralCode;
    if (updates.trackingUrl !== undefined) payload.tracking_url = updates.trackingUrl ?? null;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.commissionRateBps !== undefined) payload.commission_rate_bps = updates.commissionRateBps;
    if (updates.totalEarningsCents !== undefined) payload.total_earnings_cents = updates.totalEarningsCents;
    if (updates.totalPaidCents !== undefined) payload.total_paid_cents = updates.totalPaidCents;
    if (updates.notes !== undefined) payload.notes = JSON.stringify(updates.notes ?? []);
    if (updates.performance !== undefined) payload.performance = JSON.stringify(updates.performance ?? {});
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});
    if (Object.keys(payload).length) {
      await connection(TABLE).where({ id }).update(payload);
    }
    if (updates.userId) {
      return this.findByIdForUser(updates.userId, id, connection);
    }
    const row = await connection(TABLE).select('*').where({ id }).first();
    return deserialize(row);
  }

  static async deleteByIdForUser(userId, id, connection = db) {
    if (!userId || !id) return 0;
    return connection(TABLE).where({ id, user_id: userId }).del();
  }
}
