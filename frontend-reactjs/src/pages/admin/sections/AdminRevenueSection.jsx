import { useMemo } from 'react';
import PropTypes from 'prop-types';

import AdminSummaryCard from '../../../components/admin/AdminSummaryCard.jsx';
import { ensureArray, ensureString } from '../utils.js';

const currencyFormatterCache = new Map();
const percentFormatter = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });
const numberFormatter = new Intl.NumberFormat('en-US');

function getCurrencyFormatter(currency = 'USD') {
  const key = currency.toUpperCase();
  if (!currencyFormatterCache.has(key)) {
    currencyFormatterCache.set(
      key,
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: key,
        maximumFractionDigits: 0
      })
    );
  }
  return currencyFormatterCache.get(key);
}

function formatValue({ value = 0, unit = 'number', currency = 'USD' }) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  if (unit === 'cents') {
    return getCurrencyFormatter(currency).format(value / 100);
  }
  if (unit === 'ratio') {
    return percentFormatter.format(value);
  }
  return numberFormatter.format(value);
}

function formatChange(change, { unit = 'number', currency = 'USD' }) {
  if (!change || change.absolute === undefined || change.absolute === null) {
    return null;
  }
  const delta = Number(change.absolute);
  if (!Number.isFinite(delta) || delta === 0) {
    return 'Flat vs prior period';
  }
  const direction = delta > 0 ? '▲' : '▼';
  const magnitude = Math.abs(delta);
  if (unit === 'cents') {
    return `${direction} ${getCurrencyFormatter(currency).format(magnitude / 100)} vs prior`;
  }
  if (unit === 'ratio') {
    return `${direction} ${(magnitude * 100).toFixed(1)} pts vs prior`;
  }
  return `${direction} ${numberFormatter.format(magnitude)} vs prior`;
}

function determineTone(metricKey, change) {
  if (!change || !Number.isFinite(change.absolute) || change.absolute === 0) {
    return 'default';
  }
  const lowered = (metricKey ?? '').toLowerCase();
  if (lowered.includes('refund') || lowered.includes('discount') || lowered.includes('tax')) {
    return change.absolute > 0 ? 'danger' : 'positive';
  }
  return change.absolute >= 0 ? 'positive' : 'warning';
}

function normaliseCards(cards) {
  return ensureArray(cards).map((card, index) => {
    const label = ensureString(card?.label, `Metric ${index + 1}`);
    const value = ensureString(card?.value, '—');
    const helper = ensureString(card?.helper);
    return { label, value, helper: helper || null };
  });
}

function normaliseBreakdown(entries) {
  return ensureArray(entries).map((entry, index) => ({
    label: ensureString(entry?.label, `Entry ${index + 1}`),
    value: ensureString(entry?.value, '—')
  }));
}

function buildSummaryFromSavedView(view) {
  return ensureArray(view?.metrics).map((metric, index) => {
    const unit = metric?.unit ?? 'number';
    const currency = metric?.currency ?? 'USD';
    const key = metric?.key ?? metric?.id ?? `metric-${index}`;
    const helper =
      metric?.previous === undefined || metric.previous === null
        ? null
        : `Previous: ${formatValue({ value: Number(metric.previous), unit, currency })}`;

    return {
      key,
      label: metric?.label ?? metric?.name ?? 'Metric',
      value: formatValue({ value: Number(metric?.current ?? 0), unit, currency }),
      helper,
      trendLabel: formatChange(metric?.change, { unit, currency }),
      tone: determineTone(key, metric?.change)
    };
  });
}

