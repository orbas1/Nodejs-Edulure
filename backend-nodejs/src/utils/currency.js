const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

function normalizeFallback(fallback) {
  if (!fallback) {
    return 'USD';
  }
  const code = String(fallback).trim().toUpperCase();
  return CURRENCY_CODE_PATTERN.test(code) ? code : 'USD';
}

export function normalizeCurrencyCode(code, fallback = 'USD') {
  const fallbackCode = normalizeFallback(fallback);
  if (typeof code === 'string') {
    const trimmed = code.trim().toUpperCase();
    if (CURRENCY_CODE_PATTERN.test(trimmed)) {
      return trimmed;
    }
  } else if (code !== undefined && code !== null) {
    const coerced = String(code).trim().toUpperCase();
    if (CURRENCY_CODE_PATTERN.test(coerced)) {
      return coerced;
    }
  }
  return fallbackCode;
}

export function currencyStringToCents(value) {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return Math.round(parsed * 100);
}

export function centsToCurrencyString(amount) {
  if (!Number.isFinite(amount)) {
    return '0.00';
  }
  return (Math.round(amount) / 100).toFixed(2);
}
