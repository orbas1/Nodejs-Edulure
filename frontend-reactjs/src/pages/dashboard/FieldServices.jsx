import clsx from 'clsx';
import {
  ArrowTrendingUpIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  SignalIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

const toneClasses = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  primary: 'bg-primary/10 text-primary-dark ring-primary/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  critical: 'bg-rose-50 text-rose-700 ring-rose-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  muted: 'bg-slate-50 text-slate-600 ring-slate-200'
};

const riskClasses = {
  critical: 'bg-rose-50 text-rose-700 ring-rose-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  on_track: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  closed: 'bg-slate-100 text-slate-600 ring-slate-200',
  cancelled: 'bg-slate-100 text-slate-500 ring-slate-200',
  default: 'bg-slate-50 text-slate-600 ring-slate-200'
};

const statusBadgeClasses = {
  completed: 'bg-emerald-500/10 text-emerald-700 ring-emerald-200',
  dispatched: 'bg-primary/10 text-primary-dark ring-primary/20',
  en_route: 'bg-sky-100 text-sky-700 ring-sky-200',
  on_site: 'bg-purple-100 text-purple-700 ring-purple-200',
  investigating: 'bg-amber-50 text-amber-700 ring-amber-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
  pending: 'bg-slate-100 text-slate-600 ring-slate-200'
};

function resolveToneClasses(tone) {
  return toneClasses[tone] ?? toneClasses.muted;
}

function resolveRiskClasses(riskLevel) {
  return riskClasses[riskLevel] ?? riskClasses.default;
}

function resolveStatusClasses(status) {
  return statusBadgeClasses[status] ?? statusBadgeClasses.pending;
}

function formatDateTime(value) {
  if (!value) return '—';
  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(parsed);
  } catch (error) {
    return value;
  }
}

