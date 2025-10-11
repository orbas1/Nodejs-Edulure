import db from '../config/database.js';

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function toDomain(row) {
  if (!row) return null;
  return {
    id: row.id,
    transactionId: row.transaction_id,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    reason: row.reason,
    providerRefundId: row.provider_refund_id,
    metadata: parseJson(row.metadata),
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    processedAt: row.processed_at
  };
}

export default class PaymentRefundModel {
  static async create(data, connection = db) {
    const [id] = await connection('payment_refunds').insert({
      transaction_id: data.transactionId,
      amount: data.amount,
      currency: data.currency,
      status: data.status ?? 'pending',
      reason: data.reason ?? null,
      provider_refund_id: data.providerRefundId ?? null,
      metadata: JSON.stringify(data.metadata ?? {}),
      requested_by: data.requestedBy ?? null,
      processed_at: data.processedAt ?? null
    });
    return id;
  }

  static async updateById(id, updates, connection = db) {
    const payload = { ...updates };
    if (payload.metadata) {
      payload.metadata = JSON.stringify(payload.metadata);
    }
    return connection('payment_refunds').where({ id }).update(payload);
  }

  static async findByProviderReference(providerRefundId, connection = db) {
    const row = await connection('payment_refunds')
      .where({ provider_refund_id: providerRefundId })
      .first();
    return toDomain(row);
  }
}
