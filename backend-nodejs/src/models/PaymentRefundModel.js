import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'payment_refunds';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'payment_intent_id as paymentIntentId',
  'provider_refund_id as providerRefundId',
  'status',
  'amount',
  'currency',
  'reason',
  'requested_by as requestedBy',
  'processed_at as processedAt',
  'failure_code as failureCode',
  'failure_message as failureMessage',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function coerceAmount(value) {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default class PaymentRefundModel {
  static async create(refund, connection = db) {
    const payload = {
      public_id: refund.publicId ?? randomUUID(),
      payment_intent_id: refund.paymentIntentId,
      provider_refund_id: refund.providerRefundId,
      status: refund.status ?? 'pending',
      amount: refund.amount,
      currency: refund.currency,
      reason: refund.reason ?? null,
      requested_by: refund.requestedBy ?? null,
      processed_at: refund.processedAt ?? null,
      failure_code: refund.failureCode ?? null,
      failure_message: refund.failureMessage ?? null
    };
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const record = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return record ? this.deserialize(record) : null;
  }

  static async findByPublicId(publicId, connection = db) {
    const record = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ public_id: publicId })
      .first();
    return record ? this.deserialize(record) : null;
  }

  static async findByProviderRefundId(providerRefundId, connection = db) {
    const record = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ provider_refund_id: providerRefundId })
      .first();
    return record ? this.deserialize(record) : null;
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.status) payload.status = updates.status;
    if (updates.processedAt !== undefined) payload.processed_at = updates.processedAt;
    if (updates.failureCode !== undefined) payload.failure_code = updates.failureCode;
    if (updates.failureMessage !== undefined) payload.failure_message = updates.failureMessage;
    if (updates.amount !== undefined) payload.amount = updates.amount;

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static deserialize(record) {
    return {
      ...record,
      amount: coerceAmount(record.amount)
    };
  }
}
