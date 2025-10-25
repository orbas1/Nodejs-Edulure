const ISO_4217_REGEX = /^[A-Z]{3}$/;

function toSanitisedString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

export function normaliseCurrencyCode(value, options = {}) {
  const fallbackOption =
    typeof options === 'string'
      ? { fallback: options }
      : options && typeof options === 'object'
        ? options
        : { fallback: 'USD' };
  const { fallback = 'USD' } = fallbackOption;

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
  if (fallbackOrOptions === undefined) {
    return normaliseCurrencyCode(value);
  }
  if (typeof fallbackOrOptions === 'string') {
    return normaliseCurrencyCode(value, { fallback: fallbackOrOptions });
  }
  if (fallbackOrOptions && typeof fallbackOrOptions === 'object') {
    return normaliseCurrencyCode(value, fallbackOrOptions);
  }
  return normaliseCurrencyCode(value);
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

export function centsToCurrencyString(amountCents, currency = 'USD', options = {}) {
  const amount = Number(amountCents ?? 0);
  if (!Number.isFinite(amount)) {
    throw new TypeError('amountCents must be a finite number');
  }

  const resolvedCurrency = normalizeCurrencyCode(
    currency,
    options.fallbackCurrency ?? 'USD'
  );

  const formatter = new Intl.NumberFormat(options.locale ?? 'en-US', {
    style: 'currency',
    currency: resolvedCurrency,
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 2
  });

  return formatter.format(amount / 100);
}

export function currencyStringToCents(value, { currency, fallbackCurrency } = {}) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const candidateCurrency = currency ?? fallbackCurrency ?? 'USD';
  const resolvedCurrency = normalizeCurrencyCode(candidateCurrency, fallbackCurrency ?? 'USD');

  const raw = String(value).trim();
  if (!raw) {
    return 0;
  }

  const sign = raw.includes('-') ? -1 : 1;
  const unsigned = raw.replace(/-/g, '');

  // Remove any currency symbols or whitespace, retain digits, separators and decimals
  const cleaned = unsigned.replace(new RegExp(`[^0-9.,]`, 'g'), '');
  if (!cleaned) {
    return 0;
  }

  // Determine decimal separator preference (default to '.')
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalisedNumeric = cleaned;
  if (lastComma > -1 && lastComma > lastDot) {
    // Treat comma as decimal separator; remove thousands separators
    normalisedNumeric = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Treat dot as decimal separator; remove grouping commas
    normalisedNumeric = cleaned.replace(/,/g, '');
  }

  const numeric = Number.parseFloat(normalisedNumeric);
  if (Number.isNaN(numeric)) {
    throw new Error(`Unable to parse currency string "${value}" as ${resolvedCurrency}`);
  }

  return Math.round(numeric * 100) * sign;
}
