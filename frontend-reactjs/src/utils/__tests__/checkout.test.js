import { describe, expect, it } from 'vitest';

import {
  normaliseCouponCode,
  isCouponCodeValid,
  normaliseReceiptEmail,
  computeCheckoutSummary,
  computeCouponDiscount
} from '../checkout.js';

describe('checkout utils', () => {
  it('normalises coupon codes to uppercase trimmed strings', () => {
    expect(normaliseCouponCode(' spring-25 ')).toBe('SPRING-25');
    expect(normaliseCouponCode('')).toBe('');
    expect(normaliseCouponCode(null)).toBe('');
  });

  it('validates coupon codes using the shared pattern', () => {
    expect(isCouponCodeValid('SPRING-25')).toBe(true);
    expect(isCouponCodeValid('bad code')).toBe(false);
    expect(isCouponCodeValid('')).toBe(false);
  });

  it('normalises receipt emails to trimmed lowercase values', () => {
    expect(normaliseReceiptEmail('  Finance@Example.com ')).toBe('finance@example.com');
  });

  it('computes checkout summary totals with percentage coupons', () => {
    const summary = computeCheckoutSummary({
      unitAmountCents: 10_000,
      quantity: 3,
      coupon: { discountType: 'percentage', discountValue: 2500 },
      currency: 'USD'
    });
    expect(summary.subtotal).toBe(30_000);
    expect(summary.discount).toBe(7_500);
    expect(summary.total).toBe(22_500);
  });

  it('computes coupon discount for fixed amount and clamps to subtotal', () => {
    expect(
      computeCouponDiscount({
        subtotalCents: 5_000,
        coupon: { discountType: 'fixed_amount', discountValue: 7_000, currency: 'USD' },
        currency: 'USD'
      })
    ).toBe(5_000);
  });
});
