const DEFAULT_LOCALE = 'en-US';
const DEFAULT_CURRENCY = 'USD';

function normaliseCurrencyCode(value) {
  if (!value || typeof value !== 'string') return DEFAULT_CURRENCY;
  return value.trim().toUpperCase();
}

export function formatCurrencyFromCents(amountCents, { currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE } = {}) {
  const normalisedCurrency = normaliseCurrencyCode(currency);
  const amount = Number.isFinite(Number(amountCents)) ? Number(amountCents) / 100 : 0;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalisedCurrency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    const safeAmount = Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
    return `${normalisedCurrency} ${safeAmount}`;
  }
}

export function formatPercent(value, { locale = DEFAULT_LOCALE, maximumFractionDigits = 1 } = {}) {
  if (!Number.isFinite(Number(value))) {
    return '0%';
  }
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits
  }).format(Number(value));
}

export function parseCurrencyInput(value) {
  if (value === null || value === undefined) {
    return { amountCents: NaN };
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return { amountCents: Math.round(value * 100) };
  }

  const stringValue = String(value).trim();
  if (stringValue.length === 0) {
    return { amountCents: NaN };
  }

  const cleaned = stringValue
    .replace(/[^0-9,.-]/g, '')
    .replace(/,(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');

  const numeric = Number.parseFloat(cleaned);
  if (!Number.isFinite(numeric)) {
    return { amountCents: NaN };
  }

  return { amountCents: Math.round(numeric * 100) };
}

export function computeBudgetPacing({
  dailyCents,
  totalCents,
  spendToDateCents = 0,
  startAt,
  endAt,
  today = new Date()
}) {
  const result = {
    dailyCents: Number.isFinite(Number(dailyCents)) ? Number(dailyCents) : NaN,
    totalCents: Number.isFinite(Number(totalCents)) ? Number(totalCents) : NaN,
    spendToDateCents: Number.isFinite(Number(spendToDateCents)) ? Number(spendToDateCents) : 0,
    daysElapsed: null,
    daysRemaining: null,
    totalDurationDays: null,
    projectedTotalCents: null,
    burnRate: null
  };

  if (!startAt && !endAt) {
    return result;
  }

  const start = startAt ? new Date(startAt) : null;
  const end = endAt ? new Date(endAt) : null;
  if (start && Number.isNaN(start.getTime())) {
    return result;
  }
  if (end && Number.isNaN(end.getTime())) {
    return result;
  }

  const effectiveStart = start ?? today;
  const effectiveEnd = end ?? today;

  const msPerDay = 1000 * 60 * 60 * 24;
  const duration = Math.max(1, Math.round((effectiveEnd - effectiveStart) / msPerDay) || 0);

  const elapsed = start ? Math.max(0, Math.round((today - start) / msPerDay)) : 0;
  const remaining = end ? Math.max(0, Math.round((end - today) / msPerDay)) : null;

  result.daysElapsed = elapsed;
  result.daysRemaining = remaining;
  result.totalDurationDays = duration;

  if (Number.isFinite(result.dailyCents) && duration) {
    result.projectedTotalCents = result.dailyCents * duration;
  }

  if (result.daysElapsed > 0 && result.spendToDateCents > 0) {
    result.burnRate = result.spendToDateCents / result.daysElapsed;
  }

  if (
    result.projectedTotalCents &&
    Number.isFinite(result.projectedTotalCents) &&
    Number.isFinite(result.spendToDateCents) &&
    result.daysRemaining !== null &&
    result.daysRemaining > 0
  ) {
    const remainingBudget = result.projectedTotalCents - result.spendToDateCents;
    if (Number.isFinite(remainingBudget) && remainingBudget > 0) {
      const recommendedDaily = remainingBudget / Math.max(result.daysRemaining, 1);
      result.recommendedDailyCents = Math.max(0, Math.round(recommendedDaily));
    }
  }

  return result;
}

export function deriveBudgetWarnings({
  minimumDailyCents,
  pacing,
  spendToDateCents,
  totalCents
}) {
  const warnings = [];
  const numericSpend = Number.isFinite(Number(spendToDateCents)) ? Number(spendToDateCents) : 0;
  const numericTotal = Number.isFinite(Number(totalCents)) ? Number(totalCents) : NaN;

  if (Number.isFinite(numericTotal) && numericTotal > 0 && numericSpend > numericTotal) {
    warnings.push('Spend to date already exceeds the planned total budget.');
  }

  if (pacing?.recommendedDailyCents && pacing.recommendedDailyCents < minimumDailyCents) {
    warnings.push('Pacing would drop below the minimum daily budget. Review schedule or budget.');
  }

  return warnings;
}

export function validateBudget({
  dailyCents,
  totalCents,
  minimumDailyCents,
  schedule
}) {
  const errors = [];

  const numericDaily = Number.isFinite(Number(dailyCents)) ? Number(dailyCents) : NaN;
  const numericTotal = Number.isFinite(Number(totalCents)) ? Number(totalCents) : NaN;

  if (!Number.isFinite(numericDaily) || numericDaily <= 0) {
    errors.push('Provide a valid daily budget.');
  } else if (minimumDailyCents && numericDaily < minimumDailyCents) {
    errors.push(`Daily budget must be at least ${minimumDailyCents / 100} in currency units.`);
  }

  if (Number.isFinite(numericTotal) && Number.isFinite(numericDaily) && numericTotal > 0 && numericTotal < numericDaily) {
    errors.push('Total budget must be greater than or equal to the daily budget.');
  }

  const { startAt, endAt } = schedule ?? {};
  if (startAt && endAt) {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
      errors.push('End date must be after the start date.');
    }
  }

  return errors;
}
