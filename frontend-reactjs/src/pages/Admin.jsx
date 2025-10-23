import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { fetchRevenueSavedViews } from '../api/analyticsApi.js';
import { reviewVerificationCase } from '../api/verificationApi.js';
import AdminStats from '../components/AdminStats.jsx';
import AdminHelpLinks from '../components/admin/AdminHelpLinks.jsx';
import AdminTaskList from '../components/admin/AdminTaskList.jsx';
import DashboardStateMessage from '../components/dashboard/DashboardStateMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDashboard } from '../context/DashboardContext.jsx';
import { useRuntimeConfig } from '../context/RuntimeConfigContext.jsx';
import AdminShell from '../layouts/AdminShell.jsx';
import AdminApprovalsSection from './admin/sections/AdminApprovalsSection.jsx';
import AdminComplianceSection from './admin/sections/AdminComplianceSection.jsx';
import AdminMonetizationSettingsSection from './admin/sections/AdminMonetizationSettingsSection.jsx';
import AdminProfileSettingsSection from './admin/sections/AdminProfileSettingsSection.jsx';
import AdminPaymentSettingsSection from './admin/sections/AdminPaymentSettingsSection.jsx';
import AdminEmailSettingsSection from './admin/sections/AdminEmailSettingsSection.jsx';
import AdminSecuritySettingsSection from './admin/sections/AdminSecuritySettingsSection.jsx';
import AdminFinanceCommissionSection from './admin/sections/AdminFinanceCommissionSection.jsx';
import AdminOperationsSection from './admin/sections/AdminOperationsSection.jsx';
import AdminPolicyHubSection from './admin/sections/AdminPolicyHubSection.jsx';
import AdminRevenueSection from './admin/sections/AdminRevenueSection.jsx';
import AdminTopCommunitiesSection from './admin/sections/AdminTopCommunitiesSection.jsx';
import AdminUpcomingLaunchesSection from './admin/sections/AdminUpcomingLaunchesSection.jsx';
import AdminActivitySection from './admin/sections/AdminActivitySection.jsx';
import AdminToolsSection from './admin/sections/AdminToolsSection.jsx';
import AdminBlogSection from './admin/sections/AdminBlogSection.jsx';
import AdminCoursesSection from './admin/sections/AdminCoursesSection.jsx';
import AdminEbooksSection from './admin/sections/AdminEbooksSection.jsx';
import AdminCalendarSection from './admin/sections/AdminCalendarSection.jsx';
import AdminBookingsSection from './admin/sections/AdminBookingsSection.jsx';
import AdminGrowthSection from './admin/sections/AdminGrowthSection.jsx';
import AdminRevenueManagementSection from './admin/sections/AdminRevenueManagementSection.jsx';
import AdminAdsManagementSection from './admin/sections/AdminAdsManagementSection.jsx';
import { ensureArray, formatDateTime, formatNumber, formatRelativeTime } from './admin/utils.js';

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

const NAV_GROUP_TEMPLATE = Object.freeze([
  {
    label: 'Control centre',
    items: [
      { id: 'overview', label: 'Overview', helperKey: 'overview' },
      { id: 'approvals', label: 'Approvals', helperKey: 'approvals' },
      { id: 'operations', label: 'Operations', helperKey: 'operations' },
      { id: 'activity', label: 'Activity', helperKey: 'activity' }
    ]
  },
  {
    label: 'Revenue & monetisation',
    items: [
      { id: 'revenue', label: 'Revenue', helperKey: 'revenue' },
      { id: 'revenue-management', label: 'Revenue Ops', helperKey: 'revenue-management' },
      { id: 'ads-management', label: 'Ads', helperKey: 'ads-management' },
      { id: 'monetization', label: 'Monetization', helperKey: 'monetization' }
    ]
  },
  {
    label: 'Learning surfaces',
    items: [
      { id: 'courses', label: 'Courses', helperKey: 'courses' },
      { id: 'ebooks', label: 'E-books', helperKey: 'ebooks' },
      { id: 'communities', label: 'Communities', helperKey: 'communities' },
      { id: 'growth', label: 'Growth', helperKey: 'growth' }
    ]
  },
  {
    label: 'Scheduling & launches',
    items: [
      { id: 'calendar', label: 'Calendar', helperKey: 'calendar' },
      { id: 'bookings', label: 'Bookings', helperKey: 'bookings' },
      { id: 'launches', label: 'Launches', helperKey: 'launches' }
    ]
  },
  {
    label: 'Settings & compliance',
    items: [
      { id: 'profile-settings', label: 'Admin profile', helperKey: 'profile-settings' },
      { id: 'payment-settings', label: 'Payments', helperKey: 'payment-settings' },
      { id: 'email-settings', label: 'Emails', helperKey: 'email-settings' },
      { id: 'security-settings', label: '2FA', helperKey: 'security-settings' },
      { id: 'finance-settings', label: 'Finance', helperKey: 'finance-settings' },
      { id: 'compliance', label: 'Compliance', helperKey: 'compliance' },
      { id: 'policies', label: 'Policies', helperKey: 'policies' }
    ]
  },
  {
    label: 'Content & tooling',
    items: [
      { id: 'blog', label: 'Blog', helperKey: 'blog' },
      { id: 'tools', label: 'Tools', helperKey: 'tools' }
    ]
  }
]);

