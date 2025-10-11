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
    affiliateId: record.affiliate_id,
    amountCents: Number(record.amount_cents),
    status: record.status,
    payoutReference: record.payout_reference,
    scheduledAt: record.scheduled_at,
    processedAt: record.processed_at,
    failureReason: record.failure_reason,
    metadata: parseJson(record.metadata, {}),
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export default class CommunityAffiliatePayoutModel {
  static async create(payout, connection = db) {
    const payload = {
      affiliate_id: payout.affiliateId,
      amount_cents: payout.amountCents,
      status: payout.status ?? 'pending',
      payout_reference: payout.payoutReference ?? null,
      scheduled_at: payout.scheduledAt ?? null,
      processed_at: payout.processedAt ?? null,
      failure_reason: payout.failureReason ?? null,
      metadata: JSON.stringify(payout.metadata ?? {})
    };
    const [id] = await connection('community_affiliate_payouts').insert(payload);
    return this.findById(id, connection);
  }

  static async updateStatus(id, updates, connection = db) {
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.processedAt !== undefined) payload.processed_at = updates.processedAt;
    if (updates.failureReason !== undefined) payload.failure_reason = updates.failureReason ?? null;
    if (updates.payoutReference !== undefined) payload.payout_reference = updates.payoutReference ?? null;
    if (updates.metadata !== undefined) payload.metadata = JSON.stringify(updates.metadata ?? {});

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection('community_affiliate_payouts')
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const record = await connection('community_affiliate_payouts').where({ id }).first();
    return mapRecord(record);
  }

  static async listByAffiliate(affiliateId, connection = db) {
    const rows = await connection('community_affiliate_payouts')
      .where({ affiliate_id: affiliateId })
      .orderBy('created_at', 'desc');
    return rows.map((row) => mapRecord(row));
  }
}
