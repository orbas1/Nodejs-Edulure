const ISO_4217_REGEX = /^[A-Z]{3}$/;

function toSanitisedString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function resolveOptions(options) {
  if (typeof options === 'string') {
    return { fallback: options };
  }
  if (options && typeof options === 'object') {
    return options;
  }
  return {};
}

export function normaliseCurrencyCode(value, options = {}) {
  const { fallback = 'USD' } = resolveOptions(options);
  const candidate = toSanitisedString(value).toUpperCase();
  if (candidate && ISO_4217_REGEX.test(candidate)) {
    return candidate;
  }
  const fallbackCandidate = toSanitisedString(fallback).toUpperCase();
  if (fallbackCandidate && ISO_4217_REGEX.test(fallbackCandidate)) {
    return fallbackCandidate;
  }
  throw new Error('currency must be a 3-letter ISO code');
}

export function normalizeCurrencyCode(value, options = {}) {
  return normaliseCurrencyCode(value, options);
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

export function centsToCurrencyString(amountCents, { minimumFractionDigits = 2, maximumFractionDigits = 2 } = {}) {
  const cents = Number(amountCents ?? 0);
  if (!Number.isFinite(cents)) {
    return '0.00';
  }

  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(Math.round(cents));
  const minDigits = Math.max(0, Number(minimumFractionDigits ?? 2));
  const maxDigits = Math.max(minDigits, Math.min(Number(maximumFractionDigits ?? minDigits), 6));
  const value = (absolute / 100).toFixed(maxDigits);

  return `${sign}${value}`;
}

export function currencyStringToCents(value, { allowNegative = false, fieldName = 'amount' } = {}) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 100);
  }

  const raw = String(value).trim();
  if (!raw) {
    return 0;
  }

  const normalised = raw.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
  const match = normalised.match(/^(-)?(\d*)(?:\.(\d{0,}))?$/);
  if (!match) {
    throw new Error(`${fieldName} must be a valid currency amount`);
  }

  const [, negative, wholePart = '0', fractional = ''] = match;
  const sign = negative ? -1 : 1;
  if (sign === -1 && !allowNegative) {
    throw new Error(`${fieldName} cannot be negative`);
  }

  const paddedFractional = `${fractional}00`.slice(0, 2);
  const cents = Number(wholePart) * 100 + Number(paddedFractional);
  return sign * cents;
}