const SECTION_HELP_FALLBACK = Object.freeze({
  overview: 'Control dashboard metrics and quick health checks.',
  approvals: 'Review pending instructor and community onboarding requests.',
  revenue: 'Track net revenue, ARR, and payment health signals.',
  'revenue-management': 'Operationalise billing workflows and payouts.',
  'ads-management': 'Monitor ad pacing and sponsorship inventory.',
  monetization: 'Configure pricing, bundles, and monetisation toggles.',
  courses: 'Curate course catalogue performance and QA new launches.',
  ebooks: 'Manage ebook releases, pricing, and inventory.',
  calendar: 'Oversee live sessions, workshops, and office hours.',
  bookings: 'Coordinate concierge and coaching bookings.',
  growth: 'Inspect acquisition experiments and growth drivers.',
  'profile-settings': 'Maintain organisation profile and leadership contacts.',
  'payment-settings': 'Manage processors, settlement accounts, and tax IDs.',
  'email-settings': 'Configure transactional and marketing email cadences.',
  'security-settings': 'Administer MFA, session policies, and security posture.',
  'finance-settings': 'Govern finance alerts, commission rules, and escalation.',
  communities: 'Analyse community revenue performance and member health.',
  tools: 'Access admin tools, integrations, and automation.',
  operations: 'Track support workload, risk, and platform metrics.',
  blog: 'Publish platform updates and announcement copy.',
  compliance: 'Monitor compliance queues, audits, and frameworks.',
  policies: 'Review policy status, owners, and SLA commitments.',
  launches: 'Coordinate upcoming launches and release train readiness.',
  activity: 'Audit alerts and operational events to spot anomalies.'
});

function normaliseSlaHours(value) {
  const numeric = Number.parseInt(value, 10);
  if (Number.isNaN(numeric) || numeric <= 0) {
    return 24;
  }
  return numeric;
}

