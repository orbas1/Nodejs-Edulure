const DEFAULT_LOCALE = undefined;

function safeNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function formatCurrency(amount, currency = 'USD', options = {}) {
  const numericAmount = safeNumber(amount);
  if (numericAmount === null) {
    return null;
  }

  const { locale = DEFAULT_LOCALE, ...formatOptions } = options;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...formatOptions
    }).format(numericAmount);
  } catch (error) {
    const fixed = numericAmount.toFixed(2);
    return `${currency} ${fixed}`;
  }
}

export function formatCurrencyFromMinorUnits(amountMinor, currency = 'USD', options = {}) {
  const numericAmount = safeNumber(amountMinor);
  if (numericAmount === null) {
    return null;
  }

  return formatCurrency(numericAmount / 100, currency, options);
}

export function formatCurrencyRange(minAmount, maxAmount, currency = 'USD', options = {}) {
  const min = safeNumber(minAmount);
  const max = safeNumber(maxAmount);

  if (min === null && max === null) {
    return null;
  }

  if (min !== null && max !== null && min === max) {
    return formatCurrency(min, currency, options);
  }

  const formattedMin = min !== null ? formatCurrency(min, currency, options) : null;
  const formattedMax = max !== null ? formatCurrency(max, currency, options) : null;

  if (formattedMin && formattedMax) {
    return `${formattedMin} – ${formattedMax}`;
  }

  return formattedMin ?? formattedMax ?? null;
}

export default {
  formatCurrency,
  formatCurrencyFromMinorUnits,
  formatCurrencyRange
};
