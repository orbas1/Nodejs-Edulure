import { useMemo } from 'react';

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

export default function Admin() {
  const { session } = useAuth();
  const { isFeatureEnabled, getConfigValue, loading: runtimeLoading } = useRuntimeConfig();
  const { dashboards, loading, error, refresh } = useDashboard();

  const adminConsoleEnabled = isFeatureEnabled('admin.operational-console');
  const escalationChannel = getConfigValue('admin.console.escalation-channel', '#admin-escalations');
  const isAdminUser = session?.user?.role === 'admin';

  const adminDataRaw = dashboards.admin ?? null;
  const overallLoading = runtimeLoading || loading;

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

        <AdminStats metrics={adminMetrics} />

        <AdminApprovalsSection
          pendingCount={pendingApprovals}
          items={approvalItems}
          formatNumber={formatNumber}
          onRefresh={refresh}
        />

        <AdminRevenueSection revenueCards={revenueCards} paymentHealthBreakdown={paymentHealthBreakdown} />

        <AdminTopCommunitiesSection communities={topCommunities} formatNumber={formatNumber} />

        <AdminOperationsSection
          supportStats={supportStats}
          riskStats={riskStats}
          platformStats={platformStats}
        />

        <AdminUpcomingLaunchesSection launches={upcomingLaunches} />

        <AdminActivitySection alerts={alerts} events={events} />
      </div>
    </section>
  );
}
