import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import AdminStats from '../components/AdminStats.jsx';
import DashboardStateMessage from '../components/dashboard/DashboardStateMessage.jsx';
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx';
import { useDashboard } from '../context/DashboardContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatNumber } from './admin/utils.js';
import AdminApprovalsSection from './admin/sections/AdminApprovalsSection.jsx';
import AdminRevenueSection from './admin/sections/AdminRevenueSection.jsx';
import AdminTopCommunitiesSection from './admin/sections/AdminTopCommunitiesSection.jsx';
import AdminOperationsSection from './admin/sections/AdminOperationsSection.jsx';
import AdminUpcomingLaunchesSection from './admin/sections/AdminUpcomingLaunchesSection.jsx';
import AdminActivitySection from './admin/sections/AdminActivitySection.jsx';
import AdminMonetizationSettingsSection from './admin/sections/AdminMonetizationSettingsSection.jsx';

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

function buildSupportStats(support) {
  const entries = [
    support.backlog !== undefined
      ? { label: 'Open requests', value: formatNumber(support.backlog) }
      : null,
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
  ];

  return entries.filter(Boolean);
}

function buildRiskStats(risk) {
  const entries = [
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
  ];

  return entries.filter(Boolean);
}

function buildPlatformStats(platform) {
  const entries = [
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
  ];

  return entries.filter(Boolean);
}

export default function Admin() {
  const { session } = useAuth();
  const { isFeatureEnabled, getConfigValue, loading: runtimeLoading } = useRuntimeConfig();
  const { dashboards, loading, error, refresh } = useDashboard();
  const navigate = useNavigate();

  const adminConsoleEnabled = isFeatureEnabled('admin.operational-console');
  const escalationChannel = getConfigValue('admin.console.escalation-channel', '#admin-escalations');
  const isAdminUser = session?.user?.role === 'admin';
  const token = session?.tokens?.accessToken ?? null;

  const adminData = dashboards.admin ?? EMPTY_OBJECT;
  const overallLoading = runtimeLoading || loading;

  const revenueOverview = adminData.revenue?.overview ?? null;
  const paymentHealth = adminData.revenue?.paymentHealth ?? null;
  const revenueCards = useMemo(() => {
    if (!revenueOverview) {
      return EMPTY_ARRAY;
    }

    return [
      revenueOverview.netRevenue
        ? {
            label: 'Net revenue (30d)',
            value: revenueOverview.netRevenue,
            helper: revenueOverview.netRevenueChange
          }
        : null,
      revenueOverview.arr ? { label: 'Annual recurring revenue', value: revenueOverview.arr } : null,
      revenueOverview.mrr ? { label: 'Monthly recurring revenue', value: revenueOverview.mrr } : null,
      revenueOverview.captureRate ? { label: 'Capture rate', value: revenueOverview.captureRate } : null,
      revenueOverview.failedPayments !== undefined
        ? { label: 'Failed payments (30d)', value: formatNumber(revenueOverview.failedPayments) }
        : null,
      revenueOverview.refundsPending !== undefined
        ? { label: 'Refunds pending', value: formatNumber(revenueOverview.refundsPending) }
        : null
    ].filter(Boolean);
  }, [revenueOverview]);

  const paymentHealthBreakdown = useMemo(() => {
    if (!paymentHealth) {
      return EMPTY_ARRAY;
    }

    return [
      paymentHealth.succeeded !== undefined
        ? { label: 'Succeeded', value: formatNumber(paymentHealth.succeeded) }
        : null,
      paymentHealth.processing !== undefined
        ? { label: 'Processing', value: formatNumber(paymentHealth.processing) }
        : null,
      paymentHealth.requiresAction !== undefined
        ? { label: 'Requires action', value: formatNumber(paymentHealth.requiresAction) }
        : null,
      paymentHealth.failed !== undefined
        ? { label: 'Failed', value: formatNumber(paymentHealth.failed) }
        : null
    ].filter(Boolean);
  }, [paymentHealth]);

  const approvals = adminData.approvals ?? EMPTY_OBJECT;
  const approvalItems = approvals.items ?? EMPTY_ARRAY;
  const pendingApprovals = approvals.pendingCount ?? approvalItems.length;

  const topCommunities = adminData.revenue?.topCommunities ?? EMPTY_ARRAY;

  const operations = adminData.operations ?? EMPTY_OBJECT;
  const support = operations.support ?? EMPTY_OBJECT;
  const risk = operations.risk ?? EMPTY_OBJECT;
  const platform = operations.platform ?? EMPTY_OBJECT;
  const upcomingLaunches = operations.upcomingLaunches ?? EMPTY_ARRAY;

  const supportStats = useMemo(() => buildSupportStats(support), [support]);
  const riskStats = useMemo(() => buildRiskStats(risk), [risk]);
  const platformStats = useMemo(() => buildPlatformStats(platform), [platform]);

  const activity = adminData.activity ?? EMPTY_OBJECT;
  const alerts = activity.alerts ?? EMPTY_ARRAY;
  const events = activity.events ?? EMPTY_ARRAY;

  const adminMetrics = adminData.metrics ?? EMPTY_ARRAY;
  const monetizationSettings = adminData.settings?.monetization ?? null;

  const sectionNavigation = useMemo(
    () => [
      { id: 'overview', label: 'Overview' },
      { id: 'approvals', label: 'Approvals' },
      { id: 'revenue', label: 'Revenue' },
      { id: 'monetization', label: 'Monetization' },
      { id: 'communities', label: 'Communities' },
      { id: 'operations', label: 'Operations' },
      { id: 'launches', label: 'Launches' },
      { id: 'activity', label: 'Activity' }
    ],
    []
  );

  if (!adminConsoleEnabled && !overallLoading) {
    return (
      <section className="bg-slate-50/70 py-24">
        <div className="mx-auto max-w-3xl space-y-6 px-6 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Admin console disabled</h1>
          <p className="text-sm text-slate-600">
            The operational console is currently disabled for your account. If you believe this is an
            error, contact the platform operations team via
            <span className="font-semibold text-primary"> {escalationChannel}</span>.
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
            Your account does not have administrator permissions. Please contact platform operations if you
            require elevated access.
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

  if (overallLoading || !dashboards.admin) {
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

  return (
    <div className="flex min-h-screen bg-slate-50/70">
      <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white/80 backdrop-blur lg:flex">
        <div className="border-b border-slate-200 px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Edulure</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Admin console</h2>
          <p className="mt-2 text-xs text-slate-500">
            Operational controls for administrators. Escalate incidents via
            <span className="font-semibold text-primary"> {escalationChannel}</span>.
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
                      Monitor revenue, approvals, and platform health in one workspace. Escalate incidents via
                      <span className="font-semibold text-primary"> {escalationChannel}</span>.
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
              onExport={() => {}}
            />

            <AdminMonetizationSettingsSection
              sectionId="monetization"
              settings={monetizationSettings}
              token={token}
              onSettingsUpdated={refresh}
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
