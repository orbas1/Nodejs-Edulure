import { useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BoltIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CloudArrowDownIcon,
  ClockIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  WalletIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import {
  approveFinancePayout,
  holdFinancePayout,
  settleFinanceInvoice,
  stopFinanceExperiment
} from '../../../api/operatorDashboardApi.js';
import DashboardStateMessage from '../../../components/dashboard/DashboardStateMessage.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import useFinanceDashboard from '../../../hooks/useFinanceDashboard.js';

const currencyFormatterCache = new Map();
const compactNumberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

function formatCurrencyAmount(amount, currency = 'USD', { maximumFractionDigits = 0 } = {}) {
  if (!Number.isFinite(amount)) {
    return '—';
  }
  const key = `${currency}:${maximumFractionDigits}`;
  if (!currencyFormatterCache.has(key)) {
    currencyFormatterCache.set(
      key,
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits,
        minimumFractionDigits: Math.min(2, maximumFractionDigits)
      })
    );
  }
  return currencyFormatterCache.get(key).format(amount);
}

function normalisePercentValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  if (Math.abs(numeric) > 1.0001) {
    return numeric / 100;
  }
  return numeric;
}

function formatPercent(value, { fallback = '—', maximumFractionDigits = 1 } = {}) {
  const normalised = normalisePercentValue(value);
  if (normalised === null) {
    return fallback;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits
  }).format(normalised);
}

function formatMetricValue(metric) {
  if (!metric) {
    return '—';
  }
  const value = metric.value;
  if (value === null || value === undefined) {
    return '—';
  }
  const formatter = typeof metric.formatter === 'string' ? metric.formatter.toLowerCase() : null;
  const unit = typeof metric.unit === 'string' ? metric.unit.toLowerCase() : null;

  if (formatter === 'currency' || (unit && unit.length === 3)) {
    return formatCurrencyAmount(Number(value), (unit ?? 'usd').toUpperCase());
  }

  if (formatter === 'percentage' || unit === '%') {
    return formatPercent(Number(value));
  }

  if (typeof value === 'number') {
    return compactNumberFormatter.format(value);
  }

  return value;
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString();
}

function formatDate(value) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString();
}

function safePercentWidth(value) {
  const normalised = normalisePercentValue(value);
  if (normalised === null) {
    return '0%';
  }
  const ratio = Math.max(0, Math.min(1, normalised));
  return `${Math.round(ratio * 100)}%`;
}

function TrendBadge({ metric }) {
  if (!metric || metric.change === null || metric.change === undefined) {
    return null;
  }
  const direction = metric.direction ?? (metric.change >= 0 ? 'up' : 'down');
  const isPositive = direction === 'up';
  const Icon = isPositive ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  const tone = isPositive
    ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : 'text-rose-600 bg-rose-50 border-rose-200';
  const value = formatPercent(metric.change, { maximumFractionDigits: 1, fallback: metric.change });
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold', tone)}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {value}
    </span>
  );
}

function SummaryMetricCard({ metric }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.label}</p>
      <p className="text-3xl font-semibold text-slate-900">{formatMetricValue(metric)}</p>
      <TrendBadge metric={metric} />
      {metric.target ? (
        <p className="text-xs text-slate-500">Target {metric.target}</p>
      ) : null}
    </div>
  );
}

function OfflineBanner({ lastUpdated }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CloudArrowDownIcon className="h-5 w-5" aria-hidden="true" />
        You are offline. Showing the most recent cached finance metrics.
      </div>
      {lastUpdated ? <p className="text-xs">Last updated {formatDateTime(lastUpdated)}</p> : null}
    </div>
  );
}

function StaleBanner({ lastUpdated, onRefresh }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ExclamationTriangleIcon className="h-5 w-5" aria-hidden="true" />
        Finance metrics are stale. Refresh when connectivity is restored.
      </div>
      <div className="flex items-center gap-3 text-xs">
        {lastUpdated ? <span>Cached {formatDateTime(lastUpdated)}</span> : null}
        <button type="button" className="font-semibold underline" onClick={onRefresh}>
          Retry now
        </button>
      </div>
    </div>
  );
}

