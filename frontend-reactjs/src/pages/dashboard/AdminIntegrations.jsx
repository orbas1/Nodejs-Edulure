import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowPathIcon,
  BoltIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  KeyIcon,
  ClockIcon,
  NoSymbolIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

import {
  fetchIntegrationDashboard,
  triggerIntegrationRun,
  listIntegrationApiKeys,
  disableIntegrationApiKey,
  listIntegrationApiKeyInvitations,
  createIntegrationApiKeyInvitation,
  resendIntegrationApiKeyInvitation,
  cancelIntegrationApiKeyInvitation
} from '../../api/integrationAdminApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { formatRelativeTime } from '../admin/utils.js';

const HEALTH_THEME = {
  operational: {
    badge: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    dot: 'bg-emerald-500'
  },
  warning: {
    badge: 'bg-amber-50 text-amber-600 ring-amber-100',
    dot: 'bg-amber-500'
  },
  critical: {
    badge: 'bg-rose-50 text-rose-600 ring-rose-100',
    dot: 'bg-rose-500'
  },
  disabled: {
    badge: 'bg-slate-100 text-slate-500 ring-slate-200',
    dot: 'bg-slate-400'
  }
};

const ROTATION_BADGE_THEME = {
  ok: 'bg-emerald-50 text-emerald-700',
  'due-soon': 'bg-amber-50 text-amber-700',
  overdue: 'bg-rose-50 text-rose-700',
  expired: 'bg-rose-50 text-rose-700',
  disabled: 'bg-slate-200 text-slate-600'
};

const STATUS_BADGE_THEME = {
  operational: {
    label: 'Operational',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  },
  degraded: {
    label: 'Degraded',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200'
  },
  critical: {
    label: 'Incident',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200'
  }
};

const CALL_TONE_CLASSES = {
  success: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  failure: 'bg-rose-500'
};

function formatTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (remaining === 0) return `${minutes}m`;
  return `${minutes}m ${remaining}s`;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat().format(value);
}

function calculatePercentage(value, total) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return Math.round((value / total) * 100);
}

function StatusStateBadge({ state }) {
  const theme = STATUS_BADGE_THEME[state] ?? STATUS_BADGE_THEME.operational;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${theme.badge}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {theme.label}
    </span>
  );
}

function IntegrationStatusInsights({ statusDetails, callSummary }) {
  if (!statusDetails && !callSummary) {
    return null;
  }

  const totalCalls = callSummary?.total ?? 0;
  const callRows = callSummary
    ? [
        { key: 'success', label: 'Successful', value: callSummary.success ?? 0 },
        { key: 'degraded', label: 'Degraded', value: callSummary.degraded ?? 0 },
        { key: 'failure', label: 'Failed', value: callSummary.failure ?? 0 }
      ]
    : [];

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {statusDetails && (
        <article
          className={`rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-inner ${
            callSummary ? 'lg:col-span-2' : 'lg:col-span-3'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status insights</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <StatusStateBadge state={statusDetails.state} />
                {statusDetails.summary && (
                  <span className="text-sm font-medium text-slate-700">{statusDetails.summary}</span>
                )}
              </div>
            </div>
            {statusDetails.updatedAt && (
              <span className="text-[11px] text-slate-500">
                Updated {formatTimestamp(statusDetails.updatedAt)}
              </span>
            )}
          </div>

          <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Run snapshot
              </dt>
              <dd className="space-y-1">
                <p className="flex items-center gap-2 text-slate-700">
                  <BoltIcon className="h-4 w-4" />
                  {statusDetails.latestSyncRunId ? `Run ${statusDetails.latestSyncRunId}` : 'No runs recorded'}
                </p>
                <p className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-slate-400" />
                  Last success {formatTimestamp(statusDetails.lastSuccessAt)}
                </p>
                <p className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                  Last failure {formatTimestamp(statusDetails.lastFailureAt)}
                </p>
              </dd>
            </div>
            <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Incident posture
              </dt>
              <dd className="grid gap-1 text-sm font-medium text-slate-700 sm:grid-cols-2">
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-center">
                  {formatNumber(statusDetails.consecutiveFailures ?? 0)}
                  <span className="ml-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    failure streak
                  </span>
                </span>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-center">
                  {formatNumber(statusDetails.openIncidents ?? 0)}
                  <span className="ml-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    incidents open
                  </span>
                </span>
              </dd>
            </div>
          </dl>
        </article>
      )}

      {callSummary && (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">External call summary</p>
          <p className="mt-2 text-sm text-slate-600">
            {totalCalls > 0
              ? `${formatNumber(totalCalls)} tracked requests across provider APIs`
              : 'No external requests recorded in the current window'}
          </p>
          <div className="mt-4 space-y-3">
            {callRows.map((row) => {
              const percent = calculatePercentage(row.value, totalCalls);
              return (
                <div key={row.key} className="space-y-1 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>{row.label}</span>
                    <span className="text-xs font-semibold text-slate-500">
                      {formatNumber(row.value)} · {percent}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200">
                    <div
                      className={`h-2 rounded-full ${CALL_TONE_CLASSES[row.key] ?? 'bg-slate-500'}`}
                      style={{ width: `${Math.max(percent, 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      )}
    </section>
  );
}

function HealthBadge({ health }) {
  const theme = HEALTH_THEME[health] ?? HEALTH_THEME.operational;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${theme.badge}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${theme.dot}`} />
      {health === 'operational' && 'Operational'}
      {health === 'warning' && 'Needs attention'}
      {health === 'critical' && 'Action required'}
      {health === 'disabled' && 'Disabled'}
    </span>
  );
}

function SummaryCard({ title, value, description, icon: Icon, tone }) {
  const toneClasses = useMemo(() => {
    switch (tone) {
      case 'warning':
        return 'text-amber-600 bg-amber-50';
      case 'critical':
        return 'text-rose-600 bg-rose-50';
      case 'success':
        return 'text-emerald-600 bg-emerald-50';
      default:
        return 'text-slate-600 bg-slate-100';
    }
  }, [tone]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClasses}`}>
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
          {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
        </div>
      </div>
    </div>
  );
}

function IntegrationSummaryMetrics({ integration }) {
  const metrics = useMemo(() => {
    const summary = integration.summary ?? {};
    return [
      {
        title: 'Success rate',
        value: summary.successRate != null ? `${summary.successRate}%` : '—',
        description: 'Calculated from the last 12 runs',
        icon: ShieldCheckIcon,
        tone: summary.successRate >= 95 ? 'success' : summary.successRate >= 80 ? 'warning' : 'critical'
      },
      {
        title: 'Records pushed',
        value: formatNumber(summary.recordsPushed),
        description: 'Processed during the recent run window',
        icon: CloudArrowUpIcon,
        tone: 'neutral'
      },
      {
        title: 'Failures detected',
        value: formatNumber(summary.openFailures),
        description: 'Pending remediation items from failure log',
        icon: ExclamationTriangleIcon,
        tone: summary.openFailures > 0 ? 'warning' : 'success'
      }
    ];
  }, [integration.summary]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric) => (
        <SummaryCard key={metric.title} {...metric} />
      ))}
    </div>
  );
}

