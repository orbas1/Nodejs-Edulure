import db from '../config/database.js';

const TABLE = 'payment_coupons';
const REDEMPTIONS_TABLE = 'payment_coupon_redemptions';

const BASE_COLUMNS = [
  'id',
  'code',
  'name',
  'description',
  'discount_type as discountType',
  'discount_value as discountValue',
  'currency',
  'max_redemptions as maxRedemptions',
  'per_user_limit as perUserLimit',
  'times_redeemed as timesRedeemed',
  'is_stackable as isStackable',
  'status',
  'valid_from as validFrom',
  'valid_until as validUntil',
  'metadata',
  'created_at as createdAt',
  'updated_at as updatedAt',
  'archived_at as archivedAt'
];

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

function normaliseCoupon(row) {
  return {
    ...row,
    code: row.code.toUpperCase(),
    discountValue: Number(row.discountValue),
    maxRedemptions: row.maxRedemptions === null ? null : Number(row.maxRedemptions),
    perUserLimit: row.perUserLimit === null ? null : Number(row.perUserLimit),
    timesRedeemed: Number(row.timesRedeemed ?? 0),
    metadata: parseJson(row.metadata)
  };
}

export default class PaymentCouponModel {
  static async findByCode(code, connection = db) {
    if (!code) {
      return null;
    }

    const record = await connection(TABLE)
      .select(BASE_COLUMNS)
      .whereRaw('UPPER(code) = ?', [code.toUpperCase()])
      .first();

    return record ? normaliseCoupon(record) : null;
  }

  static async findById(id, connection = db, { lock = false } = {}) {
    if (!id) {
      return null;
    }

    const query = connection(TABLE).select(BASE_COLUMNS).where({ id });
    if (lock) {
      const isTransaction =
        typeof connection.isTransaction === 'function'
          ? connection.isTransaction()
          : connection?.isTransaction;
      if (isTransaction) {
        query.forUpdate();
      }
    }

    const record = await query.first();
    return record ? normaliseCoupon(record) : null;
  }

  static async findActiveForRedemption(code, currency, connection = db, now = new Date(), { lock = true } = {}) {
    if (!code) {
      return null;
    }

    const query = connection(TABLE)
      .select(BASE_COLUMNS)
      .whereRaw('UPPER(code) = ?', [code.toUpperCase()])
      .where({ status: 'active' })
      .andWhere((builder) => {
        builder.whereNull('valid_from').orWhere('valid_from', '<=', now);
      })
      .andWhere((builder) => {
        builder.whereNull('valid_until').orWhere('valid_until', '>=', now);
      });

    if (lock) {
      const isTransaction =
        typeof connection.isTransaction === 'function'
          ? connection.isTransaction()
          : connection?.isTransaction;
      if (isTransaction) {
        query.forUpdate();
      }
    }

    const record = await query.first();

    if (!record) {
      return null;
    }

    const coupon = normaliseCoupon(record);
    if (coupon.discountType === 'fixed_amount' && coupon.currency && currency) {
      if (coupon.currency.toUpperCase() !== currency.toUpperCase()) {
        return null;
      }
    }

    if (coupon.maxRedemptions && coupon.timesRedeemed >= coupon.maxRedemptions) {
      return null;
    }

    return coupon;
  }

  static async countUserRedemptions(couponId, userId, connection = db) {
    if (!userId) {
      return 0;
    }

    const result = await connection(REDEMPTIONS_TABLE)
      .where({ coupon_id: couponId, user_id: userId })
      .count({ total: '*' })
      .first();
    return Number(result?.total ?? 0);
  }

  static async incrementTimesRedeemed(id, connection = db) {
    await connection(TABLE)
      .where({ id })
      .increment({ times_redeemed: 1 })
      .update({ updated_at: connection.fn.now() });
  }

  static async recordRedemption({ couponId, paymentIntentId, userId }, connection = db) {
    await connection(REDEMPTIONS_TABLE).insert({
      coupon_id: couponId,
      payment_intent_id: paymentIntentId,
      user_id: userId ?? null
    });
    await this.incrementTimesRedeemed(couponId, connection);
  }
}
