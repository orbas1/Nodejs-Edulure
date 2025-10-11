import { randomUUID } from 'node:crypto';

import db from '../config/database.js';

const TABLE = 'payment_intents';

const BASE_COLUMNS = [
  'id',
  'public_id as publicId',
  'user_id as userId',
  'provider',
  'provider_intent_id as providerIntentId',
  'provider_capture_id as providerCaptureId',
  'provider_latest_charge_id as providerLatestChargeId',
  'status',
  'currency',
  'amount_subtotal as amountSubtotal',
  'amount_discount as amountDiscount',
  'amount_tax as amountTax',
  'amount_total as amountTotal',
  'amount_refunded as amountRefunded',
  'tax_breakdown as taxBreakdown',
  'metadata',
  'coupon_id as couponId',
  'entity_type as entityType',
  'entity_id as entityId',
  'receipt_email as receiptEmail',
  'captured_at as capturedAt',
  'canceled_at as canceledAt',
  'expires_at as expiresAt',
  'failure_code as failureCode',
  'failure_message as failureMessage',
  'created_at as createdAt',
  'updated_at as updatedAt'
];

function toDbPayload(intent) {
  return {
    public_id: intent.publicId ?? randomUUID(),
    user_id: intent.userId ?? null,
    provider: intent.provider,
    provider_intent_id: intent.providerIntentId,
    provider_capture_id: intent.providerCaptureId ?? null,
    provider_latest_charge_id: intent.providerLatestChargeId ?? null,
    status: intent.status ?? 'requires_payment_method',
    currency: intent.currency,
    amount_subtotal: intent.amountSubtotal,
    amount_discount: intent.amountDiscount ?? 0,
    amount_tax: intent.amountTax ?? 0,
    amount_total: intent.amountTotal,
    amount_refunded: intent.amountRefunded ?? 0,
    tax_breakdown: JSON.stringify(intent.taxBreakdown ?? {}),
    metadata: JSON.stringify(intent.metadata ?? {}),
    coupon_id: intent.couponId ?? null,
    entity_type: intent.entityType,
    entity_id: intent.entityId,
    receipt_email: intent.receiptEmail ?? null,
    captured_at: intent.capturedAt ?? null,
    canceled_at: intent.canceledAt ?? null,
    expires_at: intent.expiresAt ?? null,
    failure_code: intent.failureCode ?? null,
    failure_message: intent.failureMessage ?? null
  };
}

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

function parseJson(value) {
  if (!value) {
    return {};
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return {};
  }
}

export default class PaymentIntentModel {
  static async create(intent, connection = db) {
    const payload = toDbPayload(intent);
    const [id] = await connection(TABLE).insert(payload);
    return this.findById(id, connection);
  }

  static async findById(id, connection = db) {
    const record = await connection(TABLE).select(BASE_COLUMNS).where({ id }).first();
    return record ? this.deserialize(record) : null;
  }

  static async findByPublicId(publicId, connection = db) {
    const record = await connection(TABLE).select(BASE_COLUMNS).where({ public_id: publicId }).first();
    return record ? this.deserialize(record) : null;
  }

  static async findByProviderIntentId(providerIntentId, connection = db) {
    const record = await connection(TABLE)
      .select(BASE_COLUMNS)
      .where({ provider_intent_id: providerIntentId })
      .first();
    return record ? this.deserialize(record) : null;
  }

  static async lockByPublicId(publicId, connection = db) {
    const record = await connection(TABLE).where({ public_id: publicId }).forUpdate().first();
    return record ? this.deserialize(record) : null;
  }

  static async updateById(id, updates, connection = db) {
    const payload = {};
    if (updates.providerCaptureId !== undefined) payload.provider_capture_id = updates.providerCaptureId;
    if (updates.providerLatestChargeId !== undefined)
      payload.provider_latest_charge_id = updates.providerLatestChargeId;
    if (updates.status) payload.status = updates.status;
    if (updates.currency) payload.currency = updates.currency;
    if (updates.amountSubtotal !== undefined) payload.amount_subtotal = updates.amountSubtotal;
    if (updates.amountDiscount !== undefined) payload.amount_discount = updates.amountDiscount;
    if (updates.amountTax !== undefined) payload.amount_tax = updates.amountTax;
    if (updates.amountTotal !== undefined) payload.amount_total = updates.amountTotal;
    if (updates.amountRefunded !== undefined) payload.amount_refunded = updates.amountRefunded;
    if (updates.taxBreakdown) payload.tax_breakdown = JSON.stringify(updates.taxBreakdown);
    if (updates.metadata) payload.metadata = JSON.stringify(updates.metadata);
    if (updates.couponId !== undefined) payload.coupon_id = updates.couponId;
    if (updates.entityType) payload.entity_type = updates.entityType;
    if (updates.entityId) payload.entity_id = updates.entityId;
    if (updates.receiptEmail !== undefined) payload.receipt_email = updates.receiptEmail;
    if (updates.capturedAt !== undefined) payload.captured_at = updates.capturedAt;
    if (updates.canceledAt !== undefined) payload.canceled_at = updates.canceledAt;
    if (updates.expiresAt !== undefined) payload.expires_at = updates.expiresAt;
    if (updates.failureCode !== undefined) payload.failure_code = updates.failureCode;
    if (updates.failureMessage !== undefined) payload.failure_message = updates.failureMessage;

    if (Object.keys(payload).length === 0) {
      return this.findById(id, connection);
    }

    await connection(TABLE)
      .where({ id })
      .update({ ...payload, updated_at: connection.fn.now() });

    return this.findById(id, connection);
  }

  static async updateByPublicId(publicId, updates, connection = db) {
    const intent = await connection(TABLE).select(['id']).where({ public_id: publicId }).first();
    if (!intent) {
      return null;
    }
    await this.updateById(intent.id, updates, connection);
    return this.findById(intent.id, connection);
  }

  static async incrementRefundAmount(id, amount, connection = db) {
    await connection(TABLE)
      .where({ id })
      .increment('amount_refunded', amount)
      .update({ updated_at: connection.fn.now() });
  }

  static deserialize(record) {
    return {
      ...record,
      amountSubtotal: coerceAmount(record.amountSubtotal),
      amountDiscount: coerceAmount(record.amountDiscount),
      amountTax: coerceAmount(record.amountTax),
      amountTotal: coerceAmount(record.amountTotal),
      amountRefunded: coerceAmount(record.amountRefunded),
      taxBreakdown: parseJson(record.taxBreakdown),
      metadata: parseJson(record.metadata)
    };
  }
}
