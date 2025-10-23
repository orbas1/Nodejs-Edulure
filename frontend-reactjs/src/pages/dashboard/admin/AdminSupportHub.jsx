import { useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  ArrowUpRightIcon,
  BellAlertIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  CloudArrowDownIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  MegaphoneIcon,
  PhoneIcon,
  PlayCircleIcon,
  QueueListIcon,
  ShieldCheckIcon,
  SignalIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import {
  assignSupportTicket,
  escalateSupportTicket,
  resolveSupportTicket,
  scheduleSupportBroadcast,
  updateSupportNotificationPolicy
} from '../../../api/operatorDashboardApi.js';
import DashboardStateMessage from '../../../components/dashboard/DashboardStateMessage.jsx';
import ModerationQueue from '../../../components/moderation/ModerationQueue.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import useSupportDashboard from '../../../hooks/useSupportDashboard.js';
import useRoleGuard from '../../../hooks/useRoleGuard.js';

const channelLabels = {
  email: 'Email',
  sms: 'SMS',
  push: 'Push',
  inApp: 'In-app'
};

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

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function formatRelativeTime(value) {
  if (!value) {
    return '—';
  }
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) {
    return '—';
  }
  const now = Date.now();
  const diff = target.getTime() - now;
  const minutes = Math.round(diff / 60000);
  if (Math.abs(minutes) < 60) {
    return relativeTimeFormatter.format(minutes, 'minute');
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return relativeTimeFormatter.format(hours, 'hour');
  }
  const days = Math.round(hours / 24);
  return relativeTimeFormatter.format(days, 'day');
}

function formatPercent(value, { fallback = '—', maximumFractionDigits = 0 } = {}) {
  if (value === null || value === undefined) {
    return fallback;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits
  }).format(Math.abs(numeric) > 1 ? numeric / 100 : numeric);
}

