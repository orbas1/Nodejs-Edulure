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
    orderId: row.order_id,
    transactionType: row.transaction_type,
    status: row.status,
    paymentProvider: row.payment_provider,
    providerTransactionId: row.provider_transaction_id,
    amount: Number(row.amount),
    currency: row.currency,
    paymentMethodType: row.payment_method_type,
    responseSnapshot: parseJson(row.response_snapshot),
    processedAt: row.processed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class PaymentTransactionModel {
  static async create(data, connection = db) {
    const [id] = await connection('payment_transactions').insert({
      order_id: data.orderId,
      transaction_type: data.transactionType ?? 'authorization',
      status: data.status ?? 'pending',
      payment_provider: data.paymentProvider,
      provider_transaction_id: data.providerTransactionId ?? null,
      amount: data.amount,
      currency: data.currency,
      payment_method_type: data.paymentMethodType ?? null,
      response_snapshot: JSON.stringify(data.responseSnapshot ?? {}),
      processed_at: data.processedAt ?? null
    });
    return id;
  }

  static async updateById(id, updates, connection = db) {
    const payload = { ...updates };
    if (payload.response_snapshot) {
      payload.response_snapshot = JSON.stringify(payload.response_snapshot);
    }
    return connection('payment_transactions').where({ id }).update(payload);
  }

  static async findLatestForOrder(orderId, connection = db) {
    const row = await connection('payment_transactions')
      .where({ order_id: orderId })
      .orderBy('id', 'desc')
      .first();
    return toDomain(row);
  }

  static async findByProviderReference(providerTransactionId, connection = db) {
    const row = await connection('payment_transactions')
      .where({ provider_transaction_id: providerTransactionId })
      .first();
    return toDomain(row);
  }
}