function createCsvCell(value) {
  if (value === null || value === undefined) {
    return '""';
  }
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

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
  const navigate = useNavigate();
  const { session } = useAuth();
  const { dashboards, loading, error, refresh, roles = EMPTY_ARRAY, setActiveRole } = useDashboard();
  const { isFeatureEnabled, getConfigValue, loading: runtimeLoading } = useRuntimeConfig();

  const adminConsoleEnabled = isFeatureEnabled('admin.operational-console');
  const escalationChannel = getConfigValue('admin.console.escalation-channel', '#admin-escalations');
  const inviteLink = getConfigValue('admin.console.invite-link', 'mailto:operations@edulure.com');
  const policyHubUrl = getConfigValue('admin.console.policy-hub-url', '/policies');
  const policyOwner = getConfigValue('admin.console.policy-owner', 'Trust & Safety');
  const policyContact = getConfigValue('admin.console.policy-contact', 'mailto:compliance@edulure.com');
  const policyStatus = getConfigValue('admin.console.policy-status', 'Operational');
  const policySlaHours = normaliseSlaHours(getConfigValue('admin.console.policy-sla-hours', '24'));
  const policyLastReviewedRaw = getConfigValue('admin.console.policy-last-reviewed', null);

  const adminDataRaw = dashboards.admin ?? null;
  const adminData = useMemo(() => adminDataRaw ?? EMPTY_OBJECT, [adminDataRaw]);
  const overallLoading = runtimeLoading || loading;
  const isAdminUser = session?.user?.role === 'admin';
  const token = session?.tokens?.accessToken ?? null;

  const [savedViews, setSavedViews] = useState([]);
  const [selectedSavedViewId, setSelectedSavedViewId] = useState(null);
  const [savedViewsLoading, setSavedViewsLoading] = useState(false);
  const [savedViewsError, setSavedViewsError] = useState(null);

  const adminMetrics = adminData.metrics ?? EMPTY_ARRAY;

  const approvals = adminData.approvals ?? EMPTY_OBJECT;
  const approvalItems = approvals.items ?? EMPTY_ARRAY;
  const pendingApprovals = approvals.pendingCount ?? approvalItems.length;

  const revenueOverview = adminData.revenue?.overview ?? null;
  const paymentHealth = adminData.revenue?.paymentHealth ?? null;
  const topCommunities = adminData.revenue?.topCommunities ?? EMPTY_ARRAY;

  const monetizationSettings = adminData.settings?.monetization ?? null;
  const adminProfileSettings = adminData.settings?.profile ?? null;
  const paymentSettings = adminData.settings?.payments ?? null;
  const emailSettings = adminData.settings?.emails ?? null;
  const securitySettings = adminData.settings?.security ?? null;
  const financeSettings = adminData.settings?.finance ?? null;
  const blog = adminData.blog ?? null;

  const operations = adminData.operations ?? EMPTY_OBJECT;
  const support = operations.support ?? EMPTY_OBJECT;
  const risk = operations.risk ?? EMPTY_OBJECT;
  const platform = operations.platform ?? EMPTY_OBJECT;
  const upcomingLaunches = operations.upcomingLaunches ?? EMPTY_ARRAY;
  const tools = adminData.tools ?? EMPTY_OBJECT;

  useEffect(() => {
    if (!token || !isAdminUser) {
      setSavedViews([]);
      setSelectedSavedViewId(null);
      return undefined;
    }

    if (!dashboards.admin) {
      return undefined;
    }

    let active = true;
    setSavedViewsLoading(true);
    setSavedViewsError(null);

    fetchRevenueSavedViews({ range: '30d', token })
      .then((payload) => {
        if (!active) return;
        const data = payload?.data ?? payload;
        const views = ensureArray(data?.views);
        setSavedViews(views);
        setSelectedSavedViewId((prev) => {
          if (prev && views.some((view) => view.id === prev)) {
            return prev;
          }
          return views[0]?.id ?? null;
        });
      })
      .catch((error) => {
        if (!active) return;
        setSavedViewsError(error);
        setSavedViews([]);
        setSelectedSavedViewId(null);
      })
      .finally(() => {
        if (active) {
          setSavedViewsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token, isAdminUser, dashboards.admin]);

  const compliance = adminData.compliance ?? EMPTY_OBJECT;
  const complianceMetrics = compliance.metrics ?? EMPTY_ARRAY;
  const complianceQueue = compliance.queue ?? EMPTY_ARRAY;
  const complianceSlaBreaches = compliance.slaBreaches ?? 0;
  const complianceManualReview = compliance.manualReviewQueue ?? 0;
  const complianceGdprProfile = compliance.gdpr ?? EMPTY_OBJECT;
  const complianceAudits = compliance.audits ?? EMPTY_OBJECT;
  const complianceAttestations = compliance.attestations ?? EMPTY_OBJECT;
  const complianceFrameworks = compliance.frameworks ?? EMPTY_ARRAY;
  const complianceRisk = compliance.risk ?? EMPTY_OBJECT;
  const complianceIncidentResponse = compliance.incidentResponse ?? EMPTY_OBJECT;
  const complianceEvidence = compliance.evidence ?? EMPTY_OBJECT;

  const activity = adminData.activity ?? EMPTY_OBJECT;
  const alerts = activity.alerts ?? EMPTY_ARRAY;
  const events = activity.events ?? EMPTY_ARRAY;

  const sectionHelperOverrides = useMemo(() => {
    const helpers =
      adminData?.metadata?.sectionHelpers ??
      adminData?.meta?.sectionHelpers ??
      adminData?.copy?.sectionHelpers ??
      adminData?.sectionHelpers ??
      {};
    return helpers || {};
  }, [adminData]);

  const navGroups = useMemo(
    () =>
      NAV_GROUP_TEMPLATE.map((group) => ({
        label: group.label,
        items: group.items.map((item) => ({
          id: item.id,
          label: item.label,
          helper:
            sectionHelperOverrides[item.helperKey ?? item.id] ??
            sectionHelperOverrides[item.id] ??
            SECTION_HELP_FALLBACK[item.helperKey ?? item.id] ??
            null
        }))
      })),
    [sectionHelperOverrides]
  );

  const adminTasks = useMemo(() => {
    const tasks = [];
    if (pendingApprovals > 0) {
      tasks.push({
        id: 'task-approvals',
        label: `Review ${formatNumber(pendingApprovals)} pending approvals`,
        helper: 'Keep instructors and community requests moving quickly.',
        sectionId: 'approvals',
        severity: 'warning'
      });
    }

    const requiresAction = Number(paymentHealth?.requiresAction ?? 0);
    if (requiresAction > 0) {
      tasks.push({
        id: 'task-payment-retries',
        label: `Follow up on ${formatNumber(requiresAction)} payments requiring action`,
        helper: 'Escalate billing issues before retries expire.',
        sectionId: 'revenue',
        severity: 'warning'
      });
    }

    const openAlerts = Number(risk.alertsOpen ?? 0);
    if (openAlerts > 0) {
      tasks.push({
        id: 'task-risk-alerts',
        label: `Investigate ${formatNumber(openAlerts)} open risk alerts`,
        helper: 'Review trust & safety telemetry to prevent incidents.',
        sectionId: 'operations',
        severity: 'danger'
      });
    }

    if (complianceSlaBreaches > 0) {
      tasks.push({
        id: 'task-compliance-breaches',
        label: `Resolve ${formatNumber(complianceSlaBreaches)} compliance SLA breaches`,
        helper: 'Prioritise DSAR and KYC escalations to stay audit ready.',
        sectionId: 'compliance',
        severity: 'danger'
      });
    }

    const launchCandidates = ensureArray(upcomingLaunches);
    const nextLaunch =
      launchCandidates.find((launch) => launch?.startAt || launch?.windowStart || launch?.scheduledFor) ??
      launchCandidates[0];
    if (nextLaunch) {
      const startAt = nextLaunch.startAt ?? nextLaunch.windowStart ?? nextLaunch.scheduledFor ?? null;
      tasks.push({
        id: 'task-next-launch',
        label: `Prepare launch ${nextLaunch.title ?? nextLaunch.name ?? 'rollout'}`,
        helper: startAt ? `Kick-off ${formatDateTime(startAt)}` : 'Review readiness checklist.',
        sectionId: 'launches',
        severity: 'info'
      });
    }

    return tasks.slice(0, 5);
  }, [
    pendingApprovals,
    paymentHealth?.requiresAction,
    risk.alertsOpen,
    complianceSlaBreaches,
    upcomingLaunches
  ]);

  const helpLinks = useMemo(() => {
    const links = ensureArray(
      adminData?.helpLinks ?? adminData?.documentation?.operations ?? adminData?.operations?.helpLinks
    );
    if (links.length > 0) {
      return links.map((link, index) => ({
        id: link.id ?? `help-${index}`,
        title: link.title ?? link.name ?? 'Operations guide',
        description: link.description ?? link.summary ?? null,
        href: link.href ?? link.url ?? '#'
      }));
    }

    return [
      {
        id: 'incidents',
        title: 'Incident escalation runbook',
        description: 'Triage, escalate, and resolve incidents with clear SLAs.',
        href: '/docs/operations/incident-escalation.md'
      },
      {
        id: 'revenue-reconciliation',
        title: 'Revenue reconciliation checklist',
        description: 'Reconcile payouts, invoices, and refunds before finance close.',
        href: '/docs/operations/revenue-reconciliation.md'
      },
      {
        id: 'integrations',
        title: 'Integrations hub guide',
        description: 'Manage API keys, webhooks, and partner apps safely.',
        href: '/docs/operations/integrations-hub.md'
      }
    ];
  }, [adminData]);

  const policyLastReviewed = useMemo(() => {
    if (!policyLastReviewedRaw) {
      return 'Awaiting review';
    }
    const relative = formatRelativeTime(policyLastReviewedRaw);
    const exact = formatDateTime(policyLastReviewedRaw);
    if (relative && relative !== exact) {
      return `${relative} (${exact})`;
    }
    return exact || relative;
  }, [policyLastReviewedRaw]);

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
      revenueOverview.arr
        ? {
            label: 'Annual recurring revenue',
            value: revenueOverview.arr
          }
        : null,
      revenueOverview.mrr
        ? {
            label: 'Monthly recurring revenue',
            value: revenueOverview.mrr
          }
        : null,
      revenueOverview.captureRate
        ? {
            label: 'Capture rate',
            value: revenueOverview.captureRate
          }
        : null,
      revenueOverview.failedPayments !== undefined
        ? {
            label: 'Failed payments (30d)',
            value: formatNumber(revenueOverview.failedPayments)
          }
        : null,
      revenueOverview.refundsPending !== undefined
        ? {
            label: 'Refunds pending',
            value: formatNumber(revenueOverview.refundsPending)
          }
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

  const supportStats = useMemo(() => buildSupportStats(support), [support]);
  const riskStats = useMemo(() => buildRiskStats(risk), [risk]);
  const platformStats = useMemo(() => buildPlatformStats(platform), [platform]);

  const handleVerificationReview = useCallback(
    async (item, payload) => {
      if (!token) {
        throw new Error('Authentication token missing');
      }
      await reviewVerificationCase({
        token,
        verificationId: item.id,
        body: payload
      });
      if (refresh) {
        await refresh();
      }
    },
    [token, refresh]
  );

  const handleRevenueExport = useCallback(() => {
    if (typeof window === 'undefined') return;
    const revenue = adminData.revenue ?? null;
    if (!revenue) return;

    const rows = [];
    if (revenue.overview) {
      rows.push(['Metric', 'Value']);
      Object.entries(revenue.overview).forEach(([key, value]) => {
        const label = key
          .replace(/[A-Z]/g, (match) => ` ${match.toLowerCase()}`)
          .replace(/^./, (match) => match.toUpperCase());
        rows.push([label.trim(), value]);
      });
    }

    if (revenue.paymentHealth) {
      rows.push([]);
      rows.push(['Payment health', '']);
      Object.entries(revenue.paymentHealth).forEach(([key, value]) => {
        rows.push([key, value]);
      });
    }

    if (Array.isArray(revenue.topCommunities) && revenue.topCommunities.length > 0) {
      rows.push([]);
      rows.push(['Top communities', '']);
      rows.push(['Community', 'Revenue', 'Subscribers', 'Share']);
      revenue.topCommunities.forEach((community) => {
        rows.push([
          community.name,
          community.revenue,
          formatNumber(community.subscribers),
          `${community.share}%`
        ]);
      });
    }

    if (rows.length === 0) return;

    const csv = rows.map((row) => row.map(createCsvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `edulure-admin-revenue-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, [adminData.revenue]);

  const handleInviteAdmin = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.open(inviteLink, '_blank', 'noopener');
  }, [inviteLink]);

  const handleSwitchToInstructor = useCallback(() => {
    const instructorRole = roles.find((role) => role.id === 'instructor');
    if (instructorRole) {
      setActiveRole('instructor');
      navigate('/dashboard/instructor');
    } else {
      navigate('/dashboard/learner');
    }
  }, [navigate, roles, setActiveRole]);

  const handleOpenAnalytics = useCallback(() => navigate('/analytics'), [navigate]);

  const toolsData = useMemo(() => tools, [tools]);

  const handleNavSelect = useCallback((sectionId) => {
    if (!sectionId) return;
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const shellSubtitle = useMemo(
    () =>
      `Monitor revenue, approvals, policy cadences, and platform health. Escalate incidents via ${escalationChannel}.`,
    [escalationChannel]
  );

  const headerActions = useMemo(
    () => (
      <>
        <button
          type="button"
          onClick={refresh}
          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
        >
          Refresh data
        </button>
        <button
          type="button"
          onClick={handleInviteAdmin}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
        >
          Invite admin
        </button>
      </>
    ),
    [handleInviteAdmin, refresh]
  );

  const asideFooter = useMemo(
    () => (
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleSwitchToInstructor}
          className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
        >
          Switch to instructor view
        </button>
        <button
          type="button"
          onClick={handleInviteAdmin}
          className="w-full rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
        >
          Invite admin
        </button>
      </div>
    ),
    [handleInviteAdmin, handleSwitchToInstructor]
  );

  if (!adminConsoleEnabled && !overallLoading) {
    return (
      <section className="bg-slate-50/70 py-24">
        <div className="mx-auto max-w-3xl space-y-6 px-6 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Admin console disabled</h1>
          <p className="text-sm text-slate-600">
            The operational console is currently disabled for your account. If you believe this is an error,
            contact the platform operations team via
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
            Your account does not have administrator permissions. Please contact platform operations if you require
            elevated access.
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
    <AdminShell
      title="Admin control center"
      subtitle={shellSubtitle}
      navGroups={navGroups}
      headerActions={headerActions}
      asideFooter={asideFooter}
      onNavSelect={handleNavSelect}
    >
      <section id="overview" className="space-y-6 rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Monitor revenue, approvals, policy cadences, and platform health in one Learnspace. Escalate incidents via
            <span className="font-semibold text-primary"> {escalationChannel}</span> or invite additional operators for
            dedicated access.
          </p>
          <AdminStats metrics={adminMetrics} />
          <div className="grid gap-6 lg:grid-cols-2">
            <AdminTaskList tasks={adminTasks} onNavigate={handleNavSelect} />
            <AdminHelpLinks links={helpLinks} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Need deeper telemetry?{' '}
            <button
              type="button"
              onClick={handleOpenAnalytics}
              className="font-semibold text-primary underline-offset-4 transition hover:underline"
            >
              Open analytics overview
            </button>
            .
          </div>
        </div>
      </section>

      <AdminApprovalsSection
        pendingCount={pendingApprovals}
        items={approvalItems}
        formatNumber={formatNumber}
        onRefresh={refresh}
      />

      <AdminRevenueSection
        revenueCards={revenueCards}
        paymentHealthBreakdown={paymentHealthBreakdown}
        savedViews={savedViews}
        selectedSavedViewId={selectedSavedViewId}
        onSelectSavedView={setSelectedSavedViewId}
        savedViewsLoading={savedViewsLoading}
        savedViewsError={savedViewsError}
        onExport={handleRevenueExport}
      />

      <AdminCoursesSection sectionId="courses" token={token} />

      <AdminEbooksSection sectionId="ebooks" token={token} />

      <AdminCalendarSection sectionId="calendar" token={token} />

      <AdminBookingsSection sectionId="bookings" token={token} />

      <AdminGrowthSection sectionId="growth" token={token} />

      <AdminRevenueManagementSection sectionId="revenue-management" token={token} />

      <AdminAdsManagementSection sectionId="ads-management" token={token} />

      <AdminMonetizationSettingsSection
        sectionId="monetization"
        settings={monetizationSettings}
        token={token}
        onSettingsUpdated={refresh}
      />

      <AdminProfileSettingsSection
        sectionId="profile-settings"
        token={token}
        settings={adminProfileSettings}
        onSettingsUpdated={refresh}
      />

      <AdminPaymentSettingsSection
        sectionId="payment-settings"
        token={token}
        settings={paymentSettings}
        onSettingsUpdated={refresh}
      />

      <AdminEmailSettingsSection
        sectionId="email-settings"
        token={token}
        settings={emailSettings}
        onSettingsUpdated={refresh}
      />

      <AdminSecuritySettingsSection
        sectionId="security-settings"
        token={token}
        settings={securitySettings}
        onSettingsUpdated={refresh}
      />

      <AdminFinanceCommissionSection
        sectionId="finance-settings"
        token={token}
        settings={financeSettings}
        onSettingsUpdated={refresh}
      />

      <AdminTopCommunitiesSection
        sectionId="communities"
        communities={topCommunities}
        formatNumber={formatNumber}
      />

      <AdminToolsSection sectionId="tools" tools={toolsData} />

      <AdminOperationsSection
        sectionId="operations"
        supportStats={supportStats}
        riskStats={riskStats}
        platformStats={platformStats}
      />

      <AdminBlogSection sectionId="blog" blog={blog} token={token} onPostCreated={refresh} />

      <AdminComplianceSection
        sectionId="compliance"
        metrics={complianceMetrics}
        queue={complianceQueue}
        slaBreaches={complianceSlaBreaches}
        manualReviewQueue={complianceManualReview}
        gdprProfile={complianceGdprProfile}
        audits={complianceAudits}
        attestations={complianceAttestations}
        frameworks={complianceFrameworks}
        risk={complianceRisk}
        incidentResponse={complianceIncidentResponse}
        evidence={complianceEvidence}
        onReview={handleVerificationReview}
      />

      <AdminPolicyHubSection
        sectionId="policies"
        status={policyStatus}
        owner={policyOwner}
        contact={policyContact}
        lastReviewed={policyLastReviewed}
        slaHours={policySlaHours}
        policyHubUrl={policyHubUrl}
      />

      <AdminUpcomingLaunchesSection sectionId="launches" launches={upcomingLaunches} />

      <AdminActivitySection alerts={alerts} events={events} onOpenAnalytics={handleOpenAnalytics} />
    </AdminShell>
  );
}
