import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { fetchRevenueSavedViews } from '../../../api/analyticsApi.js';
import AdminSummaryCard from '../../../components/admin/AdminSummaryCard.jsx';
import { ensureArray, ensureString } from '../utils.js';
import { formatCurrency, formatNumber, formatPercent } from '../utils.js';

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

export default function AdminRevenueSection({ token, revenueCards, paymentHealthBreakdown, onExport }) {
  const cards = useMemo(() => normaliseCards(revenueCards), [revenueCards]);
  const paymentBreakdown = useMemo(() => normaliseBreakdown(paymentHealthBreakdown), [paymentHealthBreakdown]);
  const [savedViews, setSavedViews] = useState([]);
  const [savedViewsError, setSavedViewsError] = useState(null);
  const [loadingSavedViews, setLoadingSavedViews] = useState(false);
  const [selectedViewId, setSelectedViewId] = useState(null);
  const [savedViewRange, setSavedViewRange] = useState('30d');

  useEffect(() => {
    if (!token) {
      setSavedViews([]);
      setSavedViewsError(null);
      setSelectedViewId(null);
      return;
    }

    const controller = new AbortController();
    const loadSavedViews = async () => {
      setLoadingSavedViews(true);
      setSavedViewsError(null);
      try {
        const payload = await fetchRevenueSavedViews({ token, range: savedViewRange, signal: controller.signal });
        const views = ensureArray(payload?.data?.views ?? payload?.views);
        setSavedViews(views);
        setSelectedViewId((current) => (views.some((view) => view.id === current) ? current : views[0]?.id ?? null));
      } catch (error) {
        if (!controller.signal.aborted) {
          setSavedViewsError(error instanceof Error ? error : new Error('Failed to load saved views'));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSavedViews(false);
        }
      }
    };

    loadSavedViews();

    return () => controller.abort();
  }, [token, savedViewRange]);

  const activeView = useMemo(() => {
    if (!savedViews.length) {
      return null;
    }
    if (selectedViewId) {
      const match = savedViews.find((view) => view.id === selectedViewId);
      if (match) {
        return match;
      }
    }
    return savedViews[0] ?? null;
  }, [savedViews, selectedViewId]);

  const formatCents = useCallback(
    (value, currency = 'USD') =>
      formatCurrency(value ?? 0, typeof currency === 'string' && currency.length === 3 ? currency : 'USD', {
        denominator: 100,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        fallback: '—'
      }),
    []
  );

  const buildTrend = useCallback(
    (change) => {
      if (!change) {
        return null;
      }
      const percentage = Number(change.percentage ?? change.percent ?? 0);
      if (!Number.isFinite(percentage) || percentage === 0) {
        return { value: formatPercent(percentage, { allowSigned: true, precision: 1 }), tone: 'neutral' };
      }
      return {
        value: formatPercent(percentage, { allowSigned: true, precision: 1 }),
        tone: percentage > 0 ? 'positive' : 'warning'
      };
    },
    []
  );

  const successRate = useMemo(() => {
    const total = Number(activeView?.intents?.totalIntents ?? 0);
    const succeeded = Number(activeView?.intents?.succeededIntents ?? 0);
    if (!Number.isFinite(total) || total <= 0) {
      return null;
    }
    const rate = (succeeded / total) * 100;
    return {
      rate: formatPercent(rate, { precision: 1 }),
      breakdown: `${formatNumber(succeeded)} of ${formatNumber(total)}`
    };
  }, [activeView]);

  const currencyBreakdown = useMemo(
    () => ensureArray(activeView?.breakdown?.currencies).map((entry) => ({
      currency: entry?.currency ?? 'USD',
      gross: formatCents(entry?.grossVolumeCents, entry?.currency ?? 'USD'),
      share: formatPercent(entry?.share ?? entry?.percentage ?? 0, { precision: 1, allowSigned: false, fallback: '—' })
    })),
    [activeView, formatCents]
  );

  const savedViewsStatus = useMemo(() => {
    if (savedViewsError) {
      return savedViewsError.message;
    }
    if (loadingSavedViews) {
      return 'Refreshing saved views…';
    }
    return null;
  }, [savedViewsError, loadingSavedViews]);

  return (
    <section id="revenue" className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm xl:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Revenue performance</h2>
              <p className="text-sm text-slate-600">Recurring monetisation velocity across subscriptions and payments.</p>
            </div>
            <button
              type="button"
              className="dashboard-pill disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onExport}
              disabled={!onExport}
            >
              Export report
            </button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {cards.map((card) => (
              <AdminSummaryCard key={card.label} label={card.label} value={card.value} helper={card.helper} />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm xl:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900">Payment health</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {paymentBreakdown.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                No payment telemetry available yet.
              </li>
            ) : (
              paymentBreakdown.map((entry) => (
                <li key={entry.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <span>{entry.label}</span>
                  <span className="font-semibold text-slate-900">{entry.value}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Saved revenue views</h3>
            <p className="text-sm text-slate-600">Materialised from ReportingPaymentsRevenueDailyView for quick reconciliation.</p>
          </div>
          <div className="flex gap-2">
            {['7d', '30d', '90d'].map((range) => {
              const isActive = savedViewRange === range;
              const baseClass =
                'rounded-full border px-3 py-1 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
              const activeClass = ' border-primary bg-primary/10 text-primary';
              const inactiveClass = ' border-slate-200 text-slate-600 hover:border-primary hover:text-primary';
              return (
                <button
                  key={range}
                  type="button"
                  className={baseClass + (isActive ? activeClass : inactiveClass)}
                  onClick={() => setSavedViewRange(range)}
                  disabled={loadingSavedViews && range === savedViewRange}
                >
                  {range.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
        {savedViewsStatus ? (
          <p className={`mt-2 text-xs ${savedViewsError ? 'text-rose-600' : 'text-slate-400'}`}>{savedViewsStatus}</p>
        ) : null}
        {savedViews.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No saved views available for this range yet.</p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {savedViews.map((view) => {
                const isActive = activeView && view.id === activeView.id;
                const baseClass = 'rounded-full border px-3 py-1 text-xs font-semibold transition';
                const activeClass = ' border-primary bg-primary/10 text-primary';
                const inactiveClass = ' border-slate-200 text-slate-600 hover:border-primary hover:text-primary';
                return (
                  <button
                    key={view.id}
                    type="button"
                    className={baseClass + (isActive ? activeClass : inactiveClass)}
                    onClick={() => setSelectedViewId(view.id)}
                  >
                    {ensureString(view.title, view.id)}
                  </button>
                );
              })}
            </div>
            {activeView ? (
              <>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <AdminSummaryCard
                    label="Gross volume"
                    value={formatCents(activeView?.totals?.grossVolumeCents, activeView?.currency ?? 'USD')}
                    helper={`Discounts ${formatCents(activeView?.totals?.discountCents, activeView?.currency ?? 'USD')}`}
                    trend={buildTrend(activeView?.change?.grossVolume)}
                  />
                  <AdminSummaryCard
                    label="Recognised revenue"
                    value={formatCents(activeView?.totals?.recognisedVolumeCents, activeView?.currency ?? 'USD')}
                    helper={`Refunded ${formatCents(activeView?.totals?.refundedCents, activeView?.currency ?? 'USD')}`}
                    trend={buildTrend(activeView?.change?.recognisedVolume)}
                  />
                </div>
                {successRate ? (
                  <p className="mt-4 text-sm text-slate-600">
                    Payment success {successRate.rate}
                    <span className="ml-2 text-xs text-slate-500">({successRate.breakdown})</span>
                  </p>
                ) : null}
                {currencyBreakdown.length ? (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Currency mix</h4>
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                      {currencyBreakdown.map((entry) => (
                        <li
                          key={entry.currency}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                        >
                          <span className="font-semibold text-slate-900">{entry.currency}</span>
                          <span className="ml-2">{entry.gross}</span>
                          <span className="ml-2 text-xs text-slate-500">{entry.share}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

AdminRevenueSection.propTypes = {
  token: PropTypes.string,
  revenueCards: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.string,
      helper: PropTypes.string
    })
  ),
  paymentHealthBreakdown: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.string
    })
  ),
  onExport: PropTypes.func
};

AdminRevenueSection.defaultProps = {
  token: null,
  revenueCards: [],
  paymentHealthBreakdown: [],
  onExport: undefined
};
