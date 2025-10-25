const ISO_4217_REGEX = /^[A-Z]{3}$/;

function toSanitisedString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

export function normaliseCurrencyCode(value, { fallback = 'USD' } = {}) {
  const candidate = toSanitisedString(value).toUpperCase();
  if (candidate && ISO_4217_REGEX.test(candidate)) {
    return candidate;
  }
  const fallbackCandidate = toSanitisedString(fallback).toUpperCase();
  if (ISO_4217_REGEX.test(fallbackCandidate)) {
    return fallbackCandidate;
  }
  throw new Error('currency must be a 3-letter ISO code');
}

export function toMinorUnit(value, { allowNegative = false, fieldName = 'amount' } = {}) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`${fieldName} must be a finite number`);
  }

  const rounded = Math.round(numeric);
  if (!allowNegative && rounded < 0) {
    throw new Error(`${fieldName} cannot be negative`);
  }
  return rounded;
}

export function snapCurrencyPayload(payload = {}, options = {}) {
  const { allowNegative = false, fallbackCurrency = 'USD' } = options;
  const amountCents = toMinorUnit(payload.amountCents ?? payload.amount ?? 0, {
    allowNegative,
    fieldName: options.fieldName ?? 'amountCents'
  });
  const currency = normaliseCurrencyCode(payload.currency, { fallback: fallbackCurrency });
  return { amountCents, currency };
}

export function currencyStringToCents(value, { allowNegative = false } = {}) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const cents = Math.round(value * 100);
    if (!allowNegative && cents < 0) {
      throw new Error('amountCents cannot be negative');
    }
    return cents;
  }

  const sanitized = toSanitisedString(value);
  if (!sanitized) {
    return 0;
  }

  const cleaned = sanitized.replace(/[^0-9,.-]/g, '').replace(/,/g, '');
  if (!cleaned) {
    return 0;
  }

  const numeric = Number.parseFloat(cleaned);
  if (!Number.isFinite(numeric)) {
    throw new Error('amountCents must be numeric');
  }

  const cents = Math.round(numeric * 100);
  if (!allowNegative && cents < 0) {
    throw new Error('amountCents cannot be negative');
  }
  return cents;
}

export function centsToCurrencyString(amountCents, { currency = 'USD', locale = 'en-US' } = {}) {
  const amount = Number(amountCents ?? 0) / 100;
  if (!Number.isFinite(amount)) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(0);
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return formatter.format(amount);
}

export const normalizeCurrencyCode = normaliseCurrencyCode;
