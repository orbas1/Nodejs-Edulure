import { useMemo } from 'react';
import clsx from 'clsx';
import {
  ArrowTopRightOnSquareIcon,
  BoltIcon,
  ClockIcon,
  CursorArrowRippleIcon,
  NoSymbolIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

import { useDashboard } from '../../context/DashboardContext.jsx';
import { useServiceHealth } from '../../context/ServiceHealthContext.jsx';

const STAT_TONES = {
  critical: 'bg-rose-100 text-rose-700 border-rose-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  info: 'bg-sky-100 text-sky-700 border-sky-200',
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200'
};

const INCIDENT_TONE = {
  critical: 'border-rose-200 bg-rose-50 text-rose-900',
  high: 'border-amber-200 bg-amber-50 text-amber-900',
  medium: 'border-sky-200 bg-sky-50 text-sky-900',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-900'
};

function StatCard({ icon: Icon, label, value, helper, tone = 'neutral' }) {
  const toneClass = STAT_TONES[tone] ?? STAT_TONES.neutral;
  return (
    <div className={clsx('dashboard-card flex flex-col gap-3 border px-5 py-4', toneClass)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
        {Icon ? <Icon className="h-5 w-5" aria-hidden="true" /> : null}
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      {helper ? <p className="text-sm text-current/80">{helper}</p> : null}
    </div>
  );
}

function SeverityBadge({ severity }) {
  const tone = INCIDENT_TONE[(severity ?? '').toLowerCase()] ?? INCIDENT_TONE.medium;
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold', tone)}>
      {severity ?? 'unknown'}
    </span>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default function AdminOperator() {
  const { dashboards, loading, error } = useDashboard();
  const { alerts, loading: healthLoading } = useServiceHealth();
  const operatorDashboard = dashboards?.admin?.operator;
  const numberFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);

  const summaryCards = useMemo(() => {
    if (!operatorDashboard?.metrics) {
      return [];
    }

    const { serviceHealth, incidents, scams } = operatorDashboard.metrics;

    const impactedTone = serviceHealth.impactedServices > 0 ? 'warning' : 'success';
    const incidentTone = incidents.severityCounts.critical > 0 ? 'critical' : incidents.totalOpen > 0 ? 'warning' : 'success';
    const scamTone = scams.activeCases > 0 ? 'warning' : 'success';

    return [
      {
        id: 'availability',
        label: 'Impacted services',
        value: `${serviceHealth.impactedServices}/${serviceHealth.totalServices}`,
        helper: `${serviceHealth.impactedCapabilities} capabilities impacted`,
        icon: ShieldExclamationIcon,
        tone: impactedTone
      },
      {
        id: 'incidents',
        label: 'Open incidents',
        value: incidents.totalOpen,
        helper: `${incidents.severityCounts.critical} critical · median ack ${
          incidents.medianAckMinutes ? `${incidents.medianAckMinutes}m` : 'pending'
        }`,
        icon: BoltIcon,
        tone: incidentTone
      },
      {
        id: 'watchers',
        label: 'Ops watchers',
        value: numberFormatter.format(serviceHealth.watchers ?? 0),
        helper: `${incidents.detectionChannels.length} detection channels`,
        icon: UsersIcon,
        tone: 'info'
      },
      {
        id: 'scam',
        label: 'Payments blocked',
        value: scams.blockedPaymentsFormatted,
        helper: `${numberFormatter.format(scams.impactedLearners ?? 0)} learners protected`,
        icon: NoSymbolIcon,
        tone: scamTone
      }
    ];
  }, [numberFormatter, operatorDashboard?.metrics]);

  const serviceHealth = operatorDashboard?.serviceHealth;
  const incidentQueue = operatorDashboard?.incidents?.active ?? [];
  const resolvedIncidents = operatorDashboard?.incidents?.recentResolved ?? [];
  const scamSummary = operatorDashboard?.metrics?.scams;
  const runbooks = operatorDashboard?.runbooks ?? [];
  const timeline = operatorDashboard?.timeline ?? [];

  if (loading && !operatorDashboard) {
    return (
      <section className="dashboard-section">
        <p className="text-sm text-slate-600">Loading operator metrics…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="dashboard-section">
        <h2 className="dashboard-title">Operator dashboard unavailable</h2>
        <p className="dashboard-subtitle">{error.message || 'Failed to load operator analytics.'}</p>
      </section>
    );
  }

  if (!operatorDashboard) {
    return (
      <section className="dashboard-section">
        <h2 className="dashboard-title">Operator command centre</h2>
        <p className="dashboard-subtitle">
          No operator telemetry has been provisioned for this account yet. Contact the platform operations team to enable
          Redis-backed health aggregation and incident feeds.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <StatCard key={card.id} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="dashboard-section xl:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="dashboard-kicker">Platform availability</p>
              <h2 className="dashboard-title">Service health &amp; dependencies</h2>
              <p className="dashboard-subtitle">
                Last manifest: {serviceHealth.summary.manifestGeneratedAt ? new Date(serviceHealth.summary.manifestGeneratedAt).toLocaleString() : 'pending'}
                {healthLoading ? ' · refreshing live checks…' : null}
              </p>
            </div>
            <ShieldCheckIcon className="h-8 w-8 text-emerald-500" aria-hidden="true" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Core services</h3>
              <ul className="space-y-3">
                {serviceHealth.services.map((service) => (
                  <li key={service.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{service.name}</p>
                        <p className="text-xs text-slate-500">{service.summary}</p>
                      </div>
                      <SeverityBadge severity={service.status} />
                    </div>
                    {service.components.length ? (
                      <dl className="mt-3 grid gap-2 text-xs text-slate-600">
                        {service.components.map((component) => (
                          <div key={`${service.key}-${component.name}`} className="flex justify-between gap-4">
                            <dt className="font-medium">{component.name}</dt>
                            <dd className="text-right">{component.message}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Impacted capabilities</h3>
                {serviceHealth.impactedCapabilities.length ? (
                  <ul className="mt-3 space-y-3">
                    {serviceHealth.impactedCapabilities.map((capability) => (
                      <li key={capability.key} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-amber-900">{capability.name}</p>
                          <SeverityBadge severity={capability.status} />
                        </div>
                        <p className="mt-2 text-xs text-amber-800">{capability.summary}</p>
                        {capability.dependencies.length ? (
                          <p className="mt-2 text-xs text-amber-700">Depends on: {capability.dependencies.join(', ')}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="All capabilities online" message="No degradations detected across capability manifest." />
                )}
              </div>

              {serviceHealth.contactPoints.length ? (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Bridge &amp; escalation contacts</h3>
                  <ul className="mt-2 space-y-2 text-sm text-slate-600">
                    {serviceHealth.contactPoints.map((contact) => (
                      <li key={`${contact.key}-${contact.value}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="font-medium capitalize">{contact.key}</span>
                        <span className="text-slate-700">{contact.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {alerts.length ? (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Live alerts</h3>
                  <ul className="mt-2 space-y-2 text-xs text-slate-600">
                    {alerts.map((alert) => (
                      <li key={alert.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <span className="font-semibold">{alert.title}</span>
                        <span className="text-slate-500">{alert.level}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="dashboard-section xl:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="dashboard-kicker">Incident queue</p>
              <h2 className="dashboard-title">Live escalations</h2>
              <p className="dashboard-subtitle">{incidentQueue.length ? `${incidentQueue.length} active cases` : 'Queue clear'}</p>
            </div>
            <ClockIcon className="h-7 w-7 text-slate-400" aria-hidden="true" />
          </div>

          {incidentQueue.length ? (
            <ul className="mt-5 space-y-3">
              {incidentQueue.slice(0, 5).map((incident) => (
                <li key={incident.incidentUuid} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{incident.reference}</p>
                      <p className="text-xs text-slate-500">{incident.summary ?? 'Awaiting summary'}</p>
                    </div>
                    <SeverityBadge severity={incident.severity} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-600">
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-500">Ack</dt>
                      <dd>{incident.acknowledgedAt ? new Date(incident.acknowledgedAt).toLocaleTimeString() : 'Pending'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-500">Watchers</dt>
                      <dd>{numberFormatter.format(incident.watchers ?? 0)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-500">Detection</dt>
                      <dd>{incident.detectionChannel}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wide text-slate-500">SLA</dt>
                      <dd>
                        {incident.resolutionBreached
                          ? 'Resolution breached'
                          : incident.resolutionTargetAt
                          ? `Due ${new Date(incident.resolutionTargetAt).toLocaleTimeString()}`
                          : 'Monitoring'}
                      </dd>
                    </div>
                  </dl>
                  {incident.recommendedActions.length ? (
                    <ul className="mt-3 space-y-1 text-xs text-slate-600">
                      {incident.recommendedActions.slice(0, 2).map((action) => (
                        <li key={`${incident.incidentUuid}-${action}`} className="flex items-center gap-2">
                          <CursorArrowRippleIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No active incidents" message="Escalations will appear here when the incident mesh opens new tickets." />
          )}

          {resolvedIncidents.length ? (
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recently resolved</h3>
              <ul className="mt-2 space-y-2 text-xs text-slate-600">
                {resolvedIncidents.slice(0, 3).map((incident) => (
                  <li key={`${incident.incidentUuid}-resolved`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span>{incident.reference}</span>
                    <span>{incident.durationMinutes ? `${incident.durationMinutes}m` : '—'}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="dashboard-section xl:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="dashboard-kicker">Scam intelligence</p>
              <h2 className="dashboard-title">Fraud &amp; scam watch</h2>
              <p className="dashboard-subtitle">
                {scamSummary.activeCases > 0
                  ? `${scamSummary.activeCases} active campaigns · ${scamSummary.impactedLearners} learners flagged`
                  : 'No active scam campaigns detected'}
              </p>
            </div>
            <NoSymbolIcon className="h-7 w-7 text-rose-500" aria-hidden="true" />
          </div>

          {scamSummary.alerts.length ? (
            <ul className="mt-4 space-y-3">
              {scamSummary.alerts.map((alert) => (
                <li key={alert.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{alert.reference}</p>
                      <p className="text-xs text-slate-500">{alert.summary}</p>
                    </div>
                    <SeverityBadge severity={alert.severity} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                      <ShieldExclamationIcon className="h-4 w-4" aria-hidden="true" />
                      {alert.detectionChannel}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                      <UsersIcon className="h-4 w-4" aria-hidden="true" />
                      {numberFormatter.format(alert.watchers ?? 0)} watchers
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                      <ClockIcon className="h-4 w-4" aria-hidden="true" />
                      {alert.reportedAt ? new Date(alert.reportedAt).toLocaleString() : 'pending'}
                    </span>
                  </div>
                  {alert.recommendedActions?.length ? (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
                      {alert.recommendedActions.map((action) => (
                        <li key={`${alert.id}-${action}`}>{action}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No scam alerts" message="Fraud desk has not flagged any scam campaigns in the last polling window." />
          )}
        </section>

        <section className="dashboard-section xl:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="dashboard-kicker">Runbooks</p>
              <h2 className="dashboard-title">Rapid response playbooks</h2>
              <p className="dashboard-subtitle">Tie incidents to the correct operational runbooks.</p>
            </div>
            <ArrowTopRightOnSquareIcon className="h-6 w-6 text-slate-400" aria-hidden="true" />
          </div>

          {runbooks.length ? (
            <ul className="mt-4 space-y-3">
              {runbooks.slice(0, 6).map((runbook) => (
                <li key={runbook.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{runbook.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{runbook.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">Severity {runbook.severity}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">References: {runbook.references.join(', ')}</span>
                  </div>
                  {runbook.url ? (
                    <a
                      href={runbook.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary-dark"
                    >
                      Open runbook
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No runbooks linked" message="Attach incident playbooks via the incident metadata to surface them here." />
          )}
        </section>
      </div>

      <section className="dashboard-section">
        <div className="flex items-start justify-between">
          <div>
            <p className="dashboard-kicker">Operational timeline</p>
            <h2 className="dashboard-title">Key updates &amp; escalations</h2>
            <p className="dashboard-subtitle">
              Tracking {timeline.length} logged events across active and recently resolved incidents.
            </p>
          </div>
          <BoltIcon className="h-7 w-7 text-amber-500" aria-hidden="true" />
        </div>

        {timeline.length ? (
          <ol className="mt-5 space-y-3">
            {timeline.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{entry.label}</p>
                  <p className="text-xs text-slate-500">{entry.description ?? 'Timeline update recorded.'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                    <ClockIcon className="h-4 w-4" aria-hidden="true" />
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'Pending'}
                  </span>
                  <SeverityBadge severity={entry.severity} />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState title="No timeline entries" message="Timeline events will appear as incident updates are recorded." />
        )}
      </section>
    </div>
  );
}
