import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  CloudArrowDownIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  SignalIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useMemo } from 'react';

import DashboardStateMessage from '../../../components/dashboard/DashboardStateMessage.jsx';
import { useServiceHealth } from '../../../context/ServiceHealthContext.jsx';
import useExecutiveDashboard from '../../../hooks/useExecutiveDashboard.js';
import useRoleGuard from '../../../hooks/useRoleGuard.js';

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const percentFormatter = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });

function formatMetricValue(metric) {
  if (!metric) {
    return '—';
  }
  const value = metric.value;
  if (value === null || value === undefined) {
    return '—';
  }

  const unit = typeof metric.unit === 'string' ? metric.unit.toLowerCase() : null;
  const formatter = typeof metric.formatter === 'string' ? metric.formatter.toLowerCase() : null;

  if (formatter === 'currency' || unit === 'usd' || unit === 'cad' || unit === 'eur') {
    const currency = unit && unit.length === 3 ? unit.toUpperCase() : 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(value);
  }

  if (formatter === 'percentage' || unit === '%') {
    const numericValue = typeof value === 'number' ? value / (unit === '%' ? 100 : 1) : Number(value) / 100;
    return percentFormatter.format(numericValue);
  }

  if (typeof value === 'number') {
    const formatted = numberFormatter.format(value);
    if (metric.unit && metric.unit !== '%') {
      return `${formatted} ${metric.unit}`.trim();
    }
    return formatted;
  }

  return value;
}

function TrendPill({ metric }) {
  if (!metric || metric.change === null || metric.change === undefined) {
    return null;
  }
  const direction = metric.direction ?? (metric.change >= 0 ? 'up' : 'down');
  const positive = direction === 'up';
  const Icon = positive ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  const tone = positive ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200';
  const changeValue = typeof metric.change === 'number' ? percentFormatter.format(metric.change / 100) : metric.change;
  const label = positive ? 'Improving' : 'Declining';
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold', tone)}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {changeValue}
      <span className="sr-only">{label}</span>
    </span>
  );
}

function MetricCard({ metric }) {
  if (!metric) {
    return null;
  }
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.label}</p>
      <p className="text-3xl font-semibold text-slate-900">{formatMetricValue(metric)}</p>
      <div className="flex flex-wrap items-center gap-2">
        <TrendPill metric={metric} />
        {metric.target ? (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Target {metric.target}
          </span>
        ) : null}
      </div>
      {metric.trend?.length ? (
        <div className="mt-1 text-xs text-slate-500">Rolling {metric.trend.length}-point trend captured.</div>
      ) : null}
    </article>
  );
}

function StatusBadge({ status }) {
  const tone = {
    operational: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    degraded: 'bg-amber-50 text-amber-700 border-amber-200',
    outage: 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200'
  }[status?.toLowerCase()] ?? 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold capitalize', tone)}>
      {status ?? 'unknown'}
    </span>
  );
}

function OfflineBanner({ stale, lastUpdated }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CloudArrowDownIcon className="h-5 w-5" aria-hidden="true" />
        You are offline. Showing {stale ? 'cached metrics' : 'previously loaded data'}.
      </div>
      {lastUpdated ? <p className="text-xs">Last updated {new Date(lastUpdated).toLocaleString()}</p> : null}
    </div>
  );
}