function ActionFeedback({ feedback, onDismiss }) {
  if (!feedback) {
    return null;
  }
  const toneClass = feedback.tone === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  const Icon = feedback.tone === 'error' ? ExclamationTriangleIcon : CheckCircleIcon;
  return (
    <div className={clsx('flex items-start gap-3 rounded-2xl border px-4 py-3', toneClass)}>
      <Icon className="mt-0.5 h-5 w-5" aria-hidden="true" />
      <div className="flex-1 text-sm font-medium">{feedback.message}</div>
      <button type="button" className="text-xs font-semibold underline" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="mt-2">{description}</p>
    </div>
  );
}

const pendingStateTemplate = {
  approving: new Set(),
  holding: new Set(),
  settling: new Set(),
  stopping: new Set()
};
export default function AdminFinanceMonetisation() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const {
    data,
    loading,
    error,
    tenantId,
    setTenantId,
    tenants,
    tenantsLoading,
    stale,
    offline,
    lastUpdated,
    refresh,
    refreshSilently,
    updateData
  } = useFinanceDashboard();
  const [pending, setPending] = useState(pendingStateTemplate);
  const [feedback, setFeedback] = useState(null);

  const currency = data?.revenue?.collections?.currency ?? 'USD';
  const summaryMetrics = useMemo(() => data?.revenue?.summary ?? [], [data?.revenue?.summary]);
  const collections = data?.revenue?.collections ?? { agingBuckets: [], openInvoices: [], totalOutstanding: 0 };
  const payoutQueue = data?.payouts?.queue ?? [];
  const payoutStats = data?.payouts?.stats ?? {};
  const settlements = data?.ledger?.settlements ?? [];
  const disputes = data?.ledger?.disputes ?? [];
  const reconciliation = data?.ledger?.reconciliation ?? {};
  const experiments = data?.experiments ?? { active: [], toggles: [] };
  const pricing = data?.pricing ?? { catalogues: [], guardrails: {}, pendingApprovals: [] };

  const setPendingFor = (type, id, active) => {
    setPending((prev) => {
      const next = new Set(prev[type]);
      if (active) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return { ...prev, [type]: next };
    });
  };

  const showFeedback = (message, tone = 'success') => {
    setFeedback({ message, tone });
  };

  const handleApprovePayout = async (payout) => {
    if (!token) {
      showFeedback('You must be authenticated to approve payouts.', 'error');
      return;
    }
    setPendingFor('approving', payout.id, true);
    try {
      await approveFinancePayout({ token, payoutId: payout.id, tenantId });
      updateData((current) => {
        if (!current?.payouts?.queue) {
          return current;
        }
        const nextQueue = current.payouts.queue.filter((item) => item.id !== payout.id);
        const flaggedCount = nextQueue.filter((item) => item.requiresManualReview).length;
        const awaiting = Math.max(
          0,
          (current.payouts.stats?.awaitingApproval ?? current.payouts.queue.length) - 1
        );
        return {
          ...current,
          payouts: {
            ...current.payouts,
            queue: nextQueue,
            stats: current.payouts.stats
              ? {
                  ...current.payouts.stats,
                  awaitingApproval: awaiting,
                  flagged: flaggedCount
                }
              : current.payouts.stats
          }
        };
      });
      showFeedback(`Payout ${payout.reference ?? payout.id} approved.`);
      refreshSilently();
    } catch (actionError) {
      showFeedback(actionError.message ?? 'Failed to approve payout.', 'error');
    } finally {
      setPendingFor('approving', payout.id, false);
    }
  };

  const handleHoldPayout = async (payout) => {
    if (!token) {
      showFeedback('You must be authenticated to hold payouts for review.', 'error');
      return;
    }
    if (payout.status === 'held') {
      showFeedback('This payout is already flagged for review.', 'error');
      return;
    }
    setPendingFor('holding', payout.id, true);
    const reason = 'Manual review requested by finance operations';
    try {
      await holdFinancePayout({ token, payoutId: payout.id, tenantId, reason });
      updateData((current) => {
        if (!current?.payouts?.queue) {
          return current;
        }
        const nextQueue = current.payouts.queue.map((item) =>
          item.id === payout.id
            ? {
                ...item,
                status: 'held',
                requiresManualReview: true,
                complianceHoldReason: reason
              }
            : item
        );
        const flaggedCount = nextQueue.filter((item) => item.requiresManualReview).length;
        return {
          ...current,
          payouts: {
            ...current.payouts,
            queue: nextQueue,
            stats: current.payouts.stats
              ? {
                  ...current.payouts.stats,
                  flagged: flaggedCount
                }
              : current.payouts.stats
          }
        };
      });
      showFeedback(`Payout ${payout.reference ?? payout.id} flagged for manual review.`);
      refreshSilently();
    } catch (actionError) {
      showFeedback(actionError.message ?? 'Failed to flag payout.', 'error');
    } finally {
      setPendingFor('holding', payout.id, false);
    }
  };

  const handleSettleInvoice = async (invoice) => {
    if (!token) {
      showFeedback('You must be authenticated to settle invoices.', 'error');
      return;
    }
    setPendingFor('settling', invoice.id, true);
    try {
      await settleFinanceInvoice({ token, invoiceId: invoice.id, tenantId });
      updateData((current) => {
        const currentCollections = current?.revenue?.collections;
        if (!currentCollections) {
          return current;
        }
        const nextInvoices = currentCollections.openInvoices?.filter((item) => item.id !== invoice.id) ?? [];
        const nextTotal = Math.max(
          0,
          (currentCollections.totalOutstanding ?? 0) - (invoice.amount ?? 0)
        );
        return {
          ...current,
          revenue: {
            ...current.revenue,
            collections: {
              ...currentCollections,
              openInvoices: nextInvoices,
              totalOutstanding: nextTotal
            }
          }
        };
      });
      showFeedback(`Invoice ${invoice.reference ?? invoice.id} marked as collected.`);
      refreshSilently();
    } catch (actionError) {
      showFeedback(actionError.message ?? 'Failed to settle invoice.', 'error');
    } finally {
      setPendingFor('settling', invoice.id, false);
    }
  };

  const handleStopExperiment = async (experiment) => {
    if (!token) {
      showFeedback('You must be authenticated to stop experiments.', 'error');
      return;
    }
    setPendingFor('stopping', experiment.id, true);
    try {
      await stopFinanceExperiment({ token, experimentId: experiment.id, tenantId });
      updateData((current) => {
        if (!current?.experiments?.active) {
          return current;
        }
        const nextActive = current.experiments.active.filter((item) => item.id !== experiment.id);
        return {
          ...current,
          experiments: {
            ...current.experiments,
            active: nextActive
          }
        };
      });
      showFeedback(`Experiment ${experiment.name} has been stopped.`);
      refreshSilently();
    } catch (actionError) {
      showFeedback(actionError.message ?? 'Failed to stop experiment.', 'error');
    } finally {
      setPendingFor('stopping', experiment.id, false);
    }
  };
  if (loading && !data) {
    return (
      <DashboardStateMessage
        variant="loading"
        title="Loading finance intelligence"
        description="We are aggregating revenue, billing, payout, and ledger metrics for your tenants."
      />
    );
  }

  if (error && !data) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Finance centres unavailable"
        description={error.message ?? 'We could not load the finance dashboards. Try again shortly.'}
        actionLabel="Retry"
        onAction={() => refresh()}
      />
    );
  }

  if (!data) {
    return (
      <DashboardStateMessage
        title="Finance workspace not provisioned"
        description="This tenant has not enabled revenue, billing, or payout analytics yet. Provision the finance stack to unlock the monetisation centres."
      />
    );
  }

  const autopaySuccessRate = collections.autopaySuccessRate;
  const disputeRate = collections.disputeRate;
  const recoveredRate = collections.recoveredRate;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="dashboard-kicker">Revenue &amp; Finance</p>
          <h1 className="dashboard-title">Finance &amp; monetisation centres</h1>
          <p className="dashboard-subtitle">
            Monitor collections, payout approvals, ledger reconciliation, and growth experiments across every tenant.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <select
            value={tenantId ?? ''}
            onChange={(event) => setTenantId(event.target.value)}
            disabled={tenantsLoading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => refresh()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <ArrowPathIcon className="h-5 w-5" aria-hidden="true" />
            Refresh data
          </button>
        </div>
      </header>

      {feedback ? <ActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} /> : null}
      {offline ? <OfflineBanner lastUpdated={lastUpdated} /> : null}
      {stale && !offline ? (
        <StaleBanner lastUpdated={lastUpdated} onRefresh={() => refresh()} />
      ) : null}

      <section aria-label="Finance summary metrics">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryMetrics.length ? (
            summaryMetrics.map((metric) => <SummaryMetricCard key={metric.id} metric={metric} />)
          ) : (
            <EmptyState
              title="No KPI metrics yet"
              description="Once finance KPIs are configured, live revenue, margin, and retention metrics will appear here."
            />
          )}
        </div>
      </section>
      <section className="dashboard-section" aria-label="Billing centre">
        <div className="flex items-start justify-between">
          <div>
            <p className="dashboard-kicker">Collections health</p>
            <h2 className="dashboard-title">Billing centre</h2>
            <p className="dashboard-subtitle">
              Track invoice aging, autopay coverage, and dispute exposure to keep cash flow predictable.
            </p>
          </div>
          <CreditCardIcon className="h-8 w-8 text-emerald-500" aria-hidden="true" />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Outstanding balance</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {formatCurrencyAmount(collections.totalOutstanding ?? 0, currency)}
                  </p>
                </div>
                <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                  <div>
                    <p className="font-semibold text-slate-700">Autopay success</p>
                    <p>{formatPercent(autopaySuccessRate)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">Dispute rate</p>
                    <p>{formatPercent(disputeRate)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">Recovered</p>
                    <p>{formatPercent(recoveredRate)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700">Aging buckets</h3>
              {collections.agingBuckets?.length ? (
                <ul className="mt-3 space-y-3">
                  {collections.agingBuckets.map((bucket) => (
                    <li key={bucket.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{bucket.label}</p>
                          <p className="text-xs text-slate-500">
                            {bucket.invoiceCount} invoices · oldest {formatDate(bucket.oldestInvoiceAt)}
                          </p>
                        </div>
                        <div className="text-right text-sm font-semibold text-slate-900">
                          {formatCurrencyAmount(bucket.amount, bucket.currency ?? currency)}
                        </div>
                      </div>
                      <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: safePercentWidth(bucket.percentage) }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="All invoices current"
                  description="No outstanding balances are aging beyond agreed payment terms."
                />
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Open invoices</h3>
            {collections.openInvoices?.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">Customer</th>
                      <th scope="col" className="px-4 py-3">Amount</th>
                      <th scope="col" className="px-4 py-3">Due</th>
                      <th scope="col" className="px-4 py-3">Autopay</th>
                      <th scope="col" className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {collections.openInvoices.map((invoice) => {
                      const isSettling = pending.settling.has(invoice.id);
                      return (
                        <tr key={invoice.id} className="bg-white">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{invoice.customer}</div>
                            <div className="text-xs text-slate-500">{invoice.reference ?? 'Unreferenced invoice'}</div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {formatCurrencyAmount(invoice.amount, invoice.currency ?? currency)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(invoice.dueAt)}</td>
                          <td className="px-4 py-3 text-slate-600">{invoice.autopay ? 'Enabled' : 'Manual'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                              disabled={isSettling}
                              onClick={() => handleSettleInvoice(invoice)}
                            >
                              {isSettling ? 'Settling…' : 'Mark collected'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No open invoices"
                description="All invoices have been settled. New invoices will appear here when issued."
              />
            )}
          </div>
        </div>
      </section>
      <section className="dashboard-section" aria-label="Payout approvals">
        <div className="flex items-start justify-between">
          <div>
            <p className="dashboard-kicker">Payout orchestration</p>
            <h2 className="dashboard-title">Payout approvals queue</h2>
            <p className="dashboard-subtitle">
              Review payout batches before release, flag suspicious transfers, and keep compliance evidence complete.
            </p>
          </div>
          <BanknotesIcon className="h-8 w-8 text-emerald-500" aria-hidden="true" />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Awaiting approval</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{payoutStats.awaitingApproval ?? payoutQueue.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Flagged payouts</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{payoutStats.flagged ?? payoutQueue.filter((item) => item.requiresManualReview).length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avg processing time</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {payoutStats.avgProcessingMinutes ? `${payoutStats.avgProcessingMinutes} min` : '—'}
            </p>
          </div>
        </div>

        {payoutQueue.length ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Programme</th>
                  <th scope="col" className="px-4 py-3">Amount</th>
                  <th scope="col" className="px-4 py-3">Submitted</th>
                  <th scope="col" className="px-4 py-3">Risk</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {payoutQueue.map((payout) => {
                  const approving = pending.approving.has(payout.id);
                  const holding = pending.holding.has(payout.id);
                  const riskLabel = payout.riskFlags?.length
                    ? payout.riskFlags.join(', ')
                    : payout.riskScore
                      ? `${payout.riskScore} risk score`
                      : 'Low';
                  return (
                    <tr key={payout.id} className="bg-white">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{payout.programme}</div>
                        <div className="text-xs text-slate-500">
                          Requested by {payout.requestedBy ?? 'workflow automation'}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {formatCurrencyAmount(payout.amount, payout.currency ?? currency)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTime(payout.submittedAt)}
                        {payout.agingDays ? <span className="block text-xs">{payout.agingDays} days in queue</span> : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{riskLabel}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {payout.status === 'held' ? 'Held for review' : 'Pending approval'}
                        {payout.complianceHoldReason ? (
                          <span className="block text-xs text-amber-600">{payout.complianceHoldReason}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                            disabled={approving}
                            onClick={() => handleApprovePayout(payout)}
                          >
                            {approving ? 'Approving…' : 'Approve payout'}
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                            disabled={holding || payout.status === 'held'}
                            onClick={() => handleHoldPayout(payout)}
                          >
                            {holding ? 'Flagging…' : 'Flag for review'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="No payouts awaiting approval"
              description="Approved payouts will appear once providers or automation submit new transfers."
            />
          </div>
        )}
      </section>
      <section className="dashboard-section" aria-label="Ledger reconciliation">
        <div className="flex items-start justify-between">
          <div>
            <p className="dashboard-kicker">Ledger integrity</p>
            <h2 className="dashboard-title">Reconciliation &amp; settlements</h2>
            <p className="dashboard-subtitle">
              Verify processor settlements, monitor disputes, and resolve reconciliation variances before close.
            </p>
          </div>
          <ShieldCheckIcon className="h-8 w-8 text-emerald-500" aria-hidden="true" />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Upcoming settlements</h3>
            {settlements.length ? (
              <ul className="space-y-3">
                {settlements.map((settlement) => (
                  <li key={settlement.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{settlement.processor}</p>
                        <p className="text-xs text-slate-500">Deposits {formatDateTime(settlement.depositedAt)}</p>
                      </div>
                      <div className="text-right text-sm text-slate-600">
                        <div>Gross {formatCurrencyAmount(settlement.gross.amount, settlement.gross.currency)}</div>
                        <div>Fees {formatCurrencyAmount(settlement.fees.amount, settlement.fees.currency, { maximumFractionDigits: 2 })}</div>
                        <div className="font-semibold text-slate-900">
                          Net {formatCurrencyAmount(settlement.net.amount, settlement.net.currency)}
                        </div>
                      </div>
                    </div>
                    <span className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      {settlement.status ?? 'scheduled'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No settlements queued"
                description="Connect your payment processors to stream settlement events into the finance command centre."
              />
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Reconciliation status</p>
                  <p className="text-xs text-slate-500">Last run {formatDateTime(reconciliation.lastRunAt)}</p>
                </div>
                <ChartBarIcon className="h-6 w-6 text-emerald-500" aria-hidden="true" />
              </div>
              <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-slate-700">Variance</dt>
                  <dd>
                    {formatCurrencyAmount(reconciliation.varianceAmount?.amount ?? 0, reconciliation.varianceAmount?.currency ?? currency, { maximumFractionDigits: 2 })}{' '}
                    ({reconciliation.varianceBps !== undefined && reconciliation.varianceBps !== null
                      ? `${reconciliation.varianceBps} bps`
                      : '0 bps'})
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-700">Status</dt>
                  <dd className="capitalize">{reconciliation.status ?? 'pending'}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unresolved items</h4>
                {reconciliation.unresolvedItems?.length ? (
                  <ul className="mt-2 space-y-2 text-xs text-slate-600">
                    {reconciliation.unresolvedItems.map((item) => (
                      <li key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <div>
                          <p className="font-semibold text-slate-800">{item.reference ?? item.id}</p>
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">
                            {formatCurrencyAmount(item.amount?.amount ?? 0, item.amount?.currency ?? currency, { maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-[11px] text-slate-500">Detected {formatDateTime(item.openedAt)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">All transactions reconciled.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700">Active disputes</h3>
              {disputes.length ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-4 py-3">Reference</th>
                        <th scope="col" className="px-4 py-3">Amount</th>
                        <th scope="col" className="px-4 py-3">Reason</th>
                        <th scope="col" className="px-4 py-3">Due</th>
                        <th scope="col" className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {disputes.map((dispute) => (
                        <tr key={dispute.id} className="bg-white">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{dispute.id}</div>
                            <div className="text-xs text-slate-500">Opened {formatDate(dispute.openedAt)}</div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {formatCurrencyAmount(dispute.amount?.amount ?? 0, dispute.amount?.currency ?? currency, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{dispute.reason}</td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(dispute.dueAt)}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {dispute.status}
                            {dispute.evidenceSubmitted ? (
                              <span className="block text-[11px] text-emerald-600">Evidence submitted</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No active disputes"
                  description="Payment processors have not raised disputes this period."
                />
              )}
            </div>
          </div>
        </div>
      </section>
      <section className="dashboard-section" aria-label="Experiments and feature governance">
        <div className="flex items-start justify-between">
          <div>
            <p className="dashboard-kicker">Growth experiments</p>
            <h2 className="dashboard-title">Experimentation &amp; feature governance</h2>
            <p className="dashboard-subtitle">
              Track monetisation experiments and manage feature flags driving personalised pricing and offers.
            </p>
          </div>
          <BoltIcon className="h-8 w-8 text-emerald-500" aria-hidden="true" />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Active experiments</h3>
            {experiments.active?.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">Experiment</th>
                      <th scope="col" className="px-4 py-3">Primary metric</th>
                      <th scope="col" className="px-4 py-3">Lift</th>
                      <th scope="col" className="px-4 py-3">Confidence</th>
                      <th scope="col" className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {experiments.active.map((experiment) => {
                      const stopping = pending.stopping.has(experiment.id);
                      return (
                        <tr key={experiment.id} className="bg-white">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{experiment.name}</div>
                            <div className="text-xs text-slate-500">
                              Owner {experiment.owner ?? 'unassigned'} · Started {formatDate(experiment.startedAt)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{experiment.metric ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{formatPercent(experiment.lift)}</td>
                          <td className="px-4 py-3 text-slate-600">{formatPercent(experiment.confidence)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                              disabled={stopping}
                              onClick={() => handleStopExperiment(experiment)}
                            >
                              {stopping ? 'Stopping…' : 'End experiment'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No active experiments"
                description="Launch an experiment to optimise monetisation and pricing performance."
              />
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Feature flags</h3>
            {experiments.toggles?.length ? (
              <ul className="space-y-3">
                {experiments.toggles.map((toggle) => (
                  <li key={toggle.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{toggle.key}</p>
                        <p className="text-xs text-slate-500">Audience {toggle.audience}</p>
                      </div>
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                          toggle.state ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                        )}
                      >
                        {toggle.state ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {toggle.description ?? 'No description provided.'}
                      <div className="mt-1">Updated {formatDateTime(toggle.lastChangedAt)} by {toggle.lastChangedBy ?? 'system'}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No feature flags registered"
                description="Configure monetisation feature flags to orchestrate gradual rollouts."
              />
            )}
          </div>
        </div>
      </section>
      <section className="dashboard-section" aria-label="Pricing catalogues">
        <div className="flex items-start justify-between">
          <div>
            <p className="dashboard-kicker">Pricing &amp; packaging</p>
            <h2 className="dashboard-title">Pricing catalogues</h2>
            <p className="dashboard-subtitle">
              Review catalogue guardrails, live plans, and approval queues powering your monetisation strategy.
            </p>
          </div>
          <WalletIcon className="h-8 w-8 text-emerald-500" aria-hidden="true" />
        </div>

        <div className="mt-6 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Minimum price</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {pricing.guardrails?.minimumPriceCents !== undefined && pricing.guardrails.minimumPriceCents !== null
                ? formatCurrencyAmount(
                    pricing.guardrails.minimumPriceCents / 100,
                    pricing.catalogues?.[0]?.currency ?? currency,
                    { maximumFractionDigits: 2 }
                  )
                : '—'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Max discount</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {formatPercent(pricing.guardrails?.maximumDiscountPercent)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Custom invoices</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {pricing.guardrails?.allowCustomInvoices ? 'Allowed' : 'Restricted'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">CPI indexing</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {pricing.guardrails?.autoIndexByCpi ? 'Enabled' : 'Manual updates'}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {pricing.catalogues?.length ? (
            pricing.catalogues.map((catalogue) => (
              <div key={catalogue.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{catalogue.name}</h3>
                    <p className="text-xs text-slate-500">Currency {catalogue.currency}</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    {catalogue.plans?.length ?? 0} plans
                  </span>
                </div>
                {catalogue.plans?.length ? (
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-4 py-3">Plan</th>
                        <th scope="col" className="px-4 py-3">Cadence</th>
                        <th scope="col" className="px-4 py-3">Price</th>
                        <th scope="col" className="px-4 py-3">Subscribers</th>
                        <th scope="col" className="px-4 py-3">Attach rate</th>
                        <th scope="col" className="px-4 py-3">Trial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {catalogue.plans.map((plan) => (
                        <tr key={plan.id} className="bg-white">
                          <td className="px-4 py-3 font-semibold text-slate-900">{plan.name}</td>
                          <td className="px-4 py-3 text-slate-600">{plan.cadence}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {formatCurrencyAmount(plan.amount, plan.currency ?? catalogue.currency, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{plan.activeSubscribers ?? 0}</td>
                          <td className="px-4 py-3 text-slate-600">{formatPercent(plan.attachRate)}</td>
                          <td className="px-4 py-3 text-slate-600">{plan.trialDays ? `${plan.trialDays} days` : 'None'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4">
                    <EmptyState
                      title="No plans configured"
                      description="Create plans in this catalogue to price subscriptions, usage, or packaged bundles."
                    />
                  </div>
                )}
              </div>
            ))
          ) : (
            <EmptyState
              title="No pricing catalogues"
              description="Publish a pricing catalogue to unlock monetisation configuration and approvals."
            />
          )}
        </div>

        {pricing.pendingApprovals?.length ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700">Pending approvals</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {pricing.pendingApprovals.map((approval) => (
                <li key={approval.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="font-semibold text-slate-900">{approval.name}</p>
                    <p className="text-xs text-slate-500">Requested by {approval.requestedBy ?? 'unknown'} · {formatDateTime(approval.submittedAt)}</p>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-slate-500">{approval.changeType}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
