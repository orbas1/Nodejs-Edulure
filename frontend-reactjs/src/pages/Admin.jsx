import { useMemo } from 'react';

import AdminStats from '../components/AdminStats.jsx';
import DashboardStateMessage from '../components/dashboard/DashboardStateMessage.jsx';
import { useDashboard } from '../context/DashboardContext.jsx';
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx';

function formatCurrency(amountCents, currency = 'USD') {
  const amount = Number(amountCents ?? 0) / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  } catch (_error) {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDelta(deltaPercent) {
  if (deltaPercent === null || deltaPercent === undefined) return 'Baseline period';
  const value = Math.abs(Number(deltaPercent ?? 0)).toFixed(1);
  return `${deltaPercent >= 0 ? '+' : '−'}${value}% vs prior 30d`;
}

const severityStyles = {
  critical: 'bg-rose-100 text-rose-700 border-rose-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  info: 'bg-sky-100 text-sky-700 border-sky-200',
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200'
};

export default function Admin() {
  const { dashboards, loading, error, refresh } = useDashboard();
  const { isFeatureEnabled, getConfigValue, loading: configLoading } = useRuntimeConfig();

  const featureEnabled = isFeatureEnabled('admin.operational-console');
  const escalationChannel = getConfigValue('admin.console.escalation-channel', '#admin-escalations');

  const adminDashboard = dashboards.admin ?? null;
  const metrics = adminDashboard?.metrics ?? [];
  const approvals = adminDashboard?.approvals ?? { totals: {}, queue: [] };
  const revenue = adminDashboard?.revenue ?? { totals: {}, perCommunity: [], ledgerTrend: [] };
  const operations = adminDashboard?.operations ?? {
    alerts: { unresolvedCount: 0, items: [] },
    activity: [],
    sessions: { active: 0, expiringSoon: 0, horizonHours: 48 }
  };

  const revenueTotals = revenue.totals ?? {};
  const primaryCurrency = revenueTotals.currency ?? 'USD';

  const recentLedgerTrend = useMemo(() => {
    const entries = Array.isArray(revenue.ledgerTrend) ? revenue.ledgerTrend : [];
    return entries
      .slice(-10)
      .reverse()
      .map((entry) => ({
        date: entry.date,
        amount: formatCurrency(entry.amountCents, entry.currency ?? primaryCurrency)
      }));
  }, [revenue.ledgerTrend, primaryCurrency]);

  const featureLoading = configLoading || loading;

  if (!featureLoading && !featureEnabled) {
    return (
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-3xl space-y-6 px-6 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Admin console disabled</h1>
          <p className="text-sm text-slate-600">
            The operational console is currently disabled for your account. If you believe this is an error, contact the
            platform operations team via <span className="font-semibold text-primary">{escalationChannel}</span> or raise a
            ticket with support.
          </p>
        </div>
      </section>
    );
  }

  if (loading && !adminDashboard) {
    return (
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <DashboardStateMessage
            variant="loading"
            title="Preparing your admin console"
            description="We are syncing financial, approvals, and operations data."
          />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <DashboardStateMessage
            variant="error"
            title="We couldn't load the admin console"
            description={error.message ?? 'An unexpected error occurred while retrieving admin data.'}
            actionLabel="Retry"
            onAction={() => refresh?.()}
          />
        </div>
      </section>
    );
  }

  if (!adminDashboard) {
    return (
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <DashboardStateMessage
            title="Admin data unavailable"
            description="Your account does not have access to the admin telemetry yet. Request elevation or try again later."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-6xl space-y-10 px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Admin control center</h1>
            <p className="mt-3 text-sm text-slate-600">
              Monitor revenue, unblock approvals, and keep member operations running without leaving this console.
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="/dashboard/instructor"
              className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary-dark"
            >
              Switch to instructor view
            </a>
            <button
              type="button"
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
            >
              Invite admin
            </button>
          </div>
        </div>

        <AdminStats metrics={metrics} />

        <div className="space-y-8" id="approvals">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Approvals queue</h2>
              <p className="text-sm text-slate-600">Escalations waiting for triage across memberships, payouts, and social graph.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="dashboard-chip">
                Pending <span className="ml-1 font-semibold text-slate-900">{approvals.totals?.pending ?? 0}</span>
              </span>
              <span className="dashboard-chip">
                Memberships <span className="ml-1 font-semibold text-slate-900">{approvals.totals?.memberships ?? 0}</span>
              </span>
              <span className="dashboard-chip">
                Follow requests <span className="ml-1 font-semibold text-slate-900">{approvals.totals?.follows ?? 0}</span>
              </span>
              <span className="dashboard-chip">
                Payouts <span className="ml-1 font-semibold text-slate-900">{approvals.totals?.payouts ?? 0}</span>
              </span>
            </div>
          </div>
          <div className="dashboard-panel space-y-4">
            {approvals.queue.length === 0 ? (
              <p className="text-sm text-slate-500">No pending approvals. Great job keeping the queue clean.</p>
            ) : (
              approvals.queue.map((item) => (
                <div key={item.id} className="dashboard-card flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs uppercase tracking-wide text-primary">{item.type}</p>
                    <p className="mt-2 text-sm text-slate-500">{item.summary}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <span className="dashboard-chip">
                      {item.status} · {item.submittedAt}
                    </span>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary-dark"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-8" id="revenue">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Revenue insights</h2>
              <p className="text-sm text-slate-600">See how subscriptions, cohorts, and affiliate flows are performing.</p>
            </div>
            <span className="dashboard-chip">Primary currency · {primaryCurrency}</span>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="dashboard-panel space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Revenue processed (30d)</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {formatCurrency(revenueTotals.processedCents, primaryCurrency)}
                  </p>
                  <p className="text-xs text-slate-500">{formatDelta(revenueTotals.deltaPercent)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Monthly recurring revenue</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatCurrency(revenueTotals.monthlyRecurringCents, primaryCurrency)}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm text-slate-600">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-0 py-2 font-semibold">Community</th>
                      <th className="px-0 py-2 font-semibold">Subscribers</th>
                      <th className="px-0 py-2 font-semibold">MRR</th>
                      <th className="px-0 py-2 font-semibold">Renewals 30d</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {revenue.perCommunity.map((community) => (
                      <tr key={community.communityId}>
                        <td className="px-0 py-2 text-slate-900">{community.communityName}</td>
                        <td className="px-0 py-2">{community.activeSubscribers}</td>
                        <td className="px-0 py-2">
                          {formatCurrency(community.monthlyRecurringCents, community.currency ?? primaryCurrency)}
                        </td>
                        <td className="px-0 py-2">{community.renewalsDue}</td>
                      </tr>
                    ))}
                    {revenue.perCommunity.length === 0 && (
                      <tr>
                        <td className="px-0 py-3 text-slate-500" colSpan={4}>
                          No subscription data available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="dashboard-panel space-y-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Revenue trend</p>
              {recentLedgerTrend.length === 0 ? (
                <p className="text-sm text-slate-500">No ledger entries recorded in the selected period.</p>
              ) : (
                <ul className="space-y-3">
                  {recentLedgerTrend.map((entry) => (
                    <li key={entry.date} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      <span className="font-medium text-slate-700">{entry.date}</span>
                      <span className="text-slate-600">{entry.amount}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8" id="operations">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Operational signals</h2>
              <p className="text-sm text-slate-600">Stay ahead of incidents, alerts, and session health.</p>
            </div>
            <span className="dashboard-chip">
              Active sessions <span className="ml-1 font-semibold text-slate-900">{operations.sessions?.active ?? 0}</span>
            </span>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="dashboard-panel space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-slate-500">Alerts</p>
                <span className="dashboard-chip">
                  Unresolved {operations.alerts?.unresolvedCount ?? 0}
                </span>
              </div>
              {operations.alerts?.items?.length ? (
                <ul className="space-y-3">
                  {operations.alerts.items.map((alert) => (
                    <li
                      key={alert.id}
                      className={`dashboard-card flex flex-col gap-2 border ${
                        severityStyles[alert.severity] ?? 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">{alert.message}</span>
                        <span className="text-xs text-slate-500">{alert.age}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="uppercase tracking-wide">{alert.severity}</span>
                        {alert.code && <span className="dashboard-chip">{alert.code}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No active alerts. Systems are within thresholds.</p>
              )}
            </div>
            <div className="dashboard-panel space-y-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Recent activity</p>
              {operations.activity?.length ? (
                <ul className="space-y-3">
                  {operations.activity.slice(0, 6).map((entry) => (
                    <li key={entry.id} className="dashboard-card-muted p-4">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{entry.actor}</span>
                        <span>{entry.age}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{entry.description}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No notable activity recorded today.</p>
              )}
            </div>
            <div className="dashboard-panel lg:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Session health</p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <span className="dashboard-chip">
                  Active sessions <span className="ml-1 font-semibold text-slate-900">{operations.sessions?.active ?? 0}</span>
                </span>
                <span className="dashboard-chip">
                  Expiring ≤{operations.sessions?.horizonHours ?? 48}h{' '}
                  <span className="ml-1 font-semibold text-slate-900">{operations.sessions?.expiringSoon ?? 0}</span>
                </span>
                <span className="text-xs text-slate-500">
                  Sessions include learner, instructor, and admin tokens that remain active.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
