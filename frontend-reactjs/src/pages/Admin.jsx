import { useMemo } from 'react';
import AdminStats from '../components/AdminStats.jsx';
import DashboardStateMessage from '../components/dashboard/DashboardStateMessage.jsx';
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx';
import { useDashboard } from '../context/DashboardContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const numberFormatter = new Intl.NumberFormat('en-US');

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

function formatNumber(value) {
  if (value === null || value === undefined) return '0';
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return numberFormatter.format(numeric);
}

function getSeverityStyles(severity) {
  switch (severity) {
    case 'critical':
      return 'bg-rose-100 text-rose-700';
    case 'warning':
      return 'bg-amber-100 text-amber-700';
    case 'info':
      return 'bg-sky-100 text-sky-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export default function Admin() {
  const { session } = useAuth();
  const { isFeatureEnabled, getConfigValue, loading: runtimeLoading } = useRuntimeConfig();
  const { dashboards, loading, error, refresh } = useDashboard();

  const adminConsoleEnabled = isFeatureEnabled('admin.operational-console');
  const escalationChannel = getConfigValue('admin.console.escalation-channel', '#admin-escalations');
  const isAdminUser = session?.user?.role === 'admin';

  const adminData = dashboards.admin ?? null;
  const overallLoading = runtimeLoading || loading;

  const revenueCards = useMemo(() => {
    const overview = adminData?.revenue?.overview;
    if (!overview) {
      return EMPTY_ARRAY;
    }

    const cards = [];

    if (overview.netRevenue) {
      cards.push({
        label: 'Net revenue (30d)',
        value: overview.netRevenue,
        helper: overview.netRevenueChange
      });
    }

    if (overview.arr) {
      cards.push({
        label: 'Annual recurring revenue',
        value: overview.arr
      });
    }

    if (overview.mrr) {
      cards.push({
        label: 'Monthly recurring revenue',
        value: overview.mrr
      });
    }

    if (overview.captureRate) {
      cards.push({
        label: 'Capture rate',
        value: overview.captureRate
      });
    }

    if (overview.failedPayments !== undefined) {
      cards.push({
        label: 'Failed payments (30d)',
        value: formatNumber(overview.failedPayments)
      });
    }

    if (overview.refundsPending !== undefined) {
      cards.push({
        label: 'Refunds pending',
        value: formatNumber(overview.refundsPending)
      });
    }

    return cards;
  }, [adminData]);

  const paymentHealthBreakdown = useMemo(() => {
    const health = adminData?.revenue?.paymentHealth;
    if (!health) {
      return EMPTY_ARRAY;
    }

    const breakdown = [];

    if (health.succeeded !== undefined) {
      breakdown.push({ label: 'Succeeded', value: formatNumber(health.succeeded) });
    }

    if (health.processing !== undefined) {
      breakdown.push({ label: 'Processing', value: formatNumber(health.processing) });
    }

    if (health.requiresAction !== undefined) {
      breakdown.push({ label: 'Requires action', value: formatNumber(health.requiresAction) });
    }

    if (health.failed !== undefined) {
      breakdown.push({ label: 'Failed', value: formatNumber(health.failed) });
    }

    return breakdown;
  }, [adminData]);

  if (!adminConsoleEnabled && !overallLoading) {
    return (
      <section className="bg-slate-50/70 py-24">
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

  if (!isAdminUser && !overallLoading) {
    return (
      <section className="bg-slate-50/70 py-24">
        <div className="mx-auto max-w-3xl space-y-6 px-6 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Access restricted</h1>
          <p className="text-sm text-slate-600">
            Your account does not have administrator permissions. Please contact platform operations if you require elevated
            access.
          </p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-slate-50/70 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <DashboardStateMessage
            variant="error"
            title="We couldn't load the admin console"
            description={error.message ?? 'An unexpected error occurred while retrieving operational data.'}
            actionLabel="Retry"
            onAction={refresh}
          />
        </div>
      </section>
    );
  }

  if (overallLoading || !adminData) {
    return (
      <section className="bg-slate-50/70 py-24">
        <div className="mx-auto max-w-4xl px-6">
          <DashboardStateMessage
            variant="loading"
            title="Loading admin controls"
            description="Fetching revenue, approvals, and operational telemetry."
          />
        </div>
      </section>
    );
  }

  const approvals = adminData.approvals ?? EMPTY_OBJECT;
  const approvalItems = approvals.items ?? EMPTY_ARRAY;
  const pendingApprovals = approvals.pendingCount ?? approvalItems.length;

  const topCommunities = adminData.revenue?.topCommunities ?? EMPTY_ARRAY;

  const support = adminData.operations?.support ?? EMPTY_OBJECT;
  const risk = adminData.operations?.risk ?? EMPTY_OBJECT;
  const platform = adminData.operations?.platform ?? EMPTY_OBJECT;
  const upcomingLaunches = adminData.operations?.upcomingLaunches ?? EMPTY_ARRAY;

  const alerts = adminData.activity?.alerts ?? EMPTY_ARRAY;
  const events = adminData.activity?.events ?? EMPTY_ARRAY;

  const supportStats = [
    { label: 'Open requests', value: formatNumber(support.backlog ?? 0) },
    { label: 'Pending memberships', value: formatNumber(support.pendingMemberships ?? 0) },
    { label: 'Follow approvals', value: formatNumber(support.followRequests ?? 0) },
    support.avgResponseMinutes !== undefined
      ? { label: 'Avg. first response', value: `${formatNumber(support.avgResponseMinutes)} mins` }
      : null,
    support.dailyActiveMembers !== undefined
      ? { label: 'Daily active members', value: formatNumber(support.dailyActiveMembers) }
      : null
  ].filter(Boolean);

  const riskStats = [
    { label: 'Payouts processing', value: formatNumber(risk.payoutsProcessing ?? 0) },
    { label: 'Failed payments', value: formatNumber(risk.failedPayments ?? 0) },
    { label: 'Refund queue', value: formatNumber(risk.refundsPending ?? 0) },
    risk.alertsOpen !== undefined
      ? { label: 'Open alerts', value: formatNumber(risk.alertsOpen) }
      : null
  ].filter(Boolean);

  const platformStats = [
    platform.totalUsers ? { label: 'Total users', value: platform.totalUsers } : null,
    platform.newUsers30d ? { label: 'New users (30d)', value: platform.newUsers30d } : null,
    platform.newUsersChange
      ? {
          label: 'Momentum',
          value: platform.newUsersChange
        }
      : null,
    platform.communitiesLive ? { label: 'Communities live', value: platform.communitiesLive } : null,
    platform.instructors ? { label: 'Instructors', value: platform.instructors } : null
  ].filter(Boolean);

  return (
    <section className="bg-slate-50/70 py-16">
      <div className="mx-auto max-w-6xl space-y-10 px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-slate-900">Admin control center</h1>
            <p className="text-sm text-slate-600">
              Monitor revenue, approvals, and platform health in one workspace. Escalate incidents via{' '}
              <span className="font-semibold text-primary">{escalationChannel}</span>.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
            >
              Switch to instructor view
            </button>
            <button
              type="button"
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
            >
              Invite admin
            </button>
          </div>
        </div>

        <AdminStats metrics={adminData.metrics ?? []} />

        <section id="approvals" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Approvals queue</h2>
              <p className="text-sm text-slate-600">
                {pendingApprovals > 0
                  ? `${formatNumber(pendingApprovals)} items awaiting action across communities, payouts, and follow controls.`
                  : 'All approval workflows are clear right now.'}
              </p>
            </div>
            <button type="button" className="dashboard-pill">
              Refresh queue
            </button>
          </div>
          <div className="mt-6 space-y-4">
            {approvalItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                Nothing requires approval right now.
              </div>
            ) : (
              approvalItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs uppercase tracking-wide text-primary">{item.type}</p>
                    <p className="text-sm text-slate-600">{item.summary}</p>
                  </div>
                  <div className="flex flex-col items-start gap-3 md:items-end">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                        {item.status}
                      </span>
                      {item.submittedAt ? <span>{item.submittedAt}</span> : null}
                    </div>
                    {item.amount ? <p className="text-sm font-semibold text-slate-900">{item.amount}</p> : null}
                    <button type="button" className="dashboard-pill px-4 py-2 text-xs">
                      {item.action ?? 'Review'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section id="revenue" className="grid gap-6 xl:grid-cols-5">
          <div className="dashboard-section xl:col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Revenue performance</h2>
                <p className="text-sm text-slate-600">Recurring monetisation velocity across subscriptions and payments.</p>
              </div>
              <button type="button" className="dashboard-pill">
                Export report
              </button>
            </div>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {revenueCards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-900">{card.value}</dd>
                  {card.helper ? <p className="mt-1 text-xs text-slate-500">{card.helper}</p> : null}
                </div>
              ))}
            </dl>
          </div>
          <div className="dashboard-section xl:col-span-2">
            <h3 className="text-lg font-semibold text-slate-900">Payment health</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {paymentHealthBreakdown.length === 0 ? (
                <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                  No payment telemetry available yet.
                </li>
              ) : (
                paymentHealthBreakdown.map((entry) => (
                  <li key={entry.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <span>{entry.label}</span>
                    <span className="font-semibold text-slate-900">{entry.value}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Top performing communities</h2>
            <span className="text-xs uppercase tracking-wide text-slate-500">Last 30 days</span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600">
              <thead>
                <tr>
                  <th className="py-2 pr-6 font-semibold text-slate-500">Community</th>
                  <th className="py-2 pr-6 font-semibold text-slate-500">Revenue</th>
                  <th className="py-2 pr-6 font-semibold text-slate-500">Subscribers</th>
                  <th className="py-2 font-semibold text-slate-500">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topCommunities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-slate-500">
                      No monetised communities in the selected window.
                    </td>
                  </tr>
                ) : (
                  topCommunities.map((community) => (
                    <tr key={community.id}>
                      <td className="py-3 pr-6 font-semibold text-slate-900">{community.name}</td>
                      <td className="py-3 pr-6 text-slate-700">{community.revenue}</td>
                      <td className="py-3 pr-6 text-slate-700">{formatNumber(community.subscribers)}</td>
                      <td className="py-3 text-slate-700">{community.share}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="dashboard-section">
            <h3 className="text-lg font-semibold text-slate-900">Support load</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {supportStats.length === 0 ? (
                <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                  No pending support indicators.
                </li>
              ) : (
                supportStats.map((entry) => (
                  <li key={entry.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <span>{entry.label}</span>
                    <span className="font-semibold text-slate-900">{entry.value}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="dashboard-section">
            <h3 className="text-lg font-semibold text-slate-900">Risk &amp; trust</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {riskStats.length === 0 ? (
                <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                  No risk signals detected.
                </li>
              ) : (
                riskStats.map((entry) => (
                  <li key={entry.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <span>{entry.label}</span>
                    <span className="font-semibold text-slate-900">{entry.value}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="dashboard-section">
            <h3 className="text-lg font-semibold text-slate-900">Platform snapshot</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {platformStats.length === 0 ? (
                <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                  No aggregate platform metrics available.
                </li>
              ) : (
                platformStats.map((entry) => (
                  <li key={entry.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <span>{entry.label}</span>
                    <span className="font-semibold text-slate-900">{entry.value}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Upcoming launches</h3>
            <span className="text-xs uppercase tracking-wide text-slate-500">Next 14 days</span>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {upcomingLaunches.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                No live classrooms or launches scheduled in the next two weeks.
              </li>
            ) : (
              upcomingLaunches.map((launch) => (
                <li
                  key={launch.id}
                  className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{launch.title}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{launch.community}</p>
                  </div>
                  <div className="text-xs text-slate-500">
                    <p className="font-semibold text-slate-900">{launch.startAt}</p>
                    <p>{launch.startIn}</p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section id="activity" className="grid gap-6 lg:grid-cols-2">
          <div className="dashboard-section">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Operational alerts</h3>
              <button type="button" className="dashboard-pill">
                Open analytics
              </button>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {alerts.length === 0 ? (
                <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                  No active alerts. All systems nominal.
                </li>
              ) : (
                alerts.map((alert) => (
                  <li key={alert.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getSeverityStyles(alert.severity)}`}>
                        {alert.severity ?? 'info'}
                      </span>
                      <span className="text-xs text-slate-500">{alert.detectedLabel}</span>
                    </div>
                    <p className="mt-3 font-semibold text-slate-900">{alert.message}</p>
                    {alert.resolvedLabel ? (
                      <p className="mt-1 text-xs text-slate-500">Resolved {alert.resolvedLabel}</p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="dashboard-section">
            <h3 className="text-lg font-semibold text-slate-900">Latest operational activity</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {events.length === 0 ? (
                <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                  No recent events captured.
                </li>
              ) : (
                events.map((event) => (
                  <li key={event.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="uppercase tracking-wide">{event.entity}</span>
                      <span>{event.occurredLabel}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{event.summary}</p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>
      </div>
    </section>
  );
}
