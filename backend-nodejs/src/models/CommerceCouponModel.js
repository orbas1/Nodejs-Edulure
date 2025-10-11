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
    code: row.code,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    currency: row.currency,
    maxRedemptions: row.max_redemptions,
    redemptionCount: row.redemption_count,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    stackable: Boolean(row.stackable),
    status: row.status,
    metadata: parseJson(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export default class CommerceCouponModel {
  static async findActiveByCode(code, connection = db) {
    const now = connection.fn.now();
    const query = connection('commerce_coupons')
      .whereRaw('LOWER(code) = LOWER(?)', [code])
      .andWhere({ status: 'active' })
      .andWhere('valid_from', '<=', now)
      .andWhere((builder) => {
        builder.whereNull('valid_until').orWhere('valid_until', '>=', now);
      })
      .first();

    const row = await query;
    return toDomain(row);
  }

  static async incrementRedemption(id, connection = db) {
    return connection('commerce_coupons')
      .where({ id })
      .increment('redemption_count', 1)
      .update({ updated_at: connection.fn.now() });
  }

  static async cancelRedemption(id, connection = db) {
    return connection('commerce_coupons')
      .where({ id })
      .andWhere('redemption_count', '>', 0)
      .decrement('redemption_count', 1)
      .update({ updated_at: connection.fn.now() });
  }
}
