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

function mapRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    communityId: row.community_id,
    eventId: row.event_id,
    paymentIntentId: row.payment_intent_id,
    userId: row.user_id,
    affiliateId: row.affiliate_id,
    amountCents: Number(row.amount_cents ?? 0),
    currency: row.currency,
    status: row.status,
    referralCode: row.referral_code ?? null,
    donorName: row.donor_name ?? null,
    message: row.message ?? null,
    metadata: parseJson(row.metadata, {}),
    capturedAt: row.captured_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class CommunityDonationModel {
  static table(connection = db) {
    return connection('community_donations');
  }

  static async create(donation, connection = db) {
    const payload = {
      community_id: donation.communityId,
      event_id: donation.eventId ?? null,
      payment_intent_id: donation.paymentIntentId,
      user_id: donation.userId ?? null,
      affiliate_id: donation.affiliateId ?? null,
      amount_cents: donation.amountCents,
      currency: donation.currency,
      status: donation.status ?? 'pending',
      referral_code: donation.referralCode ?? null,
      donor_name: donation.donorName ?? null,
      message: donation.message ?? null,
      metadata: JSON.stringify(donation.metadata ?? {}),
      captured_at: donation.capturedAt ?? null
    };

    const [id] = await this.table(connection).insert(payload);
    const row = await this.table(connection).where({ id }).first();
    return mapRow(row);
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.status) payload.status = updates.status;
    if (updates.affiliateId !== undefined) payload.affiliate_id = updates.affiliateId;
    if (updates.amountCents !== undefined) payload.amount_cents = updates.amountCents;
    if (updates.currency) payload.currency = updates.currency;
    if (updates.referralCode !== undefined) payload.referral_code = updates.referralCode;
    if (updates.donorName !== undefined) payload.donor_name = updates.donorName;
    if (updates.message !== undefined) payload.message = updates.message;
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});
    if (updates.capturedAt !== undefined) payload.captured_at = updates.capturedAt;

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await this.table(connection).where({ id }).update({ ...payload, updated_at: connection.fn.now() });
    const row = await this.table(connection).where({ id }).first();
    return mapRow(row);
  }

  static async findById(id, connection = db) {
    const row = await this.table(connection).where({ id }).first();
    return mapRow(row);
  }

  static async findByPaymentIntent(paymentIntentId, connection = db) {
    const row = await this.table(connection).where({ payment_intent_id: paymentIntentId }).first();
    return mapRow(row);
  }

  static async listByCommunity(communityId, { status, limit = 50, offset = 0 } = {}, connection = db) {
    const query = this.table(connection)
      .where({ community_id: communityId })
      .orderBy('created_at', 'desc')
      .limit(Math.min(limit, 200))
      .offset(Math.max(offset, 0));

    if (status) {
      query.andWhere({ status });
    }

    const rows = await query;
    return rows.map((row) => mapRow(row));
  }
}
