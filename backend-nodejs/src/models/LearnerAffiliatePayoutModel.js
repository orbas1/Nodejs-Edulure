import db from '../config/database.js';

const TABLE = 'learner_affiliate_payouts';

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
}

function deserialize(row) {
  if (!row) return null;
  return {
    id: row.id,
    channelId: row.channel_id,
    amountCents: Number(row.amount_cents ?? 0),
    currency: row.currency ?? 'USD',
    status: row.status,
    scheduledAt: row.scheduled_at,
    processedAt: row.processed_at,
    reference: row.reference ?? null,
    note: row.note ?? null,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class LearnerAffiliatePayoutModel {
  static deserialize(row) {
    return deserialize(row);
  }

  static async listByChannelIds(channelIds, connection = db) {
    if (!Array.isArray(channelIds) || channelIds.length === 0) return [];
    const rows = await connection(TABLE)
      .select([
        'id',
        'channel_id',
        'amount_cents',
        'currency',
        'status',
        'scheduled_at',
        'processed_at',
        'reference',
        'note',
        'metadata',
        'created_at',
        'updated_at'
      ])
      .whereIn('channel_id', channelIds)
      .orderBy('scheduled_at', 'desc')
      .orderBy('created_at', 'desc');
    return rows.map(deserialize);
  }

  static async create(payout, connection = db) {
    const payload = {
      channel_id: payout.channelId,
      amount_cents: payout.amountCents,
      currency: payout.currency ?? 'USD',
      status: payout.status ?? 'scheduled',
      scheduled_at: payout.scheduledAt ?? null,
      processed_at: payout.processedAt ?? null,
      reference: payout.reference ?? null,
      note: payout.note ?? null,
      metadata: JSON.stringify(payout.metadata ?? {})
    };
    const [id] = await connection(TABLE).insert(payload);
    const row = await connection(TABLE).select('*').where({ id }).first();
    return deserialize(row);
  }
}
