const COUPON_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,23}$/;

export function normaliseCouponCode(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.toUpperCase();
}

export function isCouponCodeValid(value) {
  const normalised = normaliseCouponCode(value);
  if (!normalised) {
    return false;
  }
  return COUPON_PATTERN.test(normalised);
}

export function normaliseReceiptEmail(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
}

export function computeCouponDiscount({
  subtotalCents,
  coupon,
  currency
}) {
  if (!coupon || !subtotalCents || subtotalCents <= 0) {
    return 0;
  }
  const safeCurrency = typeof currency === 'string' ? currency.toUpperCase() : null;
  if (coupon.discountType === 'percentage') {
    const basisPoints = Math.min(Math.max(Number(coupon.discountValue) || 0, 0), 10_000);
    return Math.min(Math.floor((subtotalCents * basisPoints) / 10_000), subtotalCents);
  }
  if (coupon.discountType === 'fixed_amount') {
    if (coupon.currency && safeCurrency && coupon.currency.toUpperCase() !== safeCurrency) {
      return 0;
    }
    const rawValue = Math.max(Number(coupon.discountValue) || 0, 0);
    return Math.min(rawValue, subtotalCents);
  }
  return 0;
}

export function computeCheckoutSummary({
  unitAmountCents,
  quantity = 1,
  coupon,
  currency = 'USD'
}) {
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
  const unitAmount = Math.max(Number(unitAmountCents) || 0, 0);
  const subtotal = unitAmount * safeQuantity;
  const discount = computeCouponDiscount({ subtotalCents: subtotal, coupon, currency });
  const total = Math.max(subtotal - discount, 0);
  return {
    currency,
    unitAmount,
    quantity: safeQuantity,
    subtotal,
    discount,
    total
  };
}

export default {
  normaliseCouponCode,
  isCouponCodeValid,
  normaliseReceiptEmail,
  computeCouponDiscount,
  computeCheckoutSummary
};
