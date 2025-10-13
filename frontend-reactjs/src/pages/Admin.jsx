import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

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
import { formatNumber } from './admin/utils.js';
import AdminApprovalsSection from './admin/sections/AdminApprovalsSection.jsx';
import AdminRevenueSection from './admin/sections/AdminRevenueSection.jsx';
import AdminTopCommunitiesSection from './admin/sections/AdminTopCommunitiesSection.jsx';
import AdminOperationsSection from './admin/sections/AdminOperationsSection.jsx';
import AdminUpcomingLaunchesSection from './admin/sections/AdminUpcomingLaunchesSection.jsx';
import AdminActivitySection from './admin/sections/AdminActivitySection.jsx';

export default function Admin() {
  const { session } = useAuth();
  const { isFeatureEnabled, getConfigValue, loading: runtimeLoading } = useRuntimeConfig();
  const { dashboards, loading, error, refresh } = useDashboard();
  const navigate = useNavigate();

  const adminConsoleEnabled = isFeatureEnabled('admin.operational-console');
  const escalationChannel = getConfigValue('admin.console.escalation-channel', '#admin-escalations');
  const isAdminUser = session?.user?.role === 'admin';

  const adminDataRaw = dashboards.admin ?? null;
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
  const approvalItems = adminDataRaw?.approvals?.items ?? [];
  const pendingApprovals = adminDataRaw?.approvals?.pendingCount ?? approvalItems.length;

  const revenueOverview = adminDataRaw?.revenue?.overview ?? null;
  const paymentHealth = adminDataRaw?.revenue?.paymentHealth ?? null;
  const topCommunities = adminDataRaw?.revenue?.topCommunities ?? [];

  const support = adminDataRaw?.operations?.support ?? {};
  const risk = adminDataRaw?.operations?.risk ?? {};
  const platform = adminDataRaw?.operations?.platform ?? {};
  const upcomingLaunches = adminDataRaw?.operations?.upcomingLaunches ?? [];

  const alerts = adminDataRaw?.activity?.alerts ?? [];
  const events = adminDataRaw?.activity?.events ?? [];
  const adminMetrics = adminDataRaw?.metrics ?? [];

  const revenueCards = useMemo(() => {
    const overview = revenueOverview ?? {};
    return [
      overview.netRevenue
        ? {
            label: 'Net revenue (30d)',
            value: overview.netRevenue,
            helper: overview.netRevenueChange
          }
        : null,
      overview.arr
        ? {
            label: 'Annual recurring revenue',
            value: overview.arr
          }
        : null,
      overview.mrr
        ? {
            label: 'Monthly recurring revenue',
            value: overview.mrr
          }
        : null,
      overview.captureRate
        ? {
            label: 'Capture rate',
            value: overview.captureRate
          }
        : null,
      overview.failedPayments !== undefined
        ? {
            label: 'Failed payments (30d)',
            value: formatNumber(overview.failedPayments)
          }
        : null,
      overview.refundsPending !== undefined
        ? {
            label: 'Refunds pending',
            value: formatNumber(overview.refundsPending)
          }
        : null
    ].filter(Boolean);
  }, [revenueOverview]);

  const paymentHealthBreakdown = useMemo(() => {
    const health = paymentHealth ?? {};
    return [
      health.succeeded !== undefined ? { label: 'Succeeded', value: formatNumber(health.succeeded) } : null,
      health.processing !== undefined ? { label: 'Processing', value: formatNumber(health.processing) } : null,
      health.requiresAction !== undefined
        ? { label: 'Requires action', value: formatNumber(health.requiresAction) }
        : null,
      health.failed !== undefined ? { label: 'Failed', value: formatNumber(health.failed) } : null
    ].filter(Boolean);
  }, [paymentHealth]);

  const supportStats = [
    support.backlog !== undefined ? { label: 'Open requests', value: formatNumber(support.backlog) } : null,
    support.pendingMemberships !== undefined
      ? { label: 'Pending memberships', value: formatNumber(support.pendingMemberships) }
      : null,
    support.followRequests !== undefined
      ? { label: 'Follow approvals', value: formatNumber(support.followRequests) }
      : null,
    support.avgResponseMinutes !== undefined
      ? { label: 'Avg. first response', value: `${formatNumber(support.avgResponseMinutes)} mins` }
      : null,
    support.dailyActiveMembers !== undefined
      ? { label: 'Daily active members', value: formatNumber(support.dailyActiveMembers) }
      : null
  ].filter(Boolean);

  const riskStats = [
    risk.payoutsProcessing !== undefined
      ? { label: 'Payouts processing', value: formatNumber(risk.payoutsProcessing) }
      : null,
    risk.failedPayments !== undefined
      ? { label: 'Failed payments', value: formatNumber(risk.failedPayments) }
      : null,
    risk.refundsPending !== undefined
      ? { label: 'Refund queue', value: formatNumber(risk.refundsPending) }
      : null,
    risk.alertsOpen !== undefined ? { label: 'Open alerts', value: formatNumber(risk.alertsOpen) } : null
  ].filter(Boolean);

  const platformStats = [
    platform.totalUsers !== undefined ? { label: 'Total users', value: formatNumber(platform.totalUsers) } : null,
    platform.newUsers30d !== undefined
      ? { label: 'New users (30d)', value: formatNumber(platform.newUsers30d) }
      : null,
    platform.newUsersChange
      ? {
          label: 'Momentum',
          value: platform.newUsersChange
        }
      : null,
    platform.communitiesLive !== undefined
      ? { label: 'Communities live', value: formatNumber(platform.communitiesLive) }
      : null,
    platform.instructors !== undefined
      ? { label: 'Instructors', value: formatNumber(platform.instructors) }
      : null
  ].filter(Boolean);

  const sectionNavigation = [
    { id: 'overview', label: 'Overview' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'communities', label: 'Communities' },
    { id: 'operations', label: 'Operations' },
    { id: 'launches', label: 'Launches' },
    { id: 'activity', label: 'Activity' }
  ];

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

  if (overallLoading || !adminDataRaw) {
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
    <div className="flex min-h-screen bg-slate-50/70">
      <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white/80 backdrop-blur lg:flex">
        <div className="border-b border-slate-200 px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Edulure</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Admin console</h2>
          <p className="mt-2 text-xs text-slate-500">
            Operational controls for administrators. Escalate incidents via{' '}
            <span className="font-semibold text-primary">{escalationChannel}</span>.
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-6">
          {sectionNavigation.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-primary/10 hover:text-primary"
            >
              <span>{item.label}</span>
              <span className="text-xs uppercase tracking-wide text-slate-400">Go</span>
            </a>
          ))}
        </nav>
        <div className="border-t border-slate-200 px-6 py-6">
          <button
            type="button"
            onClick={() => navigate('/dashboard/learner')}
            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
          >
            Return to dashboards
          </button>
        </div>
      </aside>
      <section className="flex-1 py-16">
        <div className="mx-auto w-full max-w-6xl px-6">
          <nav className="mb-8 flex gap-2 overflow-x-auto rounded-full border border-slate-200 bg-white/80 p-2 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm lg:hidden">
            {sectionNavigation.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded-full px-4 py-2 text-slate-600 transition hover:bg-primary/10 hover:text-primary"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex flex-col gap-10">
            <div className="space-y-6 rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
              <section id="overview" className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div className="space-y-2">
                    <h1 className="text-3xl font-semibold text-slate-900">Admin control center</h1>
                    <p className="text-sm text-slate-600">
                      Monitor revenue, approvals, and platform health in one workspace. Escalate incidents via{' '}
                      <span className="font-semibold text-primary">{escalationChannel}</span>.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
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
                <AdminStats metrics={adminMetrics} />
              </section>
            </div>

            <AdminApprovalsSection
              pendingCount={pendingApprovals}
              items={approvalItems}
              formatNumber={formatNumber}
              onRefresh={refresh}
            />

            <AdminRevenueSection
              revenueCards={revenueCards}
              paymentHealthBreakdown={paymentHealthBreakdown}
            />

            <AdminTopCommunitiesSection
              sectionId="communities"
              communities={topCommunities}
              formatNumber={formatNumber}
            />

            <AdminOperationsSection
              sectionId="operations"
              supportStats={supportStats}
              riskStats={riskStats}
              platformStats={platformStats}
            />

            <AdminUpcomingLaunchesSection sectionId="launches" launches={upcomingLaunches} />

            <AdminActivitySection
              alerts={alerts}
              events={events}
              onOpenAnalytics={() => navigate('/analytics')}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
