import { useCallback, useMemo } from 'react';

import {
  computeBudgetPacing,
  deriveBudgetWarnings,
  formatCurrencyFromCents,
  parseCurrencyInput,
  validateBudget
} from '../utils/commerceFormatting.js';

export function useBudgetingControls({
  values,
  onChange,
  schedule,
  spendToDateCents = 0,
  minimumDailyCents = 100,
  currency,
  locale = 'en-US'
}) {
  const handleDailyChange = useCallback(
    (event) => {
      onChange({ budgetDailyAmount: event.target.value });
    },
    [onChange]
  );

  const handleTotalChange = useCallback(
    (event) => {
      onChange({ budgetTotalAmount: event.target.value });
    },
    [onChange]
  );

  const handleCurrencyChange = useCallback(
    (event) => {
      onChange({ budgetCurrency: event.target.value.toUpperCase() });
    },
    [onChange]
  );

  const numericDailyCents = useMemo(() => parseCurrencyInput(values.budgetDailyAmount).amountCents, [values.budgetDailyAmount]);
  const numericTotalCents = useMemo(() => parseCurrencyInput(values.budgetTotalAmount).amountCents, [values.budgetTotalAmount]);

  const sanitizedBudget = useMemo(
    () => ({
      currency: (values.budgetCurrency || currency || 'USD').toUpperCase(),
      dailyCents: Number.isFinite(numericDailyCents) ? Math.max(numericDailyCents, 0) : null,
      totalCents: Number.isFinite(numericTotalCents) ? Math.max(numericTotalCents, 0) : null
    }),
    [currency, numericDailyCents, numericTotalCents, values.budgetCurrency]
  );

  const pacing = useMemo(
    () =>
      computeBudgetPacing({
        dailyCents: sanitizedBudget.dailyCents,
        totalCents: sanitizedBudget.totalCents,
        spendToDateCents,
        startAt: schedule?.startAt,
        endAt: schedule?.endAt
      }),
    [sanitizedBudget.dailyCents, sanitizedBudget.totalCents, schedule?.endAt, schedule?.startAt, spendToDateCents]
  );

  const errors = useMemo(
    () =>
      validateBudget({
        dailyCents: sanitizedBudget.dailyCents,
        totalCents: sanitizedBudget.totalCents,
        minimumDailyCents,
        schedule
      }),
    [minimumDailyCents, sanitizedBudget.dailyCents, sanitizedBudget.totalCents, schedule]
  );

  const warnings = useMemo(
    () =>
      deriveBudgetWarnings({
        minimumDailyCents,
        pacing,
        spendToDateCents,
        totalCents: sanitizedBudget.totalCents
      }),
    [minimumDailyCents, pacing, sanitizedBudget.totalCents, spendToDateCents]
  );

  const resetBudget = useCallback(() => {
    onChange({
      budgetDailyAmount: (minimumDailyCents / 100).toFixed(2),
      budgetTotalAmount: '',
      budgetCurrency: (values.budgetCurrency || currency || 'USD').toUpperCase()
    });
  }, [currency, minimumDailyCents, onChange, values.budgetCurrency]);

  return {
    inputs: {
      daily: values.budgetDailyAmount ?? '',
      total: values.budgetTotalAmount ?? '',
      currency: values.budgetCurrency ?? currency ?? 'USD'
    },
    handlers: {
      onDailyChange: handleDailyChange,
      onTotalChange: handleTotalChange,
      onCurrencyChange: handleCurrencyChange,
      onReset: resetBudget
    },
    meta: {
      sanitizedBudget,
      pacing,
      errors,
      warnings,
      formatted: {
        daily: formatCurrencyFromCents(sanitizedBudget.dailyCents ?? 0, {
          currency: sanitizedBudget.currency,
          locale
        }),
        total: sanitizedBudget.totalCents
          ? formatCurrencyFromCents(sanitizedBudget.totalCents, {
              currency: sanitizedBudget.currency,
              locale
            })
          : null
      }
    }
  };
}

export default useBudgetingControls;
