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

export function normalizeCurrencyCode(value, fallbackOrOptions) {
  if (fallbackOrOptions && typeof fallbackOrOptions === 'object' && !Array.isArray(fallbackOrOptions)) {
    return normaliseCurrencyCode(value, fallbackOrOptions);
  }

  return normaliseCurrencyCode(value, { fallback: fallbackOrOptions ?? 'USD' });
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

export function currencyStringToCents(value, { allowNegative = false, fieldName = 'amount' } = {}) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const sanitized = toSanitisedString(value).replace(/[,\s_]/g, '');
  if (!sanitized) {
    return 0;
  }

  const normalised = sanitized.replace(/^\+/, '');
  if (!/^-?\d*(?:\.\d{0,})?$/.test(normalised)) {
    throw new Error(`${fieldName} must be a valid monetary amount`);
  }

  const numeric = Number.parseFloat(normalised);
  if (!Number.isFinite(numeric)) {
    throw new Error(`${fieldName} must be a finite number`);
  }

  const cents = Math.round(numeric * 100);
  if (!allowNegative && cents < 0) {
    throw new Error(`${fieldName} cannot be negative`);
  }

  return cents;
}

export function centsToCurrencyString(amountCents, { locale = 'en-US', currency, fractionDigits } = {}) {
  const numeric = Number(amountCents ?? 0);
  if (!Number.isFinite(numeric)) {
    throw new Error('amountCents must be a finite number');
  }

  const resolvedDigits = Number.isInteger(fractionDigits) && fractionDigits >= 0 ? fractionDigits : 2;
  const formatterOptions = {
    minimumFractionDigits: resolvedDigits,
    maximumFractionDigits: resolvedDigits
  };

  if (currency) {
    formatterOptions.style = 'currency';
    formatterOptions.currency = normalizeCurrencyCode(currency, 'USD');
  }

  const formatter = new Intl.NumberFormat(locale, formatterOptions);
  return formatter.format(numeric / 100);
}
