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

function toOrderDomain(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    orderNumber: row.order_number,
    currency: row.currency,
    subtotalAmount: Number(row.subtotal_amount),
    discountAmount: Number(row.discount_amount),
    taxAmount: Number(row.tax_amount),
    totalAmount: Number(row.total_amount),
    status: row.status,
    paymentProvider: row.payment_provider,
    providerIntentId: row.provider_intent_id,
    providerClientSecret: row.provider_client_secret,
    metadata: parseJson(row.metadata),
    billingEmail: row.billing_email,
    billingCountry: row.billing_country,
    billingRegion: row.billing_region,
    appliedCouponId: row.applied_coupon_id,
    appliedTaxRateId: row.applied_tax_rate_id,
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toItemDomain(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    itemType: row.item_type,
    itemId: row.item_id,
    name: row.name,
    quantity: row.quantity,
    unitAmount: Number(row.unit_amount),
    totalAmount: Number(row.total_amount),
    taxAmount: Number(row.tax_amount),
    discountAmount: Number(row.discount_amount),
    metadata: parseJson(row.metadata),
    createdAt: row.created_at
  };
}

export default class PaymentOrderModel {
  static async create(data, connection = db) {
    const [id] = await connection('payment_orders').insert({
      user_id: data.userId ?? null,
      order_number: data.orderNumber,
      currency: data.currency,
      subtotal_amount: data.subtotalAmount,
      discount_amount: data.discountAmount,
      tax_amount: data.taxAmount,
      total_amount: data.totalAmount,
      status: data.status,
      payment_provider: data.paymentProvider,
      provider_intent_id: data.providerIntentId ?? null,
      provider_client_secret: data.providerClientSecret ?? null,
      metadata: JSON.stringify(data.metadata ?? {}),
      billing_email: data.billingEmail ?? null,
      billing_country: data.billingCountry ?? null,
      billing_region: data.billingRegion ?? null,
      applied_coupon_id: data.appliedCouponId ?? null,
      applied_tax_rate_id: data.appliedTaxRateId ?? null,
      expires_at: data.expiresAt ?? null,
      paid_at: data.paidAt ?? null,
      cancelled_at: data.cancelledAt ?? null
    });
    return id;
  }

  static async updateById(id, updates, connection = db) {
    const payload = { ...updates };
    if (payload.metadata) {
      payload.metadata = JSON.stringify(payload.metadata);
    }
    return connection('payment_orders').where({ id }).update(payload);
  }

  static async findById(id, connection = db) {
    const row = await connection('payment_orders').where({ id }).first();
    if (!row) return null;
    const items = await connection('payment_order_items').where({ order_id: id }).orderBy('id');
    return { ...toOrderDomain(row), items: items.map(toItemDomain) };
  }

  static async findByOrderNumber(orderNumber, connection = db) {
    const row = await connection('payment_orders').where({ order_number: orderNumber }).first();
    if (!row) return null;
    const items = await connection('payment_order_items').where({ order_id: row.id }).orderBy('id');
    return { ...toOrderDomain(row), items: items.map(toItemDomain) };
  }

  static async findByProviderIntentId(providerIntentId, connection = db) {
    const row = await connection('payment_orders').where({ provider_intent_id: providerIntentId }).first();
    if (!row) return null;
    const items = await connection('payment_order_items').where({ order_id: row.id }).orderBy('id');
    return { ...toOrderDomain(row), items: items.map(toItemDomain) };
  }

  static async attachItems(orderId, items, connection = db) {
    if (!items?.length) return [];
    const payload = items.map((item) => ({
      order_id: orderId,
      item_type: item.itemType,
      item_id: item.itemId ?? null,
      name: item.name,
      quantity: item.quantity,
      unit_amount: item.unitAmount,
      total_amount: item.totalAmount,
      tax_amount: item.taxAmount,
      discount_amount: item.discountAmount,
      metadata: JSON.stringify(item.metadata ?? {})
    }));
    return connection('payment_order_items').insert(payload);
  }

  static async listPendingOrders(connection = db) {
    const rows = await connection('payment_orders')
      .whereIn('status', ['awaiting_payment', 'requires_action'])
      .orderBy('created_at', 'asc');
    return rows.map(toOrderDomain);
  }
}