function formatNumber(value) {
  if (value === null || value === undefined) {
    return '—';
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '—';
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(numeric);
}

function OfflineBanner({ lastUpdated }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CloudArrowDownIcon className="h-5 w-5" aria-hidden="true" />
        You are offline. Showing the most recent cached support metrics.
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
        Support metrics are stale. Refresh when connectivity is restored.
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
      <Icon className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">{feedback.title}</p>
        <p>{feedback.message}</p>
      </div>
      <button type="button" className="text-xs font-semibold underline" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}

function SummaryMetricCard({ icon: Icon, label, value, helper, tone = 'default' }) {
  const toneClass = useMemo(() => {
    switch (tone) {
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-amber-800';
      case 'success':
        return 'border-emerald-200 bg-emerald-50 text-emerald-800';
      case 'critical':
        return 'border-rose-200 bg-rose-50 text-rose-800';
      default:
        return 'border-slate-200 bg-white text-slate-900';
    }
  }, [tone]);

  return (
    <div className={clsx('flex flex-col gap-3 rounded-2xl border p-5 shadow-sm', toneClass)}>
      <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-5 w-5" aria-hidden="true" />
        {label}
      </div>
      <p className="text-3xl font-semibold">{value}</p>
      {helper ? <p className="text-xs text-slate-600">{helper}</p> : null}
    </div>
  );
}

function TenantSelector({ tenants, tenantId, onChange, disabled }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-600 sm:flex-row sm:items-center">
      Tenant
      <select
        className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:mt-0"
        value={tenantId ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
        disabled={disabled}
      >
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function TicketRow({ ticket, onAssignToMe, onResolve, onEscalate, loading }) {
  const [showEscalate, setShowEscalate] = useState(false);
  const [escalationReason, setEscalationReason] = useState('Contract obligation at risk');
  const [escalationTarget, setEscalationTarget] = useState('tier-2');

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <QueueListIcon className="h-4 w-4" aria-hidden="true" />
            {ticket.reference}
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{ticket.subject}</h3>
          <p className="text-sm text-slate-600">
            {ticket.requester?.name} · {ticket.channel?.toUpperCase()} · Priority {ticket.priority?.toUpperCase()}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>Waiting {formatRelativeTime(ticket.waitingSince)}</span>
            {ticket.assignee ? <span>Assigned to {ticket.assignee.name}</span> : <span>Unassigned</span>}
            {ticket.slaBreached ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 font-semibold text-rose-600">
                <ExclamationTriangleIcon className="h-4 w-4" aria-hidden="true" />
                SLA breached
              </span>
            ) : null}
            {ticket.escalationLevel ? <span>Escalation {ticket.escalationLevel}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
            onClick={() => onAssignToMe(ticket)}
            disabled={loading}
          >
            <UsersIcon className="h-4 w-4" aria-hidden="true" />
            Assign to me
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-900"
            onClick={() => onResolve(ticket)}
            disabled={loading}
          >
            <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
            Resolve
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:border-sky-300 hover:text-sky-900"
            onClick={() => setShowEscalate((prev) => !prev)}
            disabled={loading}
            aria-expanded={showEscalate}
          >
            <ArrowUpRightIcon className="h-4 w-4" aria-hidden="true" />
            Escalate
          </button>
        </div>
      </div>
      {showEscalate ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            <label className="flex-1 text-sm font-medium text-slate-600">
              Escalation reason
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={escalationReason}
                onChange={(event) => setEscalationReason(event.target.value)}
              >
                <option value="Contract obligation at risk">Contract obligation at risk</option>
                <option value="Payment impacting multiple learners">Payment impacting multiple learners</option>
                <option value="Security concern raised">Security concern raised</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-600">
              Escalate to
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={escalationTarget}
                onChange={(event) => setEscalationTarget(event.target.value)}
              >
                <option value="tier-2">Tier 2 responder</option>
                <option value="tier-3">Tier 3 specialist</option>
                <option value="incident-commander">Incident commander</option>
              </select>
            </label>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              onClick={() => onEscalate(ticket, { reason: escalationReason, target: escalationTarget })}
              disabled={loading}
            >
              <ArrowUpRightIcon className="h-4 w-4" aria-hidden="true" />
              Confirm escalation
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NotificationPolicyCard({ policy, onToggleChannel, disabled }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <BellAlertIcon className="h-4 w-4" aria-hidden="true" />
        {policy.name}
      </div>
      {policy.description ? <p className="text-sm text-slate-600">{policy.description}</p> : null}
      <dl className="grid grid-cols-2 gap-3 text-xs text-slate-500 sm:grid-cols-4">
        <div>
          <dt className="font-semibold uppercase tracking-wide">Response SLA</dt>
          <dd className="text-sm text-slate-900">{policy.slaMinutes ? `${policy.slaMinutes} min` : 'Not set'}</dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wide">Channels</dt>
          <dd className="flex flex-wrap gap-1 text-sm text-slate-900">
            {Object.entries(policy.channels).map(([channel, enabled]) => (
              <span
                key={channel}
                className={clsx(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold',
                  enabled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-100 text-slate-400'
                )}
              >
                {channelLabels[channel] ?? channel}
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wide">Escalations</dt>
          <dd className="text-sm text-slate-900">{policy.escalationTargets?.length ?? 0}</dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-wide">Last updated</dt>
          <dd className="text-sm text-slate-900">{formatDate(policy.updatedAt)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {Object.keys(policy.channels).map((channel) => {
          const enabled = policy.channels[channel];
          return (
            <button
              key={channel}
              type="button"
              className={clsx(
                'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition',
                enabled
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
              )}
              onClick={() => onToggleChannel(policy, channel, !enabled)}
              disabled={disabled}
            >
              {enabled ? 'Disable' : 'Enable'} {channelLabels[channel] ?? channel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminSupportHub() {
  const { allowed, explanation } = useRoleGuard(['admin']);
  const { session } = useAuth();
  const operatorName = useMemo(() => {
    const user = session?.user ?? {};
    return user.name ?? user.fullName ?? user.displayName ?? user.email ?? 'Support agent';
  }, [session]);

  if (!allowed) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Admin privileges required"
        description={explanation ?? 'You need administrator access to manage the support hub.'}
        actionLabel="Return home"
        onAction={() => {
          window.location.assign('/dashboard');
        }}
      />
    );
  }

  const {
    tenantId,
    setTenantId,
    tenants,
    tenantsLoading,
    tenantsError,
    loading,
    error,
    data,
    lastUpdated,
    stale,
    offline,
    refresh,
    updateData,
    updateTicket,
    updateNotificationPolicy
  } = useSupportDashboard();
  const [actionFeedback, setActionFeedback] = useState(null);
  const [submittingTicketAction, setSubmittingTicketAction] = useState(false);
  const [broadcastState, setBroadcastState] = useState({
    title: '',
    channel: 'in-app',
    scheduledAt: '',
    audienceSize: '',
    message: ''
  });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [tenantErrorAcknowledged, setTenantErrorAcknowledged] = useState(false);
  const [policyPending, setPolicyPending] = useState(null);

  const queueStats = data?.queue?.stats ?? {};
  const backlogTrend = data?.queue?.backlogTrend ?? [];
  const openTickets = data?.queue?.items ?? [];
  const scheduledAnnouncements = data?.communications?.scheduled ?? [];
  const recentAnnouncements = data?.communications?.recent ?? [];
  const knowledgeArticles = data?.knowledgeBase?.flaggedArticles ?? [];
  const knowledgeQueueItems = useMemo(
    () =>
      knowledgeArticles.slice(0, 5).map((article) => ({
        id: article.id,
        subject: article.title ?? 'Untitled article',
        summary: article.category ?? 'Knowledge base',
        reporter: { name: article.owner ?? article.author ?? 'Automation' },
        severity: article.severity ?? 'medium',
        status: 'FLAGGED',
        updatedAt: article.lastUpdated ? formatDate(article.lastUpdated) : null,
        tags: Array.isArray(article.flaggedIssues)
          ? article.flaggedIssues.map((issue) => issue.summary).filter(Boolean)
          : [],
        quickActions: [],
        rawArticle: article
      })),
    [knowledgeArticles]
  );
  const notificationPolicies = data?.settings?.notificationPolicies ?? [];
  const onboardingChecklists = data?.onboarding?.checklists ?? [];

  const summaryMetrics = useMemo(
    () => [
      {
        id: 'open',
        label: 'Open tickets',
        value: formatNumber(queueStats.open),
        icon: QueueListIcon,
        helper: `${formatNumber(queueStats.awaitingAssignment)} awaiting assignment`,
        tone: queueStats.open > 25 ? 'warning' : 'default'
      },
      {
        id: 'breached',
        label: 'Breached SLAs',
        value: formatNumber(queueStats.breached),
        icon: ClockIcon,
        helper: queueStats.slaAttainment !== null ? `${formatPercent(queueStats.slaAttainment, { maximumFractionDigits: 0 })} within SLA` : 'SLA target pending',
        tone: queueStats.breached > 0 ? 'critical' : 'default'
      },
      {
        id: 'csat',
        label: 'CSAT (30d)',
        value: formatPercent(queueStats.csat, { maximumFractionDigits: 1 }),
        icon: ShieldCheckIcon,
        helper: queueStats.nps !== null ? `NPS ${queueStats.nps}` : 'NPS pending',
        tone: queueStats.csat >= 0.9 ? 'success' : 'default'
      },
      {
        id: 'automation',
        label: 'Automation health',
        value: data?.automation?.health?.label ?? 'Operational',
        icon: BoltIcon,
        helper: data?.automation?.health?.notes ?? 'All workflows running'
      }
    ],
    [data?.automation?.health, queueStats]
  );

  const handleTenantChange = (nextTenant) => {
    setTenantId(nextTenant);
  };

  const dismissFeedback = () => setActionFeedback(null);

  const adjustQueueStats = (updater) => {
    updateData((current) => {
      if (!current?.queue?.stats) {
        return current;
      }
      const nextStats = typeof updater === 'function' ? updater(current.queue.stats) : current.queue.stats;
      return {
        ...current,
        queue: {
          ...current.queue,
          stats: { ...current.queue.stats, ...nextStats }
        }
      };
    });
  };

  const handleAssignToMe = async (ticket) => {
    if (!tenantId || !ticket?.id) {
      return;
    }
    setSubmittingTicketAction(true);
    try {
      await assignSupportTicket({
        token: session?.tokens?.accessToken,
        tenantId,
        ticketId: ticket.id,
        assigneeId: session?.user?.id
      });
      updateTicket(ticket.id, () => ({
        ...ticket,
        status: 'in_progress',
        assignee: {
          id: session?.user?.id ?? 'me',
          name: operatorName,
          email: session?.user?.email ?? null
        },
        slaBreached: ticket.slaBreached
      }));
      adjustQueueStats((stats) => ({
        ...stats,
        awaitingAssignment: Math.max(0, (stats.awaitingAssignment ?? 0) - 1)
      }));
      setActionFeedback({
        tone: 'success',
        title: 'Ticket assigned',
        message: `${ticket.reference} is now assigned to you.`
      });
    } catch (err) {
      setActionFeedback({
        tone: 'error',
        title: 'Unable to assign ticket',
        message: err.message ?? 'The support API rejected the assignment request.'
      });
    } finally {
      setSubmittingTicketAction(false);
    }
  };

  const handleResolveTicket = async (ticket) => {
    if (!tenantId || !ticket?.id) {
      return;
    }
    setSubmittingTicketAction(true);
    try {
      await resolveSupportTicket({
        token: session?.tokens?.accessToken,
        tenantId,
        ticketId: ticket.id,
        resolution: {
          summary: 'Marked resolved from support hub',
          resolvedBy: operatorName
        }
      });
      updateData((current) => {
        if (!current?.queue?.items) {
          return current;
        }
        const remaining = current.queue.items.filter((item) => item.id !== ticket.id);
        return {
          ...current,
          queue: {
            ...current.queue,
            items: remaining,
            stats: {
              ...current.queue.stats,
              open: Math.max(0, (current.queue.stats?.open ?? 0) - 1)
            }
          }
        };
      });
      setActionFeedback({
        tone: 'success',
        title: 'Ticket resolved',
        message: `${ticket.reference} has been resolved and removed from the active queue.`
      });
    } catch (err) {
      setActionFeedback({
        tone: 'error',
        title: 'Unable to resolve ticket',
        message: err.message ?? 'Resolving the ticket failed. Please retry once connectivity is restored.'
      });
    } finally {
      setSubmittingTicketAction(false);
    }
  };

  const handleEscalateTicket = async (ticket, { reason, target }) => {
    if (!tenantId || !ticket?.id) {
      return;
    }
    setSubmittingTicketAction(true);
    try {
      await escalateSupportTicket({
        token: session?.tokens?.accessToken,
        tenantId,
        ticketId: ticket.id,
        reason,
        target
      });
      updateTicket(ticket.id, () => ({
        ...ticket,
        escalationLevel: target,
        status: 'escalated'
      }));
      setActionFeedback({
        tone: 'success',
        title: 'Ticket escalated',
        message: `${ticket.reference} has been escalated to ${target}.`
      });
    } catch (err) {
      setActionFeedback({
        tone: 'error',
        title: 'Unable to escalate ticket',
        message: err.message ?? 'Escalation failed. Try again when the support API is available.'
      });
    } finally {
      setSubmittingTicketAction(false);
    }
  };

  const handleToggleChannel = async (policy, channel, enabled) => {
    if (!tenantId || !policy?.id) {
      return;
    }
    setPolicyPending(policy.id);
    const previous = policy.channels[channel];
    updateNotificationPolicy(policy.id, (currentPolicy) => ({
      ...currentPolicy,
      channels: { ...currentPolicy.channels, [channel]: enabled }
    }));
    try {
      await updateSupportNotificationPolicy({
        token: session?.tokens?.accessToken,
        tenantId,
        policyId: policy.id,
        updates: { channels: { ...policy.channels, [channel]: enabled } }
      });
      setActionFeedback({
        tone: 'success',
        title: 'Notification policy updated',
        message: `${policy.name} now ${enabled ? 'includes' : 'excludes'} ${channelLabels[channel] ?? channel}.`
      });
    } catch (err) {
      updateNotificationPolicy(policy.id, (currentPolicy) => ({
        ...currentPolicy,
        channels: { ...currentPolicy.channels, [channel]: previous }
      }));
      setActionFeedback({
        tone: 'error',
        title: 'Notification update failed',
        message: err.message ?? 'We could not persist the notification channel change.'
      });
    } finally {
      setPolicyPending(null);
    }
  };

  const handleBroadcastChange = (field, value) => {
    setBroadcastState((prev) => ({ ...prev, [field]: value }));
  };

  const handleScheduleBroadcast = async (event) => {
    event.preventDefault();
    if (!tenantId || !broadcastState.title || !broadcastState.message) {
      setActionFeedback({
        tone: 'error',
        title: 'Missing details',
        message: 'Provide a title and message before scheduling a broadcast.'
      });
      return;
    }
    setSendingBroadcast(true);
    try {
      const payload = {
        title: broadcastState.title,
        message: broadcastState.message,
        channel: broadcastState.channel,
        scheduledAt: broadcastState.scheduledAt || new Date().toISOString(),
        audienceSize: broadcastState.audienceSize ? Number(broadcastState.audienceSize) : null
      };
      const response = await scheduleSupportBroadcast({
        token: session?.tokens?.accessToken,
        tenantId,
        payload
      });
      const scheduled = response?.broadcast ?? response ?? payload;
      const scheduledEntry = {
        ...scheduled,
        id: scheduled?.id ?? `broadcast-${Date.now()}`,
        channel: scheduled?.channel ?? payload.channel,
        scheduledAt: scheduled?.scheduledAt ?? payload.scheduledAt,
        createdAt: scheduled?.createdAt ?? new Date().toISOString()
      };
      updateData((current) => {
        const existing = current?.communications?.scheduled ?? [];
        return {
          ...current,
          communications: {
            ...current?.communications,
            scheduled: [scheduledEntry, ...existing]
          }
        };
      });
      setBroadcastState({ title: '', channel: 'in-app', scheduledAt: '', audienceSize: '', message: '' });
      setActionFeedback({
        tone: 'success',
        title: 'Broadcast scheduled',
        message: `${payload.title} will be delivered via ${channelLabels[payload.channel] ?? payload.channel}.`
      });
    } catch (err) {
      setActionFeedback({
        tone: 'error',
        title: 'Unable to schedule broadcast',
        message: err.message ?? 'The communications API rejected the scheduling request.'
      });
    } finally {
      setSendingBroadcast(false);
    }
  };

  const pageReady = !loading && !error && tenants.length > 0 && data;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Support and communications</p>
        <h1 className="text-3xl font-semibold text-slate-900">Operator support hub</h1>
        <p className="text-sm text-slate-600">
          Coordinate ticket triage, stakeholder communications, and notification governance across every tenant from a single command centre.
        </p>
      </div>

      {tenantsError && !tenantErrorAcknowledged ? (
        <ActionFeedback
          feedback={{
            tone: 'error',
            title: 'Tenant discovery failed',
            message: tenantsError.message ?? 'We were unable to load the tenant list for the support hub.'
          }}
          onDismiss={() => setTenantErrorAcknowledged(true)}
        />
      ) : null}

      {offline ? <OfflineBanner lastUpdated={lastUpdated} /> : null}
      {stale ? <StaleBanner lastUpdated={lastUpdated} onRefresh={refresh} /> : null}
      <ActionFeedback feedback={actionFeedback} onDismiss={dismissFeedback} />

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <TenantSelector tenants={tenants} tenantId={tenantId} onChange={handleTenantChange} disabled={tenantsLoading || tenants.length === 0} />
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
            onClick={refresh}
            disabled={loading}
          >
            <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
          {lastUpdated ? <span>Last updated {formatDateTime(lastUpdated)}</span> : null}
        </div>
      </div>

      {loading && !data ? (
        <DashboardStateMessage
          variant="loading"
          title="Loading support operations"
          description="Retrieving ticket queues, knowledge base alerts, notification policies, and communications pipelines."
        />
      ) : null}

      {error ? (
        <DashboardStateMessage
          variant="error"
          title="Support operations unavailable"
          description={error.message ?? 'We were unable to load the support hub metrics. Try refreshing once connectivity returns.'}
          actionLabel="Retry"
          onAction={refresh}
        />
      ) : null}

      {pageReady ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryMetrics.map((metric) => (
              <SummaryMetricCard key={metric.id} icon={metric.icon} label={metric.label} value={metric.value} helper={metric.helper} tone={metric.tone} />
            ))}
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Ticket queue</h2>
              <p className="text-sm text-slate-500">{formatNumber(queueStats.open)} tickets · {formatNumber(queueStats.awaitingAssignment)} awaiting assignment</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                {openTickets.length === 0 ? (
                  <DashboardStateMessage
                    title="No open tickets"
                    description="Great news — there are no open tickets in this tenant right now."
                  />
                ) : (
                  openTickets.slice(0, 6).map((ticket) => (
                    <TicketRow
                      key={ticket.id}
                      ticket={ticket}
                      onAssignToMe={handleAssignToMe}
                      onResolve={handleResolveTicket}
                      onEscalate={handleEscalateTicket}
                      loading={submittingTicketAction}
                    />
                  ))
                )}
              </div>
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <SignalIcon className="h-4 w-4" aria-hidden="true" />
                  Backlog trend (7d)
                </div>
                <ul className="flex flex-col gap-3 text-sm text-slate-600">
                  {backlogTrend.length === 0 ? (
                    <li className="text-sm text-slate-500">Trend data not available yet.</li>
                  ) : (
                    backlogTrend.map((point) => (
                      <li key={point.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                        <span>{formatDate(point.date)}</span>
                        <span className="font-semibold text-slate-900">{formatNumber(point.open)} open</span>
                      </li>
                    ))
                  )}
                </ul>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500">
                  <p>
                    Keep backlog under 15 tickets to maintain contractual SLAs. Automation workflows will auto-assign new tickets when load exceeds this threshold.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <MegaphoneIcon className="h-4 w-4" aria-hidden="true" />
                Communications
              </div>
              <form className="flex flex-col gap-3" onSubmit={handleScheduleBroadcast}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-600">
                    Title
                    <input
                      type="text"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={broadcastState.title}
                      onChange={(event) => handleBroadcastChange('title', event.target.value)}
                      required
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    Channel
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={broadcastState.channel}
                      onChange={(event) => handleBroadcastChange('channel', event.target.value)}
                    >
                      <option value="in-app">In-app notification</option>
                      <option value="email">Email campaign</option>
                      <option value="sms">SMS alert</option>
                      <option value="push">Push notification</option>
                    </select>
                  </label>
                </div>
                <label className="text-sm font-medium text-slate-600">
                  Message
                  <textarea
                    className="mt-1 h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    value={broadcastState.message}
                    onChange={(event) => handleBroadcastChange('message', event.target.value)}
                    required
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-600">
                    Scheduled at
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={broadcastState.scheduledAt}
                      onChange={(event) => handleBroadcastChange('scheduledAt', event.target.value)}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    Audience size
                    <input
                      type="number"
                      min="0"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={broadcastState.audienceSize}
                      onChange={(event) => handleBroadcastChange('audienceSize', event.target.value)}
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={sendingBroadcast}
                >
                  <MegaphoneIcon className="h-4 w-4" aria-hidden="true" />
                  Schedule broadcast
                </button>
              </form>
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Scheduled announcements</h3>
                <ul className="mt-2 flex flex-col gap-2 text-sm text-slate-600">
                  {scheduledAnnouncements.length === 0 ? (
                    <li className="text-xs text-slate-500">No announcements scheduled.</li>
                  ) : (
                    scheduledAnnouncements.slice(0, 5).map((item) => (
                      <li key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                        <div>
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500">{channelLabels[item.channel] ?? item.channel}</p>
                        </div>
                        <span className="text-xs text-slate-500">{formatRelativeTime(item.scheduledAt)}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Recent sends</h3>
                <ul className="mt-2 flex flex-col gap-2 text-sm text-slate-600">
                  {recentAnnouncements.length === 0 ? (
                    <li className="text-xs text-slate-500">No communications sent in the last 7 days.</li>
                  ) : (
                    recentAnnouncements.slice(0, 5).map((item) => (
                      <li key={item.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                        <div>
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500">{channelLabels[item.channel] ?? item.channel}</p>
                        </div>
                        <span className="text-xs text-slate-500">Sent {formatRelativeTime(item.createdAt)}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <DocumentMagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />
                Knowledge base governance
              </div>
              <ModerationQueue
                title="Flagged knowledge articles"
                items={knowledgeQueueItems}
                emptyState="All published knowledge base content is current."
              />
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500">
                <p>
                  Knowledge base reviews are due every 90 days. Articles with compliance impact should be reviewed alongside legal and marketing partners before publication.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <PhoneIcon className="h-4 w-4" aria-hidden="true" />
                Notification policies
              </div>
              {notificationPolicies.length === 0 ? (
                <DashboardStateMessage
                  title="No notification policies configured"
                  description="Define response and escalation policies so tenant stakeholders receive timely updates."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {notificationPolicies.map((policy) => (
                    <NotificationPolicyCard
                      key={policy.id}
                      policy={policy}
                      onToggleChannel={handleToggleChannel}
                      disabled={policyPending === policy.id}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <PlayCircleIcon className="h-4 w-4" aria-hidden="true" />
                Onboarding & playbooks
              </div>
              {onboardingChecklists.length === 0 ? (
                <DashboardStateMessage
                  title="No onboarding tasks tracked"
                  description="Use checklists to coordinate enablement tasks across support, success, and operations."
                />
              ) : (
                <ul className="flex flex-col gap-3 text-sm text-slate-600">
                  {onboardingChecklists.slice(0, 6).map((task) => (
                    <li key={task.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <div>
                        <p className="font-semibold text-slate-900">{task.name}</p>
                        {task.owner ? <p className="text-xs text-slate-500">Owner: {task.owner}</p> : null}
                      </div>
                      <span className="text-xs font-semibold text-slate-500">
                        {task.progress !== null ? formatPercent(task.progress, { maximumFractionDigits: 0 }) : 'Not started'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-500">
                <p>
                  Keep onboarding playbooks aligned with your current SLAs, escalation paths, and tooling access so new team members can contribute on day one.
                </p>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
