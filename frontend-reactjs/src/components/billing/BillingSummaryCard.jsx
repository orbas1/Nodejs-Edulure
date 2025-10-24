import PropTypes from 'prop-types';

import { formatCurrencyFromMinorUnits } from '../../utils/currency.js';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function StatusPill({ tone = 'info', children }) {
  const toneStyles = {
    info: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    danger: 'bg-rose-100 text-rose-700 border-rose-200'
  };

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${toneStyles[tone] ?? toneStyles.info}`}>
      {children}
    </span>
  );
}

StatusPill.propTypes = {
  tone: PropTypes.oneOf(['info', 'success', 'warning', 'danger']),
  children: PropTypes.node.isRequired
};

export default function BillingSummaryCard({
  overview,
  loading,
  error,
  onRefresh,
  onManageBilling,
  manageStatus,
  manageError
}) {
  const amountDue = overview?.amountDueCents
    ? formatCurrencyFromMinorUnits(overview.amountDueCents, overview.currency)
    : overview?.planAmount
      ? formatCurrencyFromMinorUnits(overview.planAmount, overview.currency)
      : null;

  const statusTone = overview?.status === 'active' ? 'success' : overview?.status === 'trialing' ? 'warning' : 'info';

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-emerald-400 to-blue-500" aria-hidden="true" />
      <div className="space-y-6 p-6 sm:p-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">Billing & subscription</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">{overview?.planName ?? 'Subscription overview'}</h2>
            <p className="mt-2 text-sm text-slate-600">
              Manage plan status, payment cadence, and open invoices without leaving your profile.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 text-right text-sm text-slate-600 lg:items-end">
            <StatusPill tone={statusTone}>{overview?.statusLabel ?? 'Status unknown'}</StatusPill>
            {overview?.seatUsage ? (
              <p className="text-xs text-slate-500">{overview.seatUsage.used} of {overview.seatUsage.total} seats in use</p>
            ) : null}
            {overview?.lastSyncedAt ? (
              <p className="text-xs text-slate-400">Synced {formatDate(overview.lastSyncedAt)}</p>
            ) : null}
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Amount due</dt>
            <dd className="text-lg font-semibold text-slate-900">{amountDue ?? '—'}</dd>
            <dd className="text-xs text-slate-500">{overview?.billingIntervalLabel ?? 'Next invoice pending'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Next payment</dt>
            <dd className="text-lg font-semibold text-slate-900">{formatDate(overview?.nextPaymentDueAt)}</dd>
            <dd className="text-xs text-slate-500">{overview?.collectionMethodLabel ?? 'Auto collection status pending'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Support tier</dt>
            <dd className="text-lg font-semibold text-slate-900">{overview?.supportTier ?? 'Standard support'}</dd>
            <dd className="text-xs text-slate-500">{overview?.supportNotes ?? 'Escalations route through customer success.'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Renewal</dt>
            <dd className="text-lg font-semibold text-slate-900">{overview?.renewalTerm ?? 'Auto-renews monthly'}</dd>
            <dd className="text-xs text-slate-500">{overview?.renewalNotes ?? 'Update renewal terms in the billing portal.'}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onManageBilling}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:bg-slate-400"
            disabled={loading || manageStatus === 'loading'}
          >
            {manageStatus === 'loading' ? 'Opening portal…' : 'Manage billing'}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          {manageStatus === 'error' ? (
            <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
              {manageError ?? 'Unable to launch billing portal. Try again or contact support.'}
            </span>
          ) : null}
          {manageStatus === 'success' ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              Billing portal opened in a new tab.
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

BillingSummaryCard.propTypes = {
  overview: PropTypes.shape({
    planName: PropTypes.string,
    planAmount: PropTypes.number,
    amountDueCents: PropTypes.number,
    currency: PropTypes.string,
    status: PropTypes.string,
    statusLabel: PropTypes.string,
    billingIntervalLabel: PropTypes.string,
    nextPaymentDueAt: PropTypes.string,
    collectionMethodLabel: PropTypes.string,
    supportTier: PropTypes.string,
    supportNotes: PropTypes.string,
    renewalTerm: PropTypes.string,
    renewalNotes: PropTypes.string,
    seatUsage: PropTypes.shape({
      used: PropTypes.number,
      total: PropTypes.number
    }),
    lastSyncedAt: PropTypes.string
  }),
  loading: PropTypes.bool,
  error: PropTypes.string,
  onRefresh: PropTypes.func.isRequired,
  onManageBilling: PropTypes.func.isRequired,
  manageStatus: PropTypes.oneOf(['idle', 'loading', 'success', 'error']),
  manageError: PropTypes.string
};

BillingSummaryCard.defaultProps = {
  overview: null,
  loading: false,
  error: null,
  manageStatus: 'idle',
  manageError: null
};
