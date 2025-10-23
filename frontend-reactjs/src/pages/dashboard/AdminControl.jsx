import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  ArrowPathIcon,
  BellAlertIcon,
  BoltIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  ScaleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

import adminControlApi from '../../api/adminControlApi.js';
import { fetchReleaseDashboard } from '../../api/releaseManagementApi.js';
import { fetchEmailSettings, updateEmailSettings } from '../../api/adminSettingsApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useServiceHealth } from '../../context/ServiceHealthContext.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import AdminShell from '../../layouts/AdminShell.jsx';
import SettingsToggleField from '../../components/settings/SettingsToggleField.jsx';
import AdminCrudResource from '../../components/dashboard/admin/AdminCrudResource.jsx';
import AdminPodcastManager from '../../components/dashboard/admin/AdminPodcastManager.jsx';
import {
  ADMIN_CONTROL_TABS,
  createAdminControlResourceConfigs
} from './admin/adminControlConfig.jsx';

const DEFAULT_NOTIFICATIONS = Object.freeze({
  onboarding: false,
  weeklyDigest: false,
  incidentAlerts: false,
  marketingOptInDefault: false
});

const STATUS_CARD_TONES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  neutral: 'border-slate-200 bg-white text-slate-900'
};

const STATUS_PILL_TONES = {
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  info: 'bg-sky-100 text-sky-700',
  neutral: 'bg-slate-100 text-slate-700'
};

const AUDIT_ENTRY_TONES = {
  critical: 'border-rose-200 bg-rose-50/90 text-rose-900',
  danger: 'border-rose-200 bg-rose-50/90 text-rose-900',
  warning: 'border-amber-200 bg-amber-50/90 text-amber-900',
  success: 'border-emerald-200 bg-emerald-50/90 text-emerald-900',
  info: 'border-sky-200 bg-sky-50/90 text-sky-900',
  neutral: 'border-slate-200 bg-slate-50/90 text-slate-900'
};

const COMPLIANCE_ALERT_TONES = {
  critical: 'border-rose-200 bg-rose-50/90 text-rose-900',
  warning: 'border-amber-200 bg-amber-50/90 text-amber-900',
  info: 'border-sky-200 bg-sky-50/90 text-sky-900'
};

const RELEASE_STATUS_TONES = {
  scheduled: 'info',
  in_progress: 'warning',
  blocked: 'danger',
  failed: 'danger',
  completed: 'success',
  cancelled: 'neutral'
};

const NOTIFICATION_TOGGLES = [
  {
    key: 'incidentAlerts',
    label: 'Send incident escalation alerts',
    description: 'Notify on-call operators when incidents breach the documented SLA thresholds.'
  },
  {
    key: 'weeklyDigest',
    label: 'Weekly executive digest',
    description: 'Summarise revenue, growth, and compliance highlights for leadership each week.'
  },
  {
    key: 'onboarding',
    label: 'Onboarding nudges for new admins',
    description: 'Deliver the control-centre checklist to newly provisioned administrators.'
  },
  {
    key: 'marketingOptInDefault',
    label: 'Default marketing opt-in',
    description: 'Pre-select marketing updates for new tenants where regulations permit opt-out preferences.'
  }
];