function RotationStatusBadge({ status }) {
  const theme = ROTATION_BADGE_THEME[status] ?? ROTATION_BADGE_THEME.ok;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${theme}`}>
      {status === 'ok' && 'Up to date'}
      {status === 'due-soon' && 'Rotation due soon'}
      {status === 'overdue' && 'Rotation overdue'}
      {status === 'expired' && 'Expired'}
      {status === 'disabled' && 'Disabled'}
    </span>
  );
}

function describeRotationWindow(key) {
  if (key.status === 'disabled') {
    return 'Key disabled';
  }
  if (key.rotationStatus === 'expired') {
    return key.expiresAt ? `Expired ${formatTimestamp(key.expiresAt)}` : 'Expired';
  }
  if (key.nextRotationAt) {
    return `Next rotation ${formatTimestamp(key.nextRotationAt)}`;
  }
  return 'Rotation cadence not configured';
}

function ApiKeyTable({ apiKeys, loading, onRotateRequest, onDisable, disableState, pendingRotationMap = {} }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Loading API key catalogue…
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-2">Provider</th>
            <th className="px-4 py-2">Alias</th>
            <th className="px-4 py-2">Owner</th>
            <th className="px-4 py-2">Rotation</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {apiKeys.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={6}>
                No API keys stored yet. Capture tenant credentials to unlock AI routing.
              </td>
            </tr>
          )}
          {apiKeys.map((key) => {
            const disableStatus = disableState[key.id];
            return (
              <tr key={key.id} className="whitespace-nowrap text-sm text-slate-600">
                <td className="px-4 py-3 font-medium text-slate-700">{key.providerLabel}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800">{key.alias}</span>
                    <span className="text-xs text-slate-500">•••• {key.lastFour}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span>{key.ownerEmail}</span>
                    {key.metadata?.lastRotatedBy && (
                      <span className="text-xs text-slate-500">Last rotated by {key.metadata.lastRotatedBy}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  <div className="flex flex-col gap-1">
                    <span>{describeRotationWindow(key)}</span>
                    {key.rotationHistory?.[0] && (
                      <span className="text-xs">
                        Rotated {formatTimestamp(key.rotationHistory[0].rotatedAt)}
                      </span>
                    )}
                    {typeof key.daysUntilRotation === 'number' && key.status !== 'disabled' && (
                      <span className="text-xs text-slate-400">
                        {key.daysUntilRotation >= 0
                          ? `${key.daysUntilRotation} days remaining`
                          : `${Math.abs(key.daysUntilRotation)} days overdue`}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <RotationStatusBadge status={key.rotationStatus} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={() => onRotateRequest(key)}
                      disabled={key.status === 'disabled' || pendingRotationMap[key.id]}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${
                        key.status === 'disabled' || pendingRotationMap[key.id]
                          ? 'bg-slate-200 text-slate-500'
                          : 'bg-slate-900 text-white hover:bg-slate-700'
                      }`}
                    >
                      {pendingRotationMap[key.id] ? 'Invite pending' : 'Request rotation'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDisable(key)}
                      disabled={key.status === 'disabled' || disableStatus === 'pending'}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-rose-700 transition focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 disabled:text-rose-300"
                    >
                      {disableStatus === 'pending' ? 'Disabling…' : key.status === 'disabled' ? 'Disabled' : 'Disable'}
                    </button>
                    {disableStatus && disableStatus !== 'pending' && key.status !== 'disabled' && (
                      <span className="text-xs text-rose-600">{disableStatus}</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InvitationTable({ invitations, loading, error, onResend, onCancel }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Loading credential invitations…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error.message}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-2">Provider</th>
            <th className="px-4 py-2">Alias</th>
            <th className="px-4 py-2">Owner</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Expires</th>
            <th className="px-4 py-2">Last sent</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invitations.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={7}>
                No invitations pending. Send a request to collect a credential from the owner.
              </td>
            </tr>
          )}
          {invitations.map((invite) => {
            const isPending = invite.status === 'pending';
            return (
              <tr key={invite.id} className="whitespace-nowrap text-sm text-slate-600">
                <td className="px-4 py-3 font-medium text-slate-700">{invite.providerLabel}</td>
                <td className="px-4 py-3">{invite.alias}</td>
                <td className="px-4 py-3">{invite.ownerEmail}</td>
                <td className="px-4 py-3 text-slate-500 capitalize">{invite.status}</td>
                <td className="px-4 py-3">{invite.expiresAt ? formatTimestamp(invite.expiresAt) : '—'}</td>
                <td className="px-4 py-3">{invite.lastSentAt ? formatTimestamp(invite.lastSentAt) : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onResend(invite)}
                      disabled={!isPending}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:border-slate-200 disabled:text-slate-400"
                    >
                      Resend
                    </button>
                    <button
                      type="button"
                      onClick={() => onCancel(invite)}
                      disabled={!isPending}
                      className="rounded-full border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-400 hover:text-rose-900 disabled:border-rose-100 disabled:text-rose-300"
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ApiKeyCreateForm({
  form,
  onChange,
  onSubmit,
  errors,
  status,
  message
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Request new credential</h3>
        {status === 'success' && (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircleIcon className="h-4 w-4" /> Invite sent
          </span>
        )}
        {status === 'error' && (
          <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            <ExclamationTriangleIcon className="h-4 w-4" /> Error
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Send a locked submission link directly to the credential owner. They paste the secret themselves—platform admins never handle API keys in the dashboard.
      </p>
      {message && (
        <p className={`text-xs ${status === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>{message}</p>
      )}
      <div className="grid gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="api-key-provider">
          Provider
        </label>
        <select
          id="api-key-provider"
          value={form.provider}
          onChange={(event) => onChange('provider', event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic Claude</option>
          <option value="grok">XAI Grok</option>
          <option value="azure-openai">Azure OpenAI</option>
          <option value="google-vertex">Google Vertex AI</option>
        </select>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="api-key-environment">
          Environment
        </label>
        <select
          id="api-key-environment"
          value={form.environment}
          onChange={(event) => onChange('environment', event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          <option value="production">Production</option>
          <option value="staging">Staging</option>
          <option value="sandbox">Sandbox</option>
        </select>
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="api-key-alias">
          Alias
        </label>
        <input
          id="api-key-alias"
          value={form.alias}
          onChange={(event) => onChange('alias', event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Content Studio Bot"
        />
        {errors.alias && <p className="text-xs text-rose-600">{errors.alias}</p>}
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="api-key-owner">
          Owner email
        </label>
        <input
          id="api-key-owner"
          type="email"
          value={form.ownerEmail}
          onChange={(event) => onChange('ownerEmail', event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="integrations.lead@example.com"
        />
        {errors.ownerEmail && <p className="text-xs text-rose-600">{errors.ownerEmail}</p>}
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="api-key-rotation">
          Rotation cadence (days)
        </label>
        <input
          id="api-key-rotation"
          type="number"
          min={30}
          max={365}
          value={form.rotationIntervalDays}
          onChange={(event) => onChange('rotationIntervalDays', event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
        {errors.rotationIntervalDays && <p className="text-xs text-rose-600">{errors.rotationIntervalDays}</p>}
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="api-key-expiry">
          Expires on (optional)
        </label>
        <input
          id="api-key-expiry"
          type="date"
          value={form.keyExpiresAt}
          onChange={(event) => onChange('keyExpiresAt', event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="api-key-reason">
          Business justification
        </label>
        <input
          id="api-key-reason"
          value={form.reason}
          onChange={(event) => onChange('reason', event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Describe why access is required"
        />
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="api-key-notes">
          Notes (optional)
        </label>
        <textarea
          id="api-key-notes"
          value={form.notes}
          onChange={(event) => onChange('notes', event.target.value)}
          className="h-16 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="Describe use case or integration scope"
        />
      </div>
      {status === 'success' && message && <p className="text-xs text-emerald-600">{message}</p>}
      {status === 'error' && message && <p className="text-xs text-rose-600">{message}</p>}
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:bg-slate-400"
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? 'Sending…' : (
          <>
            <PlusIcon className="h-4 w-4" /> Send invite
          </>
        )}
      </button>
    </form>
  );
}

function ApiKeyRotationForm({ draft, onChange, onSubmit, onCancel }) {
  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Request rotation for {draft.alias}
          </h3>
          <p className="text-xs text-slate-500">Send a secure invite for the owner to submit the replacement credential.</p>
        </div>
        <div className="flex items-center gap-2">
          {draft.status === 'success' && (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircleIcon className="h-4 w-4" /> {draft.message ?? 'Invite sent'}
            </span>
          )}
          {draft.status === 'error' && (
            <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
              <ExclamationTriangleIcon className="h-4 w-4" /> {draft.message}
            </span>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
          >
            Cancel
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="rotation-owner">
            Owner email
          </label>
          <input
            id="rotation-owner"
            type="email"
            value={draft.ownerEmail ?? ''}
            onChange={(event) => onChange('ownerEmail', event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="integrations.lead@example.com"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="rotation-days">
            Rotation cadence (days)
          </label>
          <input
            id="rotation-days"
            type="number"
            min={30}
            max={365}
            value={draft.rotationIntervalDays}
            onChange={(event) => onChange('rotationIntervalDays', event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="rotation-expiry">
            Rotation deadline (optional)
          </label>
          <input
            id="rotation-expiry"
            type="date"
            value={draft.keyExpiresAt ?? ''}
            onChange={(event) => onChange('keyExpiresAt', event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="rotation-reason">
            Rotation reason
          </label>
          <input
            id="rotation-reason"
            value={draft.reason ?? ''}
            onChange={(event) => onChange('reason', event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Scheduled rotation"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="rotation-notes">
            Notes (optional)
          </label>
          <textarea
            id="rotation-notes"
            value={draft.notes ?? ''}
            onChange={(event) => onChange('notes', event.target.value)}
            className="h-16 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Document escalation or incident context"
          />
        </div>
      </div>
      {draft.status === 'success' && draft.claimUrl && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          <p>Share this claim link securely if the owner needs manual access:</p>
          <p className="truncate font-mono">{draft.claimUrl}</p>
        </div>
      )}
      {draft.status === 'error' && !draft.message && (
        <p className="text-xs text-rose-600">Rotation invite failed. Please try again.</p>
      )}
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:bg-slate-400"
        disabled={draft.status === 'submitting'}
      >
        {draft.status === 'submitting' ? 'Sending…' : 'Send rotation invite'}
      </button>
    </form>
  );
}

function IntegrationRunsTable({ runs }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-2">Run</th>
            <th className="px-4 py-2">Triggered by</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Duration</th>
            <th className="px-4 py-2">Pushed</th>
            <th className="px-4 py-2">Failed</th>
            <th className="px-4 py-2">Finished</th>
            <th className="px-4 py-2">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {runs.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={8}>
                No sync activity logged in the selected window.
              </td>
            </tr>
          )}
          {runs.map((run) => (
            <tr key={run.id} className="whitespace-nowrap text-sm text-slate-600">
              <td className="px-4 py-3 font-medium text-slate-700">{run.correlationId ?? run.id}</td>
              <td className="px-4 py-3 capitalize">{run.triggeredBy?.replace('-', ' ') ?? '—'}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    run.status === 'succeeded'
                      ? 'bg-emerald-50 text-emerald-700'
                      : run.status === 'partial'
                        ? 'bg-amber-50 text-amber-700'
                        : run.status === 'running'
                          ? 'bg-sky-50 text-sky-700'
                          : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {run.status ?? 'unknown'}
                </span>
              </td>
              <td className="px-4 py-3">{formatDuration(run.durationSeconds)}</td>
              <td className="px-4 py-3">{formatNumber(run.records?.pushed)}</td>
              <td className="px-4 py-3">{formatNumber(run.records?.failed)}</td>
              <td className="px-4 py-3">{formatTimestamp(run.finishedAt)}</td>
              <td className="px-4 py-3 text-slate-500">{run.lastError ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FailureLog({ entries }) {
  return (
    <ol className="space-y-3">
      {entries.length === 0 && (
        <li className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          No outstanding errors detected.
        </li>
      )}
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold">{entry.entityId ?? entry.externalId ?? entry.id}</p>
            <span className="text-xs text-amber-600">{formatTimestamp(entry.occurredAt)}</span>
          </div>
          <p className="mt-1 text-xs text-amber-700">{entry.message ?? 'Failure detected'}</p>
          <p className="mt-1 text-xs text-amber-500">
            {entry.operation} · {entry.direction} · Retries {entry.retryCount}
          </p>
        </li>
      ))}
    </ol>
  );
}

function ReconciliationPanel({ reconciliation }) {
  if (!reconciliation || reconciliation.reports.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        No reconciliation reports generated in the recent window.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reconciliation.reports.map((report) => (
        <div key={report.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Report {report.id}</p>
              <p className="text-xs text-slate-500">
                Generated {formatTimestamp(report.generatedAt)} · {report.mismatchCount} mismatches
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {report.status}
            </span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Missing in platform</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-600">
                {report.missingInPlatform.length === 0 && <li>None</li>}
                {report.missingInPlatform.map((entry) => (
                  <li key={entry.id}>
                    <span className="font-medium text-slate-700">{entry.name ?? entry.entityId}</span>
                    {entry.email && <span className="text-slate-500"> · {entry.email}</span>}
                    {entry.reason && <span className="text-slate-500"> · {entry.reason}</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Missing in CRM</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-600">
                {report.missingInIntegration.length === 0 && <li>None</li>}
                {report.missingInIntegration.map((entry) => (
                  <li key={entry.id}>
                    <span className="font-medium text-slate-700">{entry.name ?? entry.entityId}</span>
                    {entry.email && <span className="text-slate-500"> · {entry.email}</span>}
                    {entry.reason && <span className="text-slate-500"> · {entry.reason}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminIntegrations() {
  const { session } = useAuth();
  const resolvedRole = typeof session?.user?.role === 'string' && session.user.role.length > 0;
  const isAdmin = resolvedRole && session.user.role.toLowerCase() === 'admin';
  const token = session?.tokens?.accessToken;
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionState, setActionState] = useState({ integration: null, status: 'idle', message: null });
  const [apiKeys, setApiKeys] = useState([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(true);
  const [apiKeysError, setApiKeysError] = useState(null);
  const [apiKeyRefreshToken, setApiKeyRefreshToken] = useState(0);
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [invitesError, setInvitesError] = useState(null);
  const [inviteRefreshToken, setInviteRefreshToken] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [createForm, setCreateForm] = useState({
    provider: 'openai',
    environment: 'production',
    alias: '',
    ownerEmail: '',
    rotationIntervalDays: 90,
    keyExpiresAt: '',
    notes: '',
    reason: ''
  });
  const [createFormErrors, setCreateFormErrors] = useState({});
  const [createStatus, setCreateStatus] = useState('idle');
  const [createMessage, setCreateMessage] = useState(null);
  const [rotationDraft, setRotationDraft] = useState(null);
  const [disableState, setDisableState] = useState({});
  const [inviteToast, setInviteToast] = useState(null);
  const dashboardAbortRef = useRef(null);
  const mountedRef = useRef(false);
  const spinnerControllerRef = useRef(null);

  if (!isAdmin) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Admin privileges required"
        description="Only administrators can review integration health and manage API credentials."
      />
    );
  }

  const loadDashboard = useCallback(
    async ({ showSpinner = true } = {}) => {
      if (!token || !isAdmin) return;

      const controller = new AbortController();
      const previousController = dashboardAbortRef.current;
      const previousSpinnerOwner = spinnerControllerRef.current === previousController;
      if (previousController) {
        previousController.abort();
      }
      dashboardAbortRef.current = controller;

      if (showSpinner) {
        spinnerControllerRef.current = controller;
      } else if (previousSpinnerOwner) {
        spinnerControllerRef.current = controller;
      }

      if (spinnerControllerRef.current === controller && mountedRef.current) {
        setLoading(true);
      }

      try {
        const payload = await fetchIntegrationDashboard({ token, signal: controller.signal });
        if (controller.signal.aborted || !mountedRef.current) {
          return;
        }
        setDashboard(payload ?? {});
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        if (controller.signal.aborted || err?.name === 'AbortError' || err?.message === 'canceled' || !mountedRef.current) {
          return;
        }
        setError(err instanceof Error ? err : new Error('Failed to load integration dashboard'));
      } finally {
        const isCurrent = dashboardAbortRef.current === controller;
        if (isCurrent) {
          dashboardAbortRef.current = null;
        }
        if (spinnerControllerRef.current === controller) {
          spinnerControllerRef.current = null;
          if (mountedRef.current) {
            setLoading(false);
          }
        }
      }
    },
    [token, isAdmin]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (dashboardAbortRef.current) {
        dashboardAbortRef.current.abort();
        dashboardAbortRef.current = null;
      }
      spinnerControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!token || !isAdmin) return undefined;
    loadDashboard({ showSpinner: true });
    return () => {
      if (dashboardAbortRef.current) {
        dashboardAbortRef.current.abort();
      }
    };
  }, [token, isAdmin, loadDashboard]);

  useEffect(() => {
    if (!autoRefresh || !token || !isAdmin) return undefined;
    const interval = setInterval(() => {
      loadDashboard({ showSpinner: false });
    }, 120_000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadDashboard, token, isAdmin]);

  useEffect(() => {
    if (!token || !isAdmin) return undefined;
    const controller = new AbortController();
    setApiKeysLoading(true);
    listIntegrationApiKeys({ token, signal: controller.signal })
      .then((payload) => {
        setApiKeys(Array.isArray(payload) ? payload : []);
        setApiKeysError(null);
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || err?.message === 'canceled') {
          return;
        }
        setApiKeysError(err instanceof Error ? err : new Error('Failed to load API keys'));
      })
      .finally(() => setApiKeysLoading(false));

    return () => {
      controller.abort();
    };
  }, [token, apiKeyRefreshToken, isAdmin]);

  useEffect(() => {
    if (!token || !isAdmin) return undefined;
    const controller = new AbortController();
    setInvitesLoading(true);
    listIntegrationApiKeyInvitations({ token, signal: controller.signal })
      .then((payload) => {
        setInvites(Array.isArray(payload) ? payload : []);
        setInvitesError(null);
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || err?.message === 'canceled') {
          return;
        }
        setInvitesError(err instanceof Error ? err : new Error('Failed to load credential invitations'));
      })
      .finally(() => setInvitesLoading(false));

    return () => {
      controller.abort();
    };
  }, [token, inviteRefreshToken, isAdmin]);

  useEffect(() => {
    if (actionState.status === 'success' || actionState.status === 'error') {
      const timeout = setTimeout(() => {
        setActionState({ integration: null, status: 'idle', message: null });
      }, 4000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [actionState]);

  useEffect(() => {
    if (createStatus === 'success' || createStatus === 'error') {
      const timeout = setTimeout(() => {
        setCreateStatus('idle');
        setCreateMessage(null);
      }, 4000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [createStatus]);

  useEffect(() => {
    if (!rotationDraft) {
      return undefined;
    }
    if (rotationDraft.status === 'success') {
      const timeout = setTimeout(() => {
        setRotationDraft(null);
      }, 3000);
      return () => clearTimeout(timeout);
    }
    if (rotationDraft.status === 'error') {
      const timeout = setTimeout(() => {
        setRotationDraft((draft) => (draft ? { ...draft, status: 'idle', message: null } : null));
      }, 4000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [rotationDraft]);

  useEffect(() => {
    if (!inviteToast) {
      return undefined;
    }
    const timeout = setTimeout(() => {
      setInviteToast(null);
    }, 10000);
    return () => clearTimeout(timeout);
  }, [inviteToast]);

  const handleRefresh = () => {
    loadDashboard({ showSpinner: true });
  };

  const handleManualSync = async (integration) => {
    if (!token || !isAdmin) return;
    setActionState({ integration, status: 'pending', message: null });
    try {
      await triggerIntegrationRun({ token, integration });
      setActionState({ integration, status: 'success', message: 'Sync triggered successfully' });
      await loadDashboard({ showSpinner: false });
    } catch (err) {
      setActionState({
        integration,
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to trigger sync'
      });
    }
  };

  const handleCreateChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    setCreateFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    if (!token || !isAdmin) return;

    const trimmedAlias = createForm.alias.trim();
    const trimmedOwner = createForm.ownerEmail.trim();
    const rotationDays = Number(createForm.rotationIntervalDays);
    const trimmedNotes = createForm.notes?.trim() ?? '';
    const trimmedReason = createForm.reason?.trim() ?? '';

    const errors = {};
    if (!trimmedAlias || trimmedAlias.length < 3) {
      errors.alias = 'Alias must be at least 3 characters';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedOwner)) {
      errors.ownerEmail = 'Enter a valid email';
    }
    if (!Number.isFinite(rotationDays) || rotationDays < 30 || rotationDays > 365) {
      errors.rotationIntervalDays = 'Rotation cadence must be between 30 and 365 days';
    }

    if (Object.keys(errors).length > 0) {
      setCreateFormErrors(errors);
      setCreateStatus('error');
      setCreateMessage('Please resolve the highlighted validation issues');
      return;
    }

    setCreateStatus('submitting');
    setCreateMessage(null);
    setInviteToast(null);

    try {
      const response = await createIntegrationApiKeyInvitation({
        token,
        provider: createForm.provider,
        environment: createForm.environment,
        alias: trimmedAlias,
        ownerEmail: trimmedOwner,
        rotationIntervalDays: rotationDays,
        keyExpiresAt: createForm.keyExpiresAt || undefined,
        notes: trimmedNotes || undefined,
        reason: trimmedReason || undefined,
        requestedByName: session?.user?.name ?? session?.user?.email ?? undefined
      });
      setCreateStatus('success');
      setCreateMessage(`Invitation sent to ${trimmedOwner}.`);
      setInviteToast({
        type: 'success',
        message: `Secure invite ready for ${trimmedOwner}.`,
        claimUrl: response?.claimUrl ?? null
      });
      setCreateForm({
        provider: createForm.provider,
        environment: createForm.environment,
        alias: '',
        ownerEmail: trimmedOwner,
        rotationIntervalDays: rotationDays,
        keyExpiresAt: '',
        notes: '',
        reason: ''
      });
      setCreateFormErrors({});
      setInviteRefreshToken((value) => value + 1);
    } catch (err) {
      setCreateStatus('error');
      setCreateMessage(err?.message ?? 'Unable to send invitation');
    }
  };

  const handleRotateRequest = (record) => {
    setRotationDraft({
      id: record.id,
      alias: record.alias,
      provider: record.provider,
      environment: record.environment ?? 'production',
      ownerEmail: record.ownerEmail,
      rotationIntervalDays: record.rotationIntervalDays,
      keyExpiresAt: record.expiresAt ? record.expiresAt.slice(0, 10) : '',
      reason: 'Scheduled rotation',
      notes: record.metadata?.notes ?? '',
      status: 'idle',
      message: null
    });
  };

  const handleRotationChange = (field, value) => {
    setRotationDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleRotationSubmit = async (event) => {
    event.preventDefault();
    if (!rotationDraft || !token) {
      return;
    }

    const rotationDays = Number(rotationDraft.rotationIntervalDays);
    const trimmedOwner = rotationDraft.ownerEmail?.trim() ?? '';
    const trimmedNotes = rotationDraft.notes?.trim() ?? '';
    const trimmedReason = rotationDraft.reason?.trim() ?? '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedOwner)) {
      setRotationDraft((prev) =>
        prev
          ? { ...prev, status: 'error', message: 'Enter a valid owner email before requesting rotation' }
          : prev
      );
      return;
    }

    if (!Number.isFinite(rotationDays) || rotationDays < 30 || rotationDays > 365) {
      setRotationDraft((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              message: 'Rotation cadence must be between 30 and 365 days'
            }
          : prev
      );
      return;
    }

    setRotationDraft((prev) => (prev ? { ...prev, status: 'submitting', message: null } : prev));
    setInviteToast(null);

    try {
      const response = await createIntegrationApiKeyInvitation({
        token,
        provider: rotationDraft.provider,
        environment: rotationDraft.environment,
        alias: rotationDraft.alias,
        ownerEmail: trimmedOwner,
        rotationIntervalDays: rotationDays,
        keyExpiresAt: rotationDraft.keyExpiresAt || undefined,
        reason: trimmedReason || undefined,
        notes: trimmedNotes || undefined,
        apiKeyId: rotationDraft.id,
        requestedByName: session?.user?.name ?? session?.user?.email ?? undefined
      });
      setRotationDraft((prev) =>
        prev
          ? {
              ...prev,
              status: 'success',
              message: 'Rotation invitation sent successfully',
              claimUrl: response?.claimUrl ?? null
            }
          : prev
      );
      setInviteToast({
        type: 'success',
        message: `Rotation invite ready for ${trimmedOwner}.`,
        claimUrl: response?.claimUrl ?? null
      });
      setInviteRefreshToken((value) => value + 1);
    } catch (err) {
      setRotationDraft((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              message: err?.message ?? 'Unable to issue rotation invitation'
            }
          : prev
      );
    }
  };

  const handleRotationCancel = () => {
    setRotationDraft(null);
  };

  const handleDisable = async (record) => {
    if (!token || !isAdmin || record.status === 'disabled') {
      return;
    }
    if (disableState[record.id] === 'pending') {
      return;
    }
    const confirmed = typeof window !== 'undefined'
      ? window.confirm('Disable this API key? This revokes access for downstream services immediately.')
      : true;
    if (!confirmed) {
      return;
    }
    setDisableState((prev) => ({ ...prev, [record.id]: 'pending' }));
    try {
      await disableIntegrationApiKey({ token, id: record.id, reason: 'Manually revoked from integrations dashboard' });
      setDisableState((prev) => ({ ...prev, [record.id]: 'Disabled' }));
      setApiKeyRefreshToken((value) => value + 1);
    } catch (err) {
      setDisableState((prev) => ({ ...prev, [record.id]: err?.message ?? 'Disable failed' }));
    } finally {
      setTimeout(() => {
        setDisableState((prev) => ({ ...prev, [record.id]: undefined }));
      }, 4000);
    }
  };

  const handleInviteResend = async (invite) => {
    if (!token || !isAdmin) {
      return;
    }
    setInviteToast(null);
    try {
      const response = await resendIntegrationApiKeyInvitation({
        token,
        id: invite.id,
        requestedByName: session?.user?.name ?? session?.user?.email ?? undefined
      });
      setInviteToast({
        type: 'success',
        message: `Invitation resent to ${invite.ownerEmail}.`,
        claimUrl: response?.claimUrl ?? null
      });
      setInviteRefreshToken((value) => value + 1);
    } catch (err) {
      setInviteToast({ type: 'error', message: err?.message ?? 'Unable to resend invitation' });
    }
  };

  const handleInviteCancel = async (invite) => {
    if (!token || !isAdmin) {
      return;
    }
    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm('Cancel this invitation? The owner will no longer be able to submit the credential using the issued link.');
    if (!confirmed) {
      return;
    }
    setInviteToast(null);
    try {
      await cancelIntegrationApiKeyInvitation({ token, id: invite.id });
      setInviteToast({ type: 'success', message: `Invitation cancelled for ${invite.ownerEmail}.` });
      setInviteRefreshToken((value) => value + 1);
    } catch (err) {
      setInviteToast({ type: 'error', message: err?.message ?? 'Unable to cancel invitation' });
    }
  };

  const concurrencyMetrics = useMemo(() => {
    const active = dashboard?.concurrency?.activeJobs ?? 0;
    const max = dashboard?.concurrency?.maxConcurrentJobs ?? 0;
    return [
      {
        title: 'Active jobs',
        value: formatNumber(active),
        description: `Out of ${max} concurrent slots`,
        icon: BoltIcon,
        tone: active > 0 ? 'warning' : 'success'
      },
      {
        title: 'Snapshot generated',
        value: dashboard?.generatedAt ? formatTimestamp(dashboard.generatedAt) : '—',
        description: 'Latest poll time',
        icon: ArrowPathIcon,
        tone: 'neutral'
      },
      {
        title: 'Integrations monitored',
        value: formatNumber(dashboard?.integrations?.length ?? 0),
        description: 'CRM connectors with telemetry',
        icon: CheckCircleIcon,
        tone: 'neutral'
      }
    ];
  }, [dashboard]);

  const pendingRotationMap = useMemo(() => {
    const map = {};
    invites
      .filter((invite) => invite.apiKeyId && invite.status === 'pending')
      .forEach((invite) => {
        map[invite.apiKeyId] = true;
      });
    return map;
  }, [invites]);

  const apiKeyInsights = useMemo(() => {
    const pendingInvites = invites.filter((invite) => invite.status === 'pending').length;

    if (!apiKeys || apiKeys.length === 0) {
      return [
        {
          title: 'Managed keys',
          value: '0',
          description: 'BYO credentials stored',
          icon: KeyIcon,
          tone: 'warning'
        },
        {
          title: 'Pending invites',
          value: formatNumber(pendingInvites),
          description: 'Awaiting owner action',
          icon: PlusIcon,
          tone: pendingInvites > 0 ? 'warning' : 'success'
        },
        {
          title: 'Rotation alerts',
          value: '0',
          description: 'No upcoming reminders',
          icon: ClockIcon,
          tone: 'success'
        }
      ];
    }

    const total = apiKeys.length;
    const overdue = apiKeys.filter((key) => key.rotationStatus === 'overdue').length;
    const dueSoon = apiKeys.filter((key) => key.rotationStatus === 'due-soon').length;
    const disabled = apiKeys.filter((key) => key.status === 'disabled').length;

    return [
      {
        title: 'Managed keys',
        value: formatNumber(total),
        description: 'BYO credentials stored',
        icon: KeyIcon,
        tone: 'neutral'
      },
      {
        title: 'Pending invites',
        value: formatNumber(pendingInvites),
        description: 'Awaiting owner action',
        icon: PlusIcon,
        tone: pendingInvites > 0 ? 'warning' : 'success'
      },
      {
        title: 'Rotation alerts',
        value: formatNumber(overdue + dueSoon),
        description: `${overdue} overdue · ${dueSoon} due soon`,
        icon: ClockIcon,
        tone: overdue > 0 ? 'critical' : dueSoon > 0 ? 'warning' : 'success'
      },
      {
        title: 'Disabled keys',
        value: formatNumber(disabled),
        description: 'Revoked or compromised credentials',
        icon: NoSymbolIcon,
        tone: disabled > 0 ? 'warning' : 'neutral'
      }
    ];
  }, [apiKeys, invites]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return null;
    return formatRelativeTime(lastUpdated) ?? lastUpdated.toLocaleTimeString();
  }, [lastUpdated]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Integration control centre</h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor CRM sync health, reconcile mismatches, and trigger manual retries with full telemetry coverage.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 text-xs text-slate-500 lg:items-end">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              <ArrowPathIcon className="h-4 w-4" /> Refresh snapshot
            </button>
            <button
              type="button"
              onClick={() => setAutoRefresh((state) => !state)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
              aria-pressed={autoRefresh}
            >
              {autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
            </button>
          </div>
          {lastUpdatedLabel ? <span>Last refreshed {lastUpdatedLabel}</span> : null}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error.message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {concurrencyMetrics.map((metric) => (
          <SummaryCard key={metric.title} {...metric} />
        ))}
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading integration telemetry…
        </div>
      )}

      {!loading && dashboard?.integrations?.map((integration) => {
        const isPending = actionState.integration === integration.id && actionState.status === 'pending';
        const isSuccess = actionState.integration === integration.id && actionState.status === 'success';
        const isError = actionState.integration === integration.id && actionState.status === 'error';
        return (
          <section key={integration.id} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-slate-900">{integration.label}</h2>
                  <HealthBadge health={integration.health} />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Last run completed {formatTimestamp(integration.summary?.lastRunAt)} ·{' '}
                  {integration.enabled ? 'Integration enabled' : 'Integration disabled'}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                {isSuccess && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircleIcon className="h-4 w-4" /> {actionState.message}
                  </span>
                )}
                {isError && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                    <ExclamationTriangleIcon className="h-4 w-4" /> {actionState.message}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleManualSync(integration.id)}
                  disabled={isPending || !integration.enabled}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${
                    integration.enabled
                      ? 'bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-400'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isPending ? 'Triggering…' : 'Trigger manual sync'}
                </button>
              </div>
            </div>

            <IntegrationSummaryMetrics integration={integration} />

            <IntegrationStatusInsights
              statusDetails={integration.statusDetails}
              callSummary={integration.callSummary}
            />

            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent runs</h3>
                <p className="mb-3 text-xs text-slate-500">
                  Telemetry captured for the latest execution window. Duration reflects worker runtime from start to completion.
                </p>
                <IntegrationRunsTable runs={integration.recentRuns ?? []} />
              </div>
              <div className="lg:col-span-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Failure log</h3>
                <p className="mb-3 text-xs text-slate-500">
                  Entries highlight records requiring remediation before the next automated sync cycle.
                </p>
                <FailureLog entries={integration.failureLog ?? []} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Reconciliation reports</h3>
              <p className="mb-3 text-xs text-slate-500">
                Daily reconciliation summarises mismatches between Edulure and connected CRMs to guide remediation.
              </p>
              <ReconciliationPanel reconciliation={integration.reconciliation} />
            </div>
          </section>
        );
      })}

      <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-900">Bring-your-own API keys</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {formatNumber(apiKeys.length)} stored
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Vault tenant AI credentials, enforce rotation policies, and revoke compromised secrets without downtime.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {apiKeyInsights.map((metric) => (
            <SummaryCard key={metric.title} {...metric} />
          ))}
        </div>

        {apiKeysError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {apiKeysError.message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <ApiKeyTable
              apiKeys={apiKeys}
              loading={apiKeysLoading}
              onRotateRequest={handleRotateRequest}
              onDisable={handleDisable}
              disableState={disableState}
              pendingRotationMap={pendingRotationMap}
            />
          </div>
          <div className="space-y-4 lg:col-span-2">
            <ApiKeyCreateForm
              form={createForm}
              onChange={handleCreateChange}
              onSubmit={handleCreateSubmit}
              errors={createFormErrors}
              status={createStatus}
              message={createMessage}
            />
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Credential invitations</h4>
              <p className="text-[11px] text-slate-500">
                Track secure submission links awaiting action from credential owners. Rotation invites disable direct updates until fulfilled.
              </p>
            </div>
            <InvitationTable
              invitations={invites}
              loading={invitesLoading}
              error={invitesError}
              onResend={handleInviteResend}
              onCancel={handleInviteCancel}
            />
          </div>
        </div>
        {inviteToast && (
          <div
            className={`mt-4 rounded-2xl border p-4 text-xs ${
              inviteToast.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            <p>{inviteToast.message}</p>
            {inviteToast.claimUrl && (
              <p className="mt-2 truncate font-mono text-[11px]">{inviteToast.claimUrl}</p>
            )}
          </div>
        )}

        {rotationDraft && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <ApiKeyRotationForm
              draft={rotationDraft}
              onChange={handleRotationChange}
              onSubmit={handleRotationSubmit}
              onCancel={handleRotationCancel}
            />
          </div>
        )}
      </section>
    </div>
  );
}

