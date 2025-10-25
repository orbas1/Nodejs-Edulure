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

export function normalizeCurrencyCode(value, fallback = 'USD') {
  return normaliseCurrencyCode(value, { fallback });
}

export function currencyStringToCents(value, { fieldName = 'amount' } = {}) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`${fieldName} must be a finite number`);
    }
    return Math.round(value * 100);
  }

  const trimmed = toSanitisedString(value);
  if (!trimmed) {
    return 0;
  }

  const normalised = trimmed.replace(/[,$\s]/g, '');
  const amount = Number.parseFloat(normalised);
  if (!Number.isFinite(amount)) {
    throw new Error(`${fieldName} must be a valid currency amount`);
  }

  return Math.round(amount * 100);
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

export function centsToCurrencyString(amountCents, { currency = 'USD', minimumFractionDigits = 2, maximumFractionDigits = 2 } = {}) {
  const cents = Number(amountCents ?? 0);
  if (!Number.isFinite(cents)) {
    throw new Error('amountCents must be a finite number');
  }

  const unitAmount = cents / 100;
  const resolvedCurrency = normaliseCurrencyCode(currency, { fallback: 'USD' });

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: resolvedCurrency,
    minimumFractionDigits,
    maximumFractionDigits
  }).format(unitAmount);
}