export default function AdminRevenueSection({
  revenueCards,
  paymentHealthBreakdown,
  savedViews,
  selectedSavedViewId,
  onSelectSavedView,
  savedViewsLoading,
  savedViewsError,
  onExport
}) {
  const cards = useMemo(() => normaliseCards(revenueCards), [revenueCards]);
  const paymentBreakdown = useMemo(() => normaliseBreakdown(paymentHealthBreakdown), [
    paymentHealthBreakdown
  ]);

  const resolvedSavedViews = useMemo(() => ensureArray(savedViews), [savedViews]);
  const selectedSavedView = useMemo(() => {
    if (!resolvedSavedViews.length) {
      return null;
    }
    if (!selectedSavedViewId) {
      return resolvedSavedViews[0];
    }
    return (
      resolvedSavedViews.find((view) => view.id === selectedSavedViewId) ?? resolvedSavedViews[0]
    );
  }, [resolvedSavedViews, selectedSavedViewId]);

  const summaryCards = useMemo(() => {
    if (selectedSavedView) {
      const summaries = buildSummaryFromSavedView(selectedSavedView);
      if (summaries.length) {
        return summaries;
      }
    }
    return cards.map((card) => ({
      key: card.label,
      label: card.label,
      value: card.value,
      helper: card.helper,
      tone: 'default',
      trendLabel: null
    }));
  }, [cards, selectedSavedView]);

  const savedViewState = useMemo(() => {
    if (savedViewsLoading) {
      return 'loading';
    }
    if (savedViewsError) {
      return 'error';
    }
    if (!resolvedSavedViews.length) {
      return 'empty';
    }
    return 'ready';
  }, [savedViewsLoading, savedViewsError, resolvedSavedViews.length]);

  return (
    <section id="revenue" className="grid gap-6 xl:grid-cols-5">
      <div className="space-y-6 xl:col-span-3">
        <div className="dashboard-section space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Revenue performance</h2>
              <p className="text-sm text-slate-600">
                Recurring monetisation velocity across subscriptions and payments.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                onClick={onExport}
                disabled={!onExport}
              >
                Export report
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Saved views</h3>
              {savedViewState === 'loading' ? (
                <span className="text-xs text-slate-500" aria-live="polite">
                  Loading saved views…
                </span>
              ) : null}
              {savedViewState === 'error' ? (
                <span className="text-xs text-rose-600" aria-live="assertive">
                  {savedViewsError?.message ?? 'Unable to load saved views.'}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {resolvedSavedViews.map((view) => {
                const isActive = selectedSavedView?.id === view.id;
                return (
                  <button
                    key={view.id}
                    type="button"
                    onClick={() => onSelectSavedView?.(view.id)}
                    disabled={savedViewsLoading}
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                      isActive
                        ? 'bg-primary text-white shadow-card'
                        : 'border border-slate-300 text-slate-600 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {view.name ?? view.id}
                  </button>
                );
              })}
              {savedViewState === 'empty' ? (
                <span className="text-xs text-slate-500">
                  No saved views yet. Use analytics exports to create curated revenue monitors.
                </span>
              ) : null}
            </div>
            {selectedSavedView?.description ? (
              <p className="text-xs text-slate-500">{selectedSavedView.description}</p>
            ) : null}
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            {summaryCards.map((card) => (
              <AdminSummaryCard
                key={card.key}
                label={card.label}
                value={card.value}
                helper={card.helper}
                tone={card.tone}
                trendLabel={card.trendLabel}
              />
            ))}
          </dl>
        </div>
      </div>

      <div className="dashboard-section xl:col-span-2">
        <h3 className="text-lg font-semibold text-slate-900">Payment health</h3>
        <p className="mt-1 text-xs text-slate-500">
          Track retry workload and make sure recovery queues stay manageable.
        </p>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          {paymentBreakdown.length === 0 ? (
            <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
              No payment telemetry available yet. Saved views will populate once the first billing cycle completes.
            </li>
          ) : (
            paymentBreakdown.map((entry) => (
              <li
                key={entry.label}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <span>{entry.label}</span>
                <span className="font-semibold text-slate-900">{entry.value}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}

const savedViewShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string,
  description: PropTypes.string,
  metrics: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      label: PropTypes.string,
      unit: PropTypes.string,
      currency: PropTypes.string,
      current: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      previous: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      change: PropTypes.shape({
        absolute: PropTypes.number,
        percentage: PropTypes.number
      })
    })
  )
});

AdminRevenueSection.propTypes = {
  revenueCards: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      helper: PropTypes.string
    })
  ).isRequired,
  paymentHealthBreakdown: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired
    })
  ).isRequired,
  savedViews: PropTypes.arrayOf(savedViewShape),
  selectedSavedViewId: PropTypes.string,
  onSelectSavedView: PropTypes.func,
  savedViewsLoading: PropTypes.bool,
  savedViewsError: PropTypes.shape({ message: PropTypes.string }),
  onExport: PropTypes.func
};

AdminRevenueSection.defaultProps = {
  savedViews: [],
  selectedSavedViewId: null,
  onSelectSavedView: null,
  savedViewsLoading: false,
  savedViewsError: null,
  onExport: undefined
};