function humaniseLabel(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function StatusCard({ icon: Icon, label, value, helper, tone = 'info' }) {
  const toneClass = STATUS_CARD_TONES[tone] ?? STATUS_CARD_TONES.neutral;
  return (
    <div className={clsx('flex flex-col gap-3 rounded-2xl border p-5 shadow-sm transition', toneClass)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
        {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      {helper ? <p className="text-sm text-current/80">{helper}</p> : null}
    </div>
  );
}

function ServiceAlertList({ alerts, loading, dateFormatter }) {
  if (loading) {
    return <p className="text-sm text-slate-600">Refreshing runtime manifest…</p>;
  }
  if (!alerts?.length) {
    return <p className="text-sm font-semibold text-emerald-700">All monitored services are operational.</p>;
  }
  return (
    <ul className="space-y-3">
      {alerts.slice(0, 4).map((alert) => (
        <li key={alert.id} className="rounded-xl border border-slate-200 bg-white/80 p-3">
          <p className="text-sm font-semibold text-slate-800">{alert.title}</p>
          {alert.message ? <p className="mt-1 text-xs text-slate-500">{alert.message}</p> : null}
          <p className="mt-2 text-xs text-slate-400">
            Updated {alert.checkedAt ? dateFormatter.format(new Date(alert.checkedAt)) : 'recently'}
          </p>
        </li>
      ))}
      {alerts.length > 4 ? (
        <li className="text-xs text-slate-500">+{alerts.length - 4} additional alerts in manifest.</li>
      ) : null}
    </ul>
  );
}

function UpcomingReleaseList({ upcoming, status, dateFormatter }) {
  if ((status === 'loading' || status === 'refreshing') && !upcoming.length) {
    return (
      <DashboardStateMessage
        variant="loading"
        title="Loading releases"
        description="Collecting upcoming release windows."
        className="rounded-xl border border-dashed border-slate-200 bg-white/80"
      />
    );
  }

  if (status === 'error' && !upcoming.length) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Unable to load release schedule"
        description="Retry fetching release readiness data from the orchestration service."
        className="rounded-xl border border-dashed border-rose-200 bg-rose-50/70"
      />
    );
  }

  if (!upcoming.length) {
    return (
      <DashboardStateMessage
        variant="empty"
        title="No scheduled releases"
        description="When new deployments are planned the schedule and readiness scores will appear here."
        className="rounded-xl border border-dashed border-slate-200 bg-white/80"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {upcoming.slice(0, 4).map((run) => {
        const tone = RELEASE_STATUS_TONES[run.status] ?? 'info';
        const pillClass = STATUS_PILL_TONES[tone] ?? STATUS_PILL_TONES.neutral;
        const windowStart = run.changeWindowStart ? dateFormatter.format(new Date(run.changeWindowStart)) : null;
        const windowEnd = run.changeWindowEnd ? dateFormatter.format(new Date(run.changeWindowEnd)) : null;
        const readiness = Number.isFinite(run.readinessScore) ? `${run.readinessScore}%` : null;
        return (
          <li key={run.publicId ?? run.versionTag ?? run.scheduledAt} className="rounded-xl border border-slate-200 bg-white/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{run.versionTag ?? run.publicId ?? 'Release'}</p>
                <p className="text-xs text-slate-500">{run.environment ? run.environment.toUpperCase() : 'Environment pending'}</p>
              </div>
              <span className={clsx('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize', pillClass)}>
                {humaniseLabel(run.status ?? 'scheduled')}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {windowStart ? `Window ${windowStart}${windowEnd ? ` – ${windowEnd}` : ''}` : 'Scheduling to be confirmed.'}
            </p>
            {readiness ? <p className="mt-2 text-xs font-semibold text-slate-600">Readiness {readiness}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

function AuditTimeline({ state, dateFormatter }) {
  const { status, entries, error } = state;
  if ((status === 'loading' || status === 'refreshing') && !entries.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <DashboardStateMessage
          variant="loading"
          title="Loading audit log"
          description="Collecting recent admin actions across content, identity, and feature flags."
          className="border-none bg-transparent p-0 shadow-none"
        />
      </div>
    );
  }

  if (status === 'error' && !entries.length) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6">
        <DashboardStateMessage
          variant="error"
          title="Unable to load audit log"
          description={error?.message ?? 'Retry fetching the consolidated audit timeline.'}
          className="border-none bg-transparent p-0 shadow-none"
        />
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <DashboardStateMessage
          variant="empty"
          title="No recent admin activity"
          description="When administrators publish updates, moderation actions, or verification decisions they will appear here automatically."
          className="border-none bg-transparent p-0 shadow-none"
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <ol className="space-y-4">
        {entries.slice(0, 12).map((entry) => {
          const severity = (entry.severity ?? 'info').toLowerCase();
          const toneClass = AUDIT_ENTRY_TONES[severity] ?? AUDIT_ENTRY_TONES.info;
          const actorName = entry.actor?.name ?? entry.actor?.email ?? null;
          const actorEmail = entry.actor?.email && entry.actor?.name ? entry.actor.email : null;
          const timestamp = entry.occurredAt ? dateFormatter.format(new Date(entry.occurredAt)) : 'Recently';
          return (
            <li key={entry.id} className={clsx('rounded-2xl border p-4 transition hover:shadow-sm', toneClass)}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-current/30 bg-white/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                      {humaniseLabel(entry.source ?? 'activity')}
                    </span>
                    <p className="text-sm font-semibold text-current">{entry.title}</p>
                  </div>
                  {entry.description ? <p className="text-xs text-current/80">{entry.description}</p> : null}
                </div>
                <p className="text-xs font-semibold text-current/70">{timestamp}</p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-current/70">
                {actorName ? <span>{actorEmail ? `${actorName} · ${actorEmail}` : actorName}</span> : null}
                {entry.references?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {entry.references.map((reference) => (
                      <span
                        key={`${entry.id}-${reference.type}-${reference.id}`}
                        className="inline-flex items-center rounded-full border border-current/30 bg-white/70 px-2 py-0.5 text-[11px] font-semibold capitalize"
                      >
                        {humaniseLabel(reference.type ?? 'ref')}: {reference.label ?? reference.id}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function AdminControl() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const isAdmin = session?.user?.role === 'admin';
  const resourceConfigs = useMemo(() => createAdminControlResourceConfigs(), []);
  const tabOrder = useMemo(
    () => ADMIN_CONTROL_TABS.filter((tab) => resourceConfigs[tab.id]),
    [resourceConfigs]
  );
  const [activeTab, setActiveTab] = useState(() => tabOrder[0]?.id ?? ADMIN_CONTROL_TABS[0].id);

  const { alerts, loading: healthLoading, lastUpdated: manifestUpdated } = useServiceHealth();

  const [auditState, setAuditState] = useState({
    status: 'idle',
    entries: [],
    totals: {},
    generatedAt: null,
    error: null
  });
  const [releaseState, setReleaseState] = useState({
    status: 'idle',
    upcoming: [],
    recent: [],
    breakdown: {},
    requiredGates: [],
    error: null
  });
  const [overviewState, setOverviewState] = useState({
    status: 'idle',
    data: null,
    error: null
  });
  const [notificationState, setNotificationState] = useState({ ...DEFAULT_NOTIFICATIONS });
  const [notificationStatus, setNotificationStatus] = useState('idle');
  const [notificationError, setNotificationError] = useState(null);
  const [notificationLoaded, setNotificationLoaded] = useState(false);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
    []
  );

  useEffect(() => {
    if (!tabOrder.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabOrder[0]?.id ?? ADMIN_CONTROL_TABS[0].id);
    }
  }, [tabOrder, activeTab]);

  const fetchAuditLog = useCallback(
    ({ signal } = {}) => {
      if (!token) {
        return Promise.resolve();
      }
      setAuditState((prev) => ({
        ...prev,
        status: prev.entries.length ? 'refreshing' : 'loading',
        error: null
      }));
      return adminControlApi
        .listAuditLog({ token, signal })
        .then((data) => {
          setAuditState({
            status: 'ready',
            entries: data.entries ?? [],
            totals: data.totals ?? {},
            generatedAt: data.generatedAt ?? null,
            error: null
          });
        })
        .catch((error) => {
          if (signal?.aborted) {
            return;
          }
          setAuditState((prev) => ({
            ...prev,
            status: prev.entries.length ? 'ready' : 'error',
            error
          }));
        });
    },
    [token]
  );

  const fetchReleaseData = useCallback(
    ({ signal } = {}) => {
      if (!token) {
        return Promise.resolve();
      }
      setReleaseState((prev) => ({
        ...prev,
        status: prev.upcoming.length || prev.recent.length ? 'refreshing' : 'loading',
        error: null
      }));
      return fetchReleaseDashboard({ token, signal })
        .then((data) => {
          setReleaseState({
            status: 'ready',
            upcoming: data.upcoming ?? [],
            recent: data.recent ?? [],
            breakdown: data.breakdown ?? {},
            requiredGates: data.requiredGates ?? [],
            error: null
          });
        })
        .catch((error) => {
          if (signal?.aborted) {
            return;
          }
          setReleaseState((prev) => ({
            ...prev,
            status: prev.status === 'ready' ? 'ready' : 'error',
            error
          }));
        });
    },
    [token]
  );

  const fetchOverviewData = useCallback(
    ({ signal } = {}) => {
      if (!token) {
        return Promise.resolve();
      }
      setOverviewState((prev) => ({
        ...prev,
        status: prev.data ? 'refreshing' : 'loading',
        error: null
      }));
      return adminControlApi
        .fetchOverview({ token, signal })
        .then((data) => {
          setOverviewState({ status: 'ready', data, error: null });
        })
        .catch((error) => {
          if (signal?.aborted) {
            return;
          }
          setOverviewState((prev) => ({
            ...prev,
            status: prev.data ? 'ready' : 'error',
            error
          }));
        });
    },
    [token]
  );

  const loadNotificationSettings = useCallback(
    ({ signal } = {}) => {
      if (!token) {
        return Promise.resolve();
      }
      setNotificationStatus((prev) => (prev === 'ready' ? 'refreshing' : 'loading'));
      setNotificationError(null);
      return fetchEmailSettings({ token, signal })
        .then((settings) => {
          const notifications = settings?.notifications ?? {};
          setNotificationState({ ...DEFAULT_NOTIFICATIONS, ...notifications });
          setNotificationStatus('ready');
          setNotificationLoaded(true);
        })
        .catch((error) => {
          if (signal?.aborted) {
            return;
          }
          setNotificationStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
          setNotificationError(error);
        });
    },
    [token]
  );

  const handleNotificationToggle = useCallback(
    (key) => async (value) => {
      if (!token) {
        return;
      }
      setNotificationStatus('saving');
      setNotificationError(null);
      try {
        const payload = await updateEmailSettings({
          token,
          payload: {
            notifications: {
              ...DEFAULT_NOTIFICATIONS,
              ...notificationState,
              [key]: value
  }
}

function ComplianceAlertList({ alerts, status, error, dateFormatter, onRetry }) {
  if ((status === 'loading' || status === 'refreshing') && !alerts.length) {
    return (
      <DashboardStateMessage
        variant="loading"
        title="Reviewing governance signals"
        description="Collating contract renewals and escalation states."
        className="rounded-2xl border border-dashed border-slate-200 bg-white/80"
      />
    );
  }

  if (status === 'error' && !alerts.length) {
    return (
      <div className="space-y-3">
        <DashboardStateMessage
          variant="error"
          title="Unable to load compliance alerts"
          description={error?.message ?? 'Retry fetching governance contracts and escalations.'}
          className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/80"
        />
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
          >
            <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
            Retry overview
          </button>
        ) : null}
      </div>
    );
  }

  if (!alerts.length) {
    return (
      <DashboardStateMessage
        variant="success"
        title="No outstanding compliance alerts"
        description="All tracked contracts are within policy tolerances."
        className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {alerts.map((alert) => {
        const tone = COMPLIANCE_ALERT_TONES[alert.severity] ?? COMPLIANCE_ALERT_TONES.info;
        const pillToneKey = alert.severity === 'critical' ? 'danger' : alert.severity;
        const pillClass = STATUS_PILL_TONES[pillToneKey] ?? STATUS_PILL_TONES.info;
        const renewalDate = alert.renewalDate ? dateFormatter.format(new Date(alert.renewalDate)) : 'Review date pending';
        return (
          <li key={alert.id ?? alert.vendor} className={clsx('rounded-2xl border p-4 transition hover:shadow-sm', tone)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-current">{alert.vendor ?? 'Contract review'}</p>
                <p className="text-xs text-current/80">{renewalDate}</p>
              </div>
              <span className={clsx('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize', pillClass)}>
                {humaniseLabel(alert.severity ?? 'info')}
              </span>
            </div>
            {alert.summary ? <p className="mt-2 text-xs text-current/70">{alert.summary}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-current/60">
              {alert.ownerEmail ? <span>{alert.ownerEmail}</span> : null}
              {alert.status ? <span className="uppercase tracking-wide">{alert.status}</span> : null}
              {alert.href ? (
                <a
                  href={alert.href}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:text-primary/80"
                >
                  View policy
                  <span aria-hidden>↗</span>
                </a>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ReleaseChecklistSummary({ checklist }) {
  const categories = checklist?.categories ?? [];
  const totalItems = Number.isFinite(Number(checklist?.totalItems)) ? Number(checklist.totalItems) : 0;
  const autoEvaluated = Number.isFinite(Number(checklist?.autoEvaluated))
    ? Number(checklist.autoEvaluated)
    : 0;
  const manual = Number.isFinite(Number(checklist?.manual)) ? Number(checklist.manual) : Math.max(totalItems - autoEvaluated, 0);
  if (!categories.length) {
    return (
      <DashboardStateMessage
        variant="empty"
        title="Checklist catalogue"
        description="Define release gates to surface manual sign-offs and automated verifications."
        className="rounded-2xl border border-dashed border-slate-200 bg-white/80"
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500">
        {manual} manual · {autoEvaluated} automated checks across {totalItems} items
      </p>
      <ul className="space-y-3">
        {categories.map((category) => (
          <li key={category.id ?? category.label} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">{category.label}</p>
              <span className="text-xs font-semibold text-slate-500">
                {category.manual} manual · {category.autoEvaluated} automated
              </span>
            </div>
            {Array.isArray(category.defaultOwners) && category.defaultOwners.length ? (
              <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                Owners: {category.defaultOwners.join(', ')}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
        });
        const notifications = payload?.notifications ?? {};
        setNotificationState({ ...DEFAULT_NOTIFICATIONS, ...notifications });
        setNotificationStatus('ready');
      } catch (error) {
        setNotificationStatus('error');
        setNotificationError(error);
      }
    },
    [notificationState, token]
  );

  useEffect(() => {
    const controller = new AbortController();
    if (token) {
      fetchAuditLog({ signal: controller.signal });
    } else {
      setAuditState({ status: 'idle', entries: [], totals: {}, generatedAt: null, error: null });
    }
    return () => controller.abort();
  }, [fetchAuditLog, token]);

  useEffect(() => {
    const controller = new AbortController();
    if (token) {
      fetchReleaseData({ signal: controller.signal });
    } else {
      setReleaseState({ status: 'idle', upcoming: [], recent: [], breakdown: {}, requiredGates: [], error: null });
    }
    return () => controller.abort();
  }, [fetchReleaseData, token]);

  useEffect(() => {
    const controller = new AbortController();
    if (token) {
      fetchOverviewData({ signal: controller.signal });
    } else {
      setOverviewState({ status: 'idle', data: null, error: null });
    }
    return () => controller.abort();
  }, [fetchOverviewData, token]);

  useEffect(() => {
    const controller = new AbortController();
    if (token) {
      loadNotificationSettings({ signal: controller.signal });
    } else {
      setNotificationState({ ...DEFAULT_NOTIFICATIONS });
      setNotificationStatus('idle');
      setNotificationLoaded(false);
      setNotificationError(null);
    }
    return () => controller.abort();
  }, [loadNotificationSettings, token]);

  const statusBadge = useMemo(() => {
    const criticalCount = alerts.filter((alert) => alert.level === 'critical').length;
    const warningCount = alerts.filter((alert) => alert.level === 'warning').length;
    if (criticalCount > 0) {
      return {
        label: `${criticalCount} critical alert${criticalCount === 1 ? '' : 's'}`,
        tone: 'danger',
        icon: <BellAlertIcon className="h-4 w-4" aria-hidden="true" />
      };
    }
    if (warningCount > 0) {
      return {
        label: `${warningCount} warning${warningCount === 1 ? '' : 's'}`,
        tone: 'warning',
        icon: <BellAlertIcon className="h-4 w-4" aria-hidden="true" />
      };
    }
    return {
      label: healthLoading ? 'Checking services…' : 'Operational',
      tone: 'success',
      icon: <ShieldCheckIcon className="h-4 w-4" aria-hidden="true" />
    };
  }, [alerts, healthLoading]);

  const navigationGroups = useMemo(
    () => [
      {
        id: 'pulse',
        title: 'Operations pulse',
        items: [
          { id: 'overview', label: 'Command pulse', helper: 'Service health & release posture' },
          { id: 'governance', label: 'Governance & checklist', helper: 'Compliance alerts & release gates' },
          { id: 'audit-log', label: 'Audit trail', helper: 'Cross-system activity timeline' }
        ]
      },
      {
        id: 'controls',
        title: 'Controls',
        items: [
          { id: 'resources', label: 'Resource libraries', helper: 'Courses, communities, tutors' },
          { id: 'notifications', label: 'Notification policy', helper: 'Digest & incident alerts' }
        ]
      }
    ],
    []
  );

  const operationsTasks = useMemo(() => {
    const tasks = [];
    const blocked = Number(releaseState.breakdown?.blocked ?? 0);
    const inProgress = Number(releaseState.breakdown?.in_progress ?? 0);
    if (blocked > 0) {
      tasks.push({
        id: 'blocked-releases',
        label: `${blocked} release${blocked === 1 ? '' : 's'} blocked awaiting action`,
        href: '#overview',
        tone: 'danger'
      });
    }
    if (inProgress > 0) {
      tasks.push({
        id: 'in-progress-releases',
        label: `${inProgress} release${inProgress === 1 ? '' : 'es'} in progress`,
        href: '#overview',
        tone: 'warning'
      });
    }
    const identityHighlights = auditState.entries.filter(
      (entry) => entry.source === 'identity' && entry.severity !== 'success'
    );
    if (identityHighlights.length) {
      tasks.push({
        id: 'identity-audit',
        label: `Review ${identityHighlights.length} identity verification update${
          identityHighlights.length === 1 ? '' : 's'
        }`,
        href: '#audit-log',
        tone: 'warning'
      });
    }
    const complianceAlerts = overviewState.data?.compliance?.alerts ?? [];
    if (complianceAlerts.length) {
      const hasCritical = complianceAlerts.some((alert) => alert.severity === 'critical');
      tasks.push({
        id: 'compliance-alerts',
        label: `Resolve ${complianceAlerts.length} compliance alert${complianceAlerts.length === 1 ? '' : 's'}`,
        href: '#governance',
        tone: hasCritical ? 'danger' : 'warning'
      });
    }
    return tasks;
  }, [releaseState.breakdown, auditState.entries, overviewState]);

  const helperLinks = useMemo(
    () => [
      {
        label: 'Operations handbook',
        href: '/docs/operations/README.md#control-centre',
        description: 'Release, incident, and compliance playbooks.'
      },
      {
        label: 'Audit evidence templates',
        href: '/docs/operations/README.md#audit-evidence',
        description: 'Steps to export proofs for compliance reviews.'
      },
      {
        label: 'Governance contract tracker',
        href: '/docs/operations/README.md#governance-contracts',
        description: 'Renewal workflows and escalation guidance.'
      }
    ],
    []
  );

  const shellMeta = useMemo(() => {
    const iso = overviewState.data?.audit?.generatedAt ?? auditState.generatedAt ?? manifestUpdated ?? null;
    if (!iso) {
      return null;
    }
    const timestamp = new Date(iso);
    if (Number.isNaN(timestamp.getTime())) {
      return null;
    }
    return { generatedAt: dateFormatter.format(timestamp) };
  }, [overviewState, auditState.generatedAt, manifestUpdated, dateFormatter]);

  const auditBusy = auditState.status === 'loading' || auditState.status === 'refreshing';
  const releaseBusy = releaseState.status === 'loading' || releaseState.status === 'refreshing';
  const overviewBusy = overviewState.status === 'loading' || overviewState.status === 'refreshing';
  const notificationBusy = notificationStatus === 'saving';
  const complianceAlerts = overviewState.data?.compliance?.alerts ?? [];
  const complianceSummary = overviewState.data?.compliance?.summary ?? {};
  const readinessSummary = overviewState.data?.release?.readiness ?? {};
  const checklistSummary = overviewState.data?.release?.checklist ?? {};
  const complianceTone = complianceAlerts.some((alert) => alert.severity === 'critical')
    ? 'danger'
    : complianceAlerts.some((alert) => alert.severity === 'warning')
      ? 'warning'
      : 'success';
  const complianceValue = complianceAlerts.length
    ? `${complianceAlerts.length} alert${complianceAlerts.length === 1 ? '' : 's'}`
    : 'Stable';
  const complianceHelper = (() => {
    const overdue = Number(complianceSummary.overdueRenewals ?? 0);
    const renewals = Number(complianceSummary.renewalsWithinWindow ?? 0);
    if (overdue > 0) {
      return `${overdue} overdue · ${renewals} due soon`;
    }
    return `${renewals} renewals within 60 days`;
  })();
  const readinessHelper = Number.isFinite(Number(readinessSummary.averageReadinessScore))
    ? `Avg readiness ${Number(readinessSummary.averageReadinessScore).toFixed(0)}%`
    : `${Number(releaseState.breakdown?.scheduled ?? 0)} scheduled · ${Number(
        releaseState.breakdown?.in_progress ?? 0
      )} in progress`;

  if (!isAdmin) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Admin privileges required"
        description="Switch to an administrator Learnspace or request elevated permissions to manage operational resources."
      />
    );
  }

  if (!token) {
    return (
      <DashboardStateMessage
        title="Admin authentication required"
        description="Sign in with an administrator account to access the operational control centre."
      />
    );
  }

  const config = resourceConfigs[activeTab];

  if (!config) {
    return (
      <DashboardStateMessage
        title="Module unavailable"
        description="The selected operational module is not currently enabled for your account. Choose another tab to continue."
      />
    );
  }

  return (
    <AdminShell
      title="Operational control centre"
      subtitle="Activate, iterate, and retire platform programmes across communities, courses, tutors, live experiences, and media."
      statusBadge={statusBadge}
      navigationGroups={navigationGroups}
      tasks={operationsTasks.length ? operationsTasks : null}
      helperLinks={helperLinks}
      meta={shellMeta}
    >
      <section id="overview" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <BoltIcon className="h-5 w-5 text-primary" aria-hidden="true" />
              <span>Command pulse</span>
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Real-time view of runtime health, release posture, and required gates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fetchOverviewData()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={overviewBusy}
            >
              <ArrowPathIcon className={clsx('h-4 w-4', overviewBusy ? 'animate-spin' : '')} aria-hidden="true" />
              Refresh overview
            </button>
            <button
              type="button"
              onClick={() => fetchReleaseData()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={releaseBusy}
            >
              <ArrowPathIcon className={clsx('h-4 w-4', releaseBusy ? 'animate-spin' : '')} aria-hidden="true" />
              Refresh releases
            </button>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          <StatusCard
            icon={ShieldCheckIcon}
            label="Runtime health"
            value={alerts.length ? `${alerts.length} alert${alerts.length === 1 ? '' : 's'}` : 'Healthy'}
            helper={healthLoading ? 'Refreshing manifest…' : 'Latest manifest synced.'}
            tone={alerts.some((alert) => alert.level === 'critical') ? 'danger' : alerts.some((alert) => alert.level === 'warning') ? 'warning' : 'success'}
          />
          <StatusCard
            icon={ClipboardDocumentCheckIcon}
            label="Release readiness"
            value={`${Number(releaseState.breakdown?.completed ?? 0)} completed`}
            helper={readinessHelper}
            tone={releaseState.breakdown?.blocked ? 'warning' : 'info'}
          />
          <StatusCard
            icon={ClockIcon}
            label="Required gates"
            value={`${releaseState.requiredGates.length} enforced`}
            helper={releaseState.requiredGates.length ? releaseState.requiredGates.join(', ') : 'No mandatory gates configured.'}
            tone={releaseState.requiredGates.length ? 'info' : 'neutral'}
          />
          <StatusCard
            icon={ScaleIcon}
            label="Compliance posture"
            value={complianceValue}
            helper={complianceHelper}
            tone={complianceTone}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-900">Service alerts</h3>
            <p className="mt-1 text-xs text-slate-500">Manifest-level visibility across services and capabilities.</p>
            <div className="mt-4">
              <ServiceAlertList alerts={alerts} loading={healthLoading} dateFormatter={dateFormatter} />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-900">Upcoming releases</h3>
            <p className="mt-1 text-xs text-slate-500">Top scheduled windows and readiness scores.</p>
            <div className="mt-4">
              <UpcomingReleaseList upcoming={releaseState.upcoming} status={releaseState.status} dateFormatter={dateFormatter} />
            </div>
          </div>
        </div>
      </section>

      <section id="governance" className="space-y-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ScaleIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            <span>Governance & release checklist</span>
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Track compliance renewals alongside the release gate catalogue.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-900">Release checklist</h3>
            <p className="mt-1 text-xs text-slate-500">Manual sign-offs and automated gates grouped by category.</p>
            <div className="mt-4">
              <ReleaseChecklistSummary checklist={checklistSummary} />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-900">Compliance alerts</h3>
            <p className="mt-1 text-xs text-slate-500">High-risk contracts and escalations requiring attention.</p>
            <div className="mt-4">
              <ComplianceAlertList
                alerts={complianceAlerts}
                status={overviewState.status}
                error={overviewState.error}
                dateFormatter={dateFormatter}
                onRetry={() => fetchOverviewData()}
              />
            </div>
          </div>
        </div>
      </section>

      <section id="audit-log" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <DocumentMagnifyingGlassIcon className="h-5 w-5 text-primary" aria-hidden="true" />
              <span>Audit trail</span>
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Consolidated trail spanning content updates, verification decisions, and feature flag changes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchAuditLog()}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={auditBusy}
          >
            <ArrowPathIcon className={clsx('h-4 w-4', auditBusy ? 'animate-spin' : '')} aria-hidden="true" />
            Refresh log
          </button>
        </div>
        <AuditTimeline state={auditState} dateFormatter={dateFormatter} />
      </section>

      <section id="resources" className="space-y-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ClipboardDocumentCheckIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            <span>Resource libraries</span>
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Govern courses, communities, tutors, live sessions, and media from a single control plane.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabOrder.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'rounded-full border px-4 py-2 text-xs font-semibold transition',
                activeTab === tab.id
                  ? 'border-primary bg-primary text-white shadow'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary'
              )}
              aria-pressed={activeTab === tab.id}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'podcasts' ? (
          <AdminPodcastManager token={token} api={adminControlApi} />
        ) : (
          <AdminCrudResource
            token={token}
            title={config.title}
            description={config.description}
            entityName={config.entityName}
            listRequest={({ token: authToken, params, signal, context }) =>
              config.listRequest({ token: authToken, params, signal, context })
            }
            createRequest={({ token: authToken, payload, context }) =>
              config.createRequest({ token: authToken, payload, context })
            }
            updateRequest={({ token: authToken, id, payload, context }) =>
              config.updateRequest(id, { token: authToken, payload, context })
            }
            deleteRequest={({ token: authToken, id, context }) =>
              config.deleteRequest(id, { token: authToken, context })
            }
            fields={config.fields}
            columns={config.columns}
            statusOptions={config.statusOptions}
            searchPlaceholder={`Search ${config.entityName}s`}
          />
        )}
      </section>

      <section id="notifications" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <BellAlertIcon className="h-5 w-5 text-primary" aria-hidden="true" />
              <span>Notification policy</span>
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Control incident escalations, executive digests, and onboarding nudges delivered to administrators.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadNotificationSettings()}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={notificationStatus === 'loading' || notificationStatus === 'refreshing'}
          >
            <ArrowPathIcon
              className={clsx(
                'h-4 w-4',
                notificationStatus === 'loading' || notificationStatus === 'refreshing' ? 'animate-spin' : ''
              )}
              aria-hidden="true"
            />
            Refresh preferences
          </button>
        </div>
        {notificationStatus === 'loading' && !notificationLoaded ? (
          <DashboardStateMessage
            variant="loading"
            title="Loading preferences"
            description="Fetching notification defaults."
            className="rounded-2xl border border-dashed border-slate-200 bg-white/80"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {NOTIFICATION_TOGGLES.map((toggle) => (
              <SettingsToggleField
                key={toggle.key}
                name={toggle.key}
                label={toggle.label}
                description={toggle.description}
                checked={Boolean(notificationState[toggle.key])}
                onChange={handleNotificationToggle(toggle.key)}
                disabled={!notificationLoaded || notificationBusy}
              />
            ))}
          </div>
        )}
        {notificationStatus === 'saving' ? (
          <p className="text-xs text-slate-500">Saving notification preferences…</p>
        ) : null}
        {notificationError ? (
          <p className="text-sm text-rose-600">
            {notificationError.message ?? 'Failed to update notification preferences. Try again shortly.'}
          </p>
        ) : null}
      </section>
    </AdminShell>
  );
}