function FieldServices() {
  const { role, dashboard, refresh } = useOutletContext();
  const workspace = dashboard?.fieldServices ?? null;

  const allowedRoles = useMemo(() => new Set(['learner', 'instructor']), []);
  if (!allowedRoles.has(role)) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Restricted workspace"
        description="Field service operations are available from the learner and instructor dashboards only."
      />
    );
  }

  if (!workspace) {
    return (
      <DashboardStateMessage
        title="Field service data not yet available"
        description="We couldn't find any service assignments linked to your workspace. Refresh the dashboard once operations syncs complete."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const summaryCards = workspace.summary?.cards ?? [];
  const assignments = workspace.assignments ?? [];
  const incidents = workspace.incidents ?? [];
  const timeline = workspace.timeline ?? [];
  const providers = workspace.providers ?? [];
  const mapView = workspace.map ?? null;
  const lastUpdatedLabel = formatDateTime(workspace.summary?.updatedAt ?? workspace.lastUpdated);
  const hasAssignments = assignments.length > 0;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="dashboard-kicker">Operational intelligence</p>
          <h1 className="dashboard-title">Field service control tower</h1>
          <p className="dashboard-subtitle">
            Coordinate technicians, monitor live incidents, and maintain SLA coverage across every in-flight engagement.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="dashboard-primary-pill" onClick={() => refresh?.()}>
            Sync latest telemetry
          </button>
          <button type="button" className="dashboard-pill">
            Export service ledger
          </button>
        </div>
      </div>

      <section className="dashboard-section">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Stability overview</h2>
            <p className="text-sm text-slate-600">Live indicators for current assignments, SLA posture, and incident load.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheckIcon className="h-4 w-4" aria-hidden="true" />
            <span>Updated {lastUpdatedLabel}</span>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.key}
              className={clsx(
                'rounded-2xl border border-transparent p-5 ring-1 shadow-sm',
                resolveToneClasses(card.tone)
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className="mt-3 text-2xl font-semibold">{card.value}</p>
              <p className="mt-2 text-xs text-slate-600">{card.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-3">
        <section className="dashboard-section xl:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Active engagements</h2>
              <p className="text-sm text-slate-600">
                Track ETA adherence, assignment owners, and current mitigation steps for every live job.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <SignalIcon className="h-4 w-4" aria-hidden="true" />
              <span>{assignments.length} in dashboard scope</span>
            </div>
          </div>
          {hasAssignments ? (
            <div className="mt-6 space-y-4">
              {assignments.map((assignment) => (
                <article
                  key={assignment.id}
                  className="dashboard-card-muted relative overflow-hidden p-5 ring-1 ring-inset ring-slate-200 transition hover:-translate-y-0.5 hover:ring-primary/40"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                            resolveStatusClasses(assignment.status)
                          )}
                        >
                          <span>{assignment.statusLabel}</span>
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {assignment.priority}
                        </span>
                        <span className="text-xs text-slate-500">Ref {assignment.reference}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{assignment.serviceType}</h3>
                        {assignment.summary ? (
                          <p className="mt-1 text-sm text-slate-600">{assignment.summary}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" aria-hidden="true" />
                          <span>Requested {assignment.requestedAtLabel ?? formatDateTime(assignment.requestedAt)}</span>
                        </div>
                        {assignment.scheduledForLabel ? (
                          <div className="flex items-center gap-1">
                            <GlobeAltIcon className="h-4 w-4" aria-hidden="true" />
                            <span>Scheduled {assignment.scheduledForLabel}</span>
                          </div>
                        ) : null}
                        {assignment.metrics?.elapsedMinutes != null ? (
                          <div className="flex items-center gap-1">
                            <BoltIcon className="h-4 w-4" aria-hidden="true" />
                            <span>{assignment.metrics.elapsedMinutes} min elapsed</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-3 lg:w-64">
                      <div
                        className={clsx(
                          'inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold ring-1 ring-inset',
                          resolveRiskClasses(assignment.riskLevel)
                        )}
                      >
                        Risk: {assignment.riskLevel?.replace(/_/g, ' ') ?? 'review'}
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next action</p>
                        <p className="mt-2 text-sm text-slate-700">{assignment.nextAction ?? 'Monitor progress'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="font-semibold text-slate-600">Provider</p>
                          <p className="mt-1 text-slate-900">
                            {assignment.provider?.name ?? 'Unassigned'}
                          </p>
                          {assignment.provider?.lastCheckInRelative ? (
                            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                              Checked {assignment.provider.lastCheckInRelative}
                            </p>
                          ) : null}
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="font-semibold text-slate-600">Customer</p>
                          <p className="mt-1 text-slate-900">{assignment.customer?.name ?? 'Service requester'}</p>
                          {assignment.location?.label ? (
                            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                              {assignment.location.label}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                  {assignment.timeline?.length ? (
                    <div className="mt-5 grid gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-xs text-slate-600 lg:grid-cols-2">
                      {assignment.timeline.slice(-2).map((event) => (
                        <div key={event.id} className="flex items-start gap-2">
                          <ShieldExclamationIcon className="h-4 w-4 flex-none text-slate-400" aria-hidden="true" />
                          <div>
                            <p className="font-semibold text-slate-700">{event.label}</p>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">
                              {event.relativeTime ?? event.timestamp}
                            </p>
                            {event.notes ? <p className="mt-1 text-slate-600">{event.notes}</p> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <DashboardStateMessage
                title="No live assignments"
                description="Assign a provider or sync new jobs from your service hub to populate the operations board."
                actionLabel="Refresh"
                onAction={() => refresh?.()}
              />
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Geospatial watch</h2>
              <p className="text-sm text-slate-600">
                Rapid snapshot of technician and customer coordinates with route coverage.
              </p>
            </div>
            <MapPinIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-slate-100 shadow-inner">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Map center</p>
            <p className="mt-2 text-sm font-medium">
              {mapView?.center
                ? `${mapView.center.lat?.toFixed(3) ?? '—'}, ${mapView.center.lng?.toFixed(3) ?? '—'}`
                : 'Calibrating coordinates'}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
              Bounds {mapView?.bounds ? `${mapView.bounds.minLat?.toFixed(2)} to ${mapView.bounds.maxLat?.toFixed(2)}` : 'pending'}
            </p>
            <div className="mt-6 space-y-3">
              {(mapView?.assignments ?? []).slice(0, 4).map((entry) => (
                <div key={entry.orderId} className="flex items-center justify-between gap-3 rounded-xl bg-white/10 p-3 text-xs">
                  <div>
                    <p className="font-semibold text-white">{entry.reference}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-300">{entry.status}</p>
                  </div>
                  <div className="text-right text-slate-200">
                    {entry.etaMinutes != null ? <p>ETA {entry.etaMinutes} min</p> : <p>ETA pending</p>}
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">{entry.priority}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="dashboard-section">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Live event stream</h2>
              <p className="text-sm text-slate-600">Chronological feed of updates, escalations, and customer touchpoints.</p>
            </div>
            <ClockIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-4">
            {timeline.length ? (
              timeline.slice(0, 8).map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{event.label}</p>
                      <p className="text-xs text-slate-500">{event.relativeTime ?? event.timestamp}</p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{event.status}</span>
                  </div>
                  {event.notes ? <p className="mt-3 text-sm text-slate-600">{event.notes}</p> : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <UserCircleIcon className="h-4 w-4" aria-hidden="true" />
                      <span>{event.author ?? 'Operations desk'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="h-4 w-4" aria-hidden="true" />
                      <span>Order #{event.orderId}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <DashboardStateMessage
                title="No recent activity"
                description="Service events will appear here once technicians check in or updates are logged."
              />
            )}
          </div>
        </section>

        <section className="dashboard-section">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Incident response queue</h2>
              <p className="text-sm text-slate-600">Escalations that need triage, reprioritisation, or customer messaging.</p>
            </div>
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-4">
            {incidents.length ? (
              incidents.slice(0, 6).map((incident) => (
                <div key={incident.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{incident.orderReference}</p>
                      <p className="text-xs text-slate-500">Severity: {incident.severity ?? 'review'}</p>
                    </div>
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                        resolveRiskClasses(incident.severity?.toLowerCase())
                      )}
                    >
                      {incident.status}
                    </span>
                  </div>
                  {incident.notes ? <p className="mt-2 text-sm text-slate-600">{incident.notes}</p> : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <ShieldExclamationIcon className="h-4 w-4" aria-hidden="true" />
                      <span>{incident.relativeTime ?? incident.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ArrowTrendingUpIcon className="h-4 w-4" aria-hidden="true" />
                      <span>{incident.nextAction ?? 'Review mitigation plan'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <UserCircleIcon className="h-4 w-4" aria-hidden="true" />
                      <span>{incident.owner ?? 'Operations desk'}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <DashboardStateMessage
                title="No open incidents"
                description="Escalations will surface here as soon as field events flag a risk or SLA breach."
              />
            )}
          </div>
        </section>
      </div>

      <section className="dashboard-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Provider performance matrix</h2>
            <p className="text-sm text-slate-600">
              Review utilisation, punctuality, and incident ratios across your active service partners.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
            <span>{providers.length} providers monitored</span>
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {providers.length ? (
            providers.map((provider) => (
              <div key={provider.id} className="dashboard-card-muted flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{provider.name}</p>
                    <p className="text-xs text-slate-500">{provider.specialties?.join(', ') || 'Generalist'}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {provider.metrics?.completedAssignments ?? 0} completed
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="font-semibold text-slate-700">Active</p>
                    <p className="mt-1 text-slate-900">{provider.metrics?.activeAssignments ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="font-semibold text-slate-700">On-time rate</p>
                    <p className="mt-1 text-slate-900">{provider.metrics?.onTimeRate ?? '—'}%</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="font-semibold text-slate-700">Avg ETA</p>
                    <p className="mt-1 text-slate-900">{provider.metrics?.averageEtaMinutes ?? '—'} min</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="font-semibold text-slate-700">Incidents</p>
                    <p className="mt-1 text-slate-900">{provider.metrics?.incidentCount ?? 0}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-wide text-slate-500">
                  <span>{provider.lastCheckInRelative ? `Check-in ${provider.lastCheckInRelative}` : 'Awaiting check-in'}</span>
                  {provider.location?.label ? <span>{provider.location.label}</span> : <span>Location pending</span>}
                </div>
              </div>
            ))
          ) : (
            <DashboardStateMessage
              title="No providers synced"
              description="Invite or activate a field service provider to populate utilisation and coverage analytics."
            />
          )}
        </div>
      </section>
    </div>
  );
}

export default FieldServices;
