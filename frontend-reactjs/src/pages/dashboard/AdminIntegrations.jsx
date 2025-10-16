import { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  BoltIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

import { fetchIntegrationDashboard, triggerIntegrationRun } from '../../api/integrationAdminApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

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
  const token = session?.tokens?.accessToken;
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [actionState, setActionState] = useState({ integration: null, status: 'idle', message: null });

  useEffect(() => {
    if (!token) return undefined;
    const controller = new AbortController();
    setLoading(true);
    fetchIntegrationDashboard({ token, signal: controller.signal })
      .then((payload) => {
        setDashboard(payload ?? {});
        setError(null);
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || err?.message === 'canceled') {
          return;
        }
        setError(err instanceof Error ? err : new Error('Failed to load integration dashboard'));
      })
      .finally(() => setLoading(false));

    return () => {
      controller.abort();
    };
  }, [token, refreshToken]);

  useEffect(() => {
    if (actionState.status === 'success' || actionState.status === 'error') {
      const timeout = setTimeout(() => {
        setActionState({ integration: null, status: 'idle', message: null });
      }, 4000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [actionState]);

  const handleRefresh = () => {
    setRefreshToken((value) => value + 1);
  };

  const handleManualSync = async (integration) => {
    if (!token) return;
    setActionState({ integration, status: 'pending', message: null });
    try {
      await triggerIntegrationRun({ token, integration });
      setActionState({ integration, status: 'success', message: 'Sync triggered successfully' });
      setRefreshToken((value) => value + 1);
    } catch (err) {
      setActionState({
        integration,
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to trigger sync'
      });
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Integration control centre</h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor CRM sync health, reconcile mismatches, and trigger manual retries with full telemetry coverage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            <ArrowPathIcon className="h-4 w-4" /> Refresh snapshot
          </button>
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
    </div>
  );
}