function HealthSummary({ manifest, alerts }) {
  if (!manifest) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
        Capability manifest not yet generated for this workspace.
      </div>
    );
  }

  const services = manifest.services ?? [];
  const impacted = services.filter((service) => service.status && service.status !== 'operational');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">{services.length} monitored services</p>
          <p className="text-xs text-slate-500">{impacted.length} currently impacted · Manifest generated {new Date(manifest.generatedAt).toLocaleString()}</p>
        </div>
        <ShieldCheckIcon className="h-6 w-6 text-emerald-500" aria-hidden="true" />
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {services.slice(0, 6).map((service) => (
          <li key={service.key} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">{service.name}</p>
                <p className="text-xs text-slate-500">{service.summary ?? 'No issues reported'}</p>
              </div>
              <StatusBadge status={service.status} />
            </div>
          </li>
        ))}
      </ul>
      {services.length > 6 ? (
        <p className="text-xs text-slate-500">{services.length - 6}+ additional services monitored via observability mesh.</p>
      ) : null}
      {alerts.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active alerts</p>
          <ul className="space-y-2 text-xs text-slate-600">
            {alerts.slice(0, 4).map((alert) => (
              <li key={alert.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="font-semibold">{alert.title}</span>
                <StatusBadge status={alert.level} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function IncidentList({ incidents }) {
  if (!incidents.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        No active incidents. Operations centre will surface alerts when escalations open.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {incidents.map((incident) => (
        <li key={incident.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{incident.reference}</p>
              <p className="text-xs text-slate-500">{incident.summary ?? 'Awaiting summary from incident scribe.'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <StatusBadge status={incident.severity} />
                {incident.owner ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold">
                    <UserGroupIcon className="h-4 w-4" aria-hidden="true" />
                    {incident.owner}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold">
                  <ClockIcon className="h-4 w-4" aria-hidden="true" />
                  Opened {incident.openedAt ? new Date(incident.openedAt).toLocaleTimeString() : '—'}
                </span>
                {incident.watchers ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold">
                    <SignalIcon className="h-4 w-4" aria-hidden="true" />
                    {numberFormatter.format(incident.watchers)} watching
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 text-right">
              <p className="text-xs uppercase tracking-wide text-slate-500">Resolution target</p>
              <p className="text-sm font-semibold text-slate-800">
                {incident.resolutionBreached
                  ? 'Breached'
                  : incident.resolutionTargetAt
                  ? new Date(incident.resolutionTargetAt).toLocaleTimeString()
                  : 'Pending'}
              </p>
              {incident.recommendedActions?.length ? (
                <ul className="mt-1 space-y-1 text-xs text-slate-600">
                  {incident.recommendedActions.slice(0, 3).map((action) => (
                    <li key={`${incident.id}-${action}`} className="flex items-start gap-1">
                      <ArrowTopRightOnSquareIcon className="mt-0.5 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ReleaseTable({ releases }) {
  if (!releases.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        No upcoming release trains scheduled for this tenant.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Release
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Window
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Owner
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Risk
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Approvals
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white text-sm">
          {releases.map((release) => (
            <tr key={release.id} className="hover:bg-primary/5">
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900">{release.name}</span>
                  <span className="text-xs text-slate-500">{release.version ?? 'Version pending'}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {release.windowStart ? new Date(release.windowStart).toLocaleString() : 'TBD'}
                {release.windowEnd ? ` – ${new Date(release.windowEnd).toLocaleString()}` : ''}
              </td>
              <td className="px-4 py-3 text-slate-600">{release.owner ?? 'Unassigned'}</td>
              <td className="px-4 py-3">
                <StatusBadge status={release.risk} />
              </td>
              <td className="px-4 py-3 text-slate-600">
                {release.approvalsPending ? `${release.approvalsPending} pending` : 'Complete'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Timeline({ entries }) {
  if (!entries.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Timeline updates will appear once incidents or releases publish new entries.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">{entry.label}</p>
            <p className="text-xs text-slate-500">{entry.description ?? 'Update recorded by operations.'}</p>
            {entry.actor ? <p className="text-xs text-slate-400">By {entry.actor}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold">
              <ClockIcon className="h-4 w-4" aria-hidden="true" />
              {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Pending'}
            </span>
            <StatusBadge status={entry.severity} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function OperationsSnapshot({ operations }) {
  const readiness = operations?.readiness ?? {};
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Incident SLAs</p>
        <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span>Mean time to acknowledge</span>
            <span className="font-semibold">{operations?.ackMinutes ? `${numberFormatter.format(operations.ackMinutes)} mins` : '—'}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span>Mean time to restore</span>
            <span className="font-semibold">{operations?.mttrMinutes ? `${numberFormatter.format(operations.mttrMinutes)} mins` : '—'}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span>Resolution SLA</span>
            <span className="font-semibold">{operations?.resolutionMinutes ? `${numberFormatter.format(operations.resolutionMinutes)} mins` : '—'}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span>Automation coverage</span>
            <span className="font-semibold">
              {operations?.automationCoverage
                ? percentFormatter.format(
                    typeof operations.automationCoverage === 'number'
                      ? operations.automationCoverage / 100
                      : Number.parseFloat(operations.automationCoverage) / 100
                  )
                : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">On-call roster</p>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span>Primary</span>
            <span className="font-semibold">{operations?.onCall?.primary ?? 'Not assigned'}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span>Secondary</span>
            <span className="font-semibold">{operations?.onCall?.secondary ?? 'Not assigned'}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span>Next rotation</span>
            <span className="font-semibold">
              {operations?.onCall?.nextRotationAt ? new Date(operations.onCall.nextRotationAt).toLocaleString() : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Readiness checks</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span>Chaos drills</span>
            <span className="font-semibold">
              {readiness.lastChaosDrillAt ? new Date(readiness.lastChaosDrillAt).toLocaleDateString() : 'Pending'}
            </span>
          </li>
          <li className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span>Runbooks updated</span>
            <span className="font-semibold">
              {readiness.runbooksReviewedAt ? new Date(readiness.runbooksReviewedAt).toLocaleDateString() : 'Pending'}
            </span>
          </li>
          <li className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span>Observability coverage</span>
            <span className="font-semibold">
              {readiness.observabilityCoverage
                ? percentFormatter.format(
                    typeof readiness.observabilityCoverage === 'number'
                      ? readiness.observabilityCoverage / 100
                      : Number.parseFloat(readiness.observabilityCoverage) / 100
                  )
                : '—'}
            </span>
          </li>
          {Array.isArray(readiness.blockers) && readiness.blockers.length ? (
            <li className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
              Blockers: {readiness.blockers.join(', ')}
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

function DependencyList({ dependencies }) {
  if (!dependencies?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Key dependencies</p>
      <ul className="mt-3 space-y-2 text-xs text-slate-600">
        {dependencies.map((dependency) => (
          <li key={dependency.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <span className="font-semibold text-slate-700">{dependency.name}</span>
            <div className="flex items-center gap-2">
              <StatusBadge status={dependency.status} />
              <span>{dependency.lastCheckedAt ? new Date(dependency.lastCheckedAt).toLocaleTimeString() : 'Pending'}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminExecutiveOverview() {
  const { allowed, explanation } = useRoleGuard(['admin']);
  const {
    data,
    loading,
    error,
    stale,
    offline,
    lastUpdated,
    tenants,
    tenantsLoading,
    tenantsError,
    tenantId,
    setTenantId,
    refresh
  } = useExecutiveDashboard();
  const { manifest, alerts: healthAlerts } = useServiceHealth();

  const summaryCards = useMemo(() => data?.kpis?.slice(0, 4) ?? [], [data?.kpis]);
  const incidentStats = data?.incidents?.stats ?? {};
  const upcomingReleases = data?.releases?.upcoming ?? [];
  const timelineEntries = data?.incidents?.timeline ?? [];
  const operations = data?.operations ?? {};
  const executiveAlerts = data?.alerts ?? [];

  if (!allowed) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Admin privileges required"
        description={explanation ?? 'You do not have sufficient permissions to manage the executive workspace.'}
        actionLabel="Return home"
        onAction={() => {
          window.location.assign('/dashboard');
        }}
      />
    );
  }

  if (loading && !data) {
    return (
      <DashboardStateMessage
        variant="loading"
        title="Loading executive overview"
        description="Gathering KPI, incident, and release telemetry for the selected tenant."
      />
    );
  }

  if (error && !data) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Unable to load executive overview"
        description={error.message ?? 'An unexpected error occurred while retrieving executive metrics.'}
        actionLabel="Retry"
        onAction={() => refresh()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Executive command centre</p>
          <h1 className="text-2xl font-semibold text-slate-900">Operational health &amp; readiness</h1>
          <p className="text-sm text-slate-500">
            Monitor cross-tenant KPIs, incident queues, and release governance in real time. Data refreshes automatically while
            you remain on this screen.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1 text-xs text-slate-500">
            <span>Tenant scope</span>
            <div className="flex items-center gap-2">
              <BuildingOffice2Icon className="h-4 w-4" aria-hidden="true" />
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={tenantId ?? ''}
                onChange={(event) => setTenantId(event.target.value || null)}
                disabled={tenantsLoading}
              >
                {(tenants ?? []).map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
            {tenantsError ? <span className="text-amber-600">Failed to load tenants: {tenantsError.message}</span> : null}
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            className="inline-flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ArrowPathIcon className="h-5 w-5" aria-hidden="true" />
            Refresh now
          </button>
        </div>
      </header>

      {offline ? <OfflineBanner stale={stale} lastUpdated={lastUpdated} /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="xl:col-span-2 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Platform health</p>
              <h2 className="text-xl font-semibold text-slate-900">Service availability &amp; alerts</h2>
              <p className="text-sm text-slate-500">
                Tracking {manifest?.services?.length ?? 0} services and {manifest?.capabilities?.length ?? 0} capabilities via the
                reliability manifest.
              </p>
            </div>
            <ShieldCheckIcon className="h-8 w-8 text-emerald-500" aria-hidden="true" />
          </div>
          <HealthSummary manifest={manifest} alerts={healthAlerts} />
        </article>

        <article className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alerting</p>
              <h2 className="text-xl font-semibold text-slate-900">Executive notifications</h2>
              <p className="text-sm text-slate-500">Summarised notifications from incident mesh, finance, and compliance feeds.</p>
            </div>
            <BoltIcon className="h-7 w-7 text-amber-500" aria-hidden="true" />
          </div>
          {executiveAlerts.length ? (
            <ul className="space-y-3 text-sm text-slate-700">
              {executiveAlerts.slice(0, 6).map((alert) => (
                <li key={alert.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{alert.title}</p>
                      <p className="text-xs text-slate-500">{alert.description ?? 'No description provided.'}</p>
                    </div>
                    <StatusBadge status={alert.level} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                      <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : 'Pending'}
                    </span>
                    {alert.link ? (
                      <a
                        href={alert.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary hover:bg-primary/20"
                      >
                        View detail
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              No executive alerts at this time.
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <article className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Incident queue</p>
              <h2 className="text-xl font-semibold text-slate-900">Active escalations</h2>
              <p className="text-sm text-slate-500">
                {incidentStats.totalOpen ? `${incidentStats.totalOpen} open incidents` : 'Queue is currently clear'} ·
                {incidentStats.critical ? ` ${incidentStats.critical} critical` : ' No critical incidents'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                <ClockIcon className="h-4 w-4" aria-hidden="true" />
                MTTA {incidentStats.mttaMinutes ? `${numberFormatter.format(incidentStats.mttaMinutes)} mins` : '—'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                <SignalIcon className="h-4 w-4" aria-hidden="true" />
                Detection {incidentStats.meanTimeToDetectMinutes ? `${numberFormatter.format(incidentStats.meanTimeToDetectMinutes)} mins` : '—'}
              </span>
            </div>
          </div>
          <IncidentList incidents={data?.incidents?.active ?? []} />
        </article>
        <article className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operations</p>
              <h2 className="text-xl font-semibold text-slate-900">Readiness snapshot</h2>
              <p className="text-sm text-slate-500">Incident SLAs, on-call coverage, and dependency posture.</p>
            </div>
            <CheckCircleIcon className="h-7 w-7 text-emerald-500" aria-hidden="true" />
          </div>
          <OperationsSnapshot operations={operations} />
          <DependencyList dependencies={operations.dependencies} />
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <article className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Release management</p>
              <h2 className="text-xl font-semibold text-slate-900">Upcoming release trains</h2>
              <p className="text-sm text-slate-500">Track approvals, risk posture, and deployment windows.</p>
            </div>
            <GlobeAltIcon className="h-7 w-7 text-slate-400" aria-hidden="true" />
          </div>
          <ReleaseTable releases={upcomingReleases} />
        </article>
        <article className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Release readiness</p>
              <h2 className="text-xl font-semibold text-slate-900">Deployment checkpoints</h2>
              <p className="text-sm text-slate-500">Ensure sign-offs complete before pushing to production.</p>
            </div>
            <ExclamationTriangleIcon className="h-7 w-7 text-amber-500" aria-hidden="true" />
          </div>
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span>Change failure rate</span>
              <span className="font-semibold">
                {data?.releases?.readiness?.changeFailureRate
                  ? percentFormatter.format(
                      typeof data.releases.readiness.changeFailureRate === 'number'
                        ? data.releases.readiness.changeFailureRate / 100
                        : Number.parseFloat(data.releases.readiness.changeFailureRate) / 100
                    )
                  : '—'}
              </span>
            </li>
            <li className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span>Release approvals pending</span>
              <span className="font-semibold">{data?.releases?.readiness?.approvalsPending ?? '—'}</span>
            </li>
            <li className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span>Rollback drills completed</span>
              <span className="font-semibold">
                {data?.releases?.readiness?.rollbackDrillAt
                  ? new Date(data.releases.readiness.rollbackDrillAt).toLocaleDateString()
                  : 'Pending'}
              </span>
            </li>
            <li className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span>Deployment window health score</span>
              <span className="font-semibold">{data?.releases?.readiness?.healthScore ?? '—'}</span>
            </li>
          </ul>
        </article>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Incident &amp; release timeline</p>
            <h2 className="text-xl font-semibold text-slate-900">Operational log</h2>
            <p className="text-sm text-slate-500">Audit history of escalations, mitigation steps, and deployment checkpoints.</p>
          </div>
          <DocumentTextIcon className="h-7 w-7 text-slate-400" aria-hidden="true" />
        </div>
        <Timeline entries={timelineEntries} />
      </section>
    </div>
  );
}

