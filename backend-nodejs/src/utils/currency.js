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

export function normalizeCurrencyCode(value, options) {
  return normaliseCurrencyCode(value, options);
}

export function centsToCurrencyString(value, { fractionDigits = 2, useGrouping = true } = {}) {
  const cents = Number(value ?? 0);
  if (!Number.isFinite(cents)) {
    throw new Error('amount must be a finite number');
  }

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping
  });

  return formatter.format(cents / 100);
}

export function currencyStringToCents(value, { allowNegative = true, fieldName = 'amount' } = {}) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`${fieldName} must be a finite number`);
    }
    const cents = Math.round(value * 100);
    if (!allowNegative && cents < 0) {
      throw new Error(`${fieldName} cannot be negative`);
    }
    return cents;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string or number`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  const normalised = trimmed.replace(/^[($\s]+|[)\s]+$/g, '');
  const negative = /-/.test(trimmed) || /^\(.*\)$/.test(trimmed);
  const cleaned = normalised.replace(/[^0-9.,]/g, '');
  if (!cleaned) {
    throw new Error(`${fieldName} must contain digits`);
  }

  const decimalSeparator = cleaned.includes('.')
    ? '.'
    : cleaned.includes(',')
      ? ','
      : null;

  let integerPart = cleaned;
  let fractionPart = '';

  if (decimalSeparator) {
    const parts = cleaned.split(decimalSeparator);
    integerPart = parts[0];
    fractionPart = parts.slice(1).join('').slice(0, 2);
  }

  const integerDigits = integerPart.replace(/[^0-9]/g, '');
  if (!integerDigits) {
    throw new Error(`${fieldName} must contain digits`);
  }

  const centsString = `${integerDigits}${fractionPart.padEnd(2, '0')}`;
  let cents = Number.parseInt(centsString, 10);
  if (!Number.isFinite(cents)) {
    throw new Error(`${fieldName} must be a valid currency amount`);
  }

  if (negative) {
    cents *= -1;
  }

  if (!allowNegative && cents < 0) {
    throw new Error(`${fieldName} cannot be negative`);
  }

  return cents;
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
