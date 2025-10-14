import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

function ReadinessBadge({ status }) {
  const base = 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide';
  if (status === 'ready') {
    return <span className={`${base} bg-emerald-100 text-emerald-700`}>Ready</span>;
  }
  if (status === 'attention') {
    return <span className={`${base} bg-amber-100 text-amber-700`}>Review</span>;
  }
  return <span className={`${base} bg-rose-100 text-rose-700`}>Action</span>;
}

function SessionCard({ session }) {
  const occupancy = session.occupancy ?? {};
  const occupancyLabel = occupancy.capacity
    ? `${occupancy.reserved ?? 0}/${occupancy.capacity} seats`
    : `${occupancy.reserved ?? 0} registered`;
  const occupancyRate = typeof occupancy.rate === 'number' ? occupancy.rate : null;
  const action = session.callToAction ?? null;
  const security = session.security ?? {};
  const whiteboard = session.whiteboard ?? null;
  const facilitators = Array.isArray(session.facilitators) ? session.facilitators : [];

  return (
    <article className="dashboard-card space-y-5 p-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="dashboard-kicker">{session.stage}</p>
          <h3 className="text-lg font-semibold text-slate-900">{session.title}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {session.startLabel}
            {session.timezone ? ` • ${session.timezone}` : ''}
            {session.community ? ` • ${session.community}` : ''}
          </p>
          {session.summary && <p className="mt-3 text-sm text-slate-500">{session.summary}</p>}
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            <UsersIcon className="h-4 w-4 text-primary" aria-hidden="true" />
            {occupancyLabel}
            {occupancyRate !== null && (
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  occupancyRate >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {occupancyRate}% fill
              </span>
            )}
          </span>
          {action && (
            <button
              type="button"
              disabled={action.enabled === false}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                action.action === 'join' || action.action === 'check-in'
                  ? 'bg-primary text-white shadow-sm hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500'
                  : 'border border-slate-200 text-slate-700 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400'
              }`}
            >
              {action.label}
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <ClockIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Session status</p>
            <p className="text-sm text-slate-700 capitalize">{session.status.replace('-', ' ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <ShieldCheckIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Security controls</p>
            <p className="text-sm text-slate-700">
              {security.waitingRoom ? 'Waiting room enforced' : 'Direct entry'} ·{' '}
              {security.passcodeRequired ? 'Passcode required' : 'No passcode'}
            </p>
          </div>
        </div>
      </div>

      {whiteboard && (whiteboard.template || whiteboard.url) && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live board</p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{whiteboard.template}</span>
            {whiteboard.lastUpdatedLabel && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                Updated {whiteboard.lastUpdatedLabel}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                whiteboard.ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              {whiteboard.ready ? 'Ready' : 'In prep'}
            </span>
          </div>
          {facilitators.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">Facilitators: {facilitators.join(', ')}</p>
          )}
        </div>
      )}

      {session.breakoutRooms?.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Breakout rooms</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {session.breakoutRooms.map((room) => (
              <span
                key={`${session.id}-${room.name}`}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm"
              >
                {room.name}
                {room.capacity ? ` • ${room.capacity} seats` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export default function LearnerLiveClasses() {
  const { dashboard, refresh } = useOutletContext();
  const data = dashboard?.liveClassrooms;

  if (!data) {
    return (
      <DashboardStateMessage
        title="Live classrooms unavailable"
        description="We couldn't find an active live classroom schedule for your learner Learnspace. Refresh to pull the latest data."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const metrics = Array.isArray(data.metrics) ? data.metrics : [];
  const active = Array.isArray(data.active) ? data.active : [];
  const upcoming = Array.isArray(data.upcoming) ? data.upcoming : [];
  const completed = Array.isArray(data.completed) ? data.completed : [];
  const groups = Array.isArray(data.groups) ? data.groups : [];
  const whiteboardSnapshots = Array.isArray(data.whiteboard?.snapshots) ? data.whiteboard.snapshots : [];
  const readiness = Array.isArray(data.whiteboard?.readiness) ? data.whiteboard.readiness : [];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">Live classrooms</h1>
          <p className="dashboard-subtitle">
            Join cohort experiences, monitor security controls, and keep collaborative whiteboards prepped for every live moment.
          </p>
        </div>
        <button type="button" className="dashboard-pill" onClick={() => refresh?.()}>
          Refresh schedule
        </button>
      </header>

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Live session health</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="dashboard-kicker">{metric.label}</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{metric.value}</p>
              {metric.change && (
                <p
                  className={`mt-2 text-sm font-medium ${
                    metric.trend === 'down' ? 'text-rose-500' : 'text-emerald-600'
                  }`}
                >
                  {metric.change}
                </p>
              )}
            </div>
          ))}
          {metrics.length === 0 && (
            <p className="col-span-full text-sm text-slate-500">
              Metrics will populate once your first live classroom is scheduled.
            </p>
          )}
        </div>
      </section>

      {active.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Streaming now</h2>
              <p className="text-sm text-slate-600">Jump straight into an active classroom or review in-flight participation.</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {active.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Upcoming schedule</h2>
            <p className="text-sm text-slate-600">Stay ahead of the next touchpoints across your communities.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
            All times adjusted to your profile timezone
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {upcoming.length > 0 ? (
            upcoming.map((session) => <SessionCard key={session.id} session={session} />)
          ) : (
            <div className="dashboard-card p-6 text-sm text-slate-500">
              No live classrooms are scheduled yet. Add one to see the flow populate.
            </div>
          )}
        </div>
      </section>

      {groups.length > 0 && (
        <section className="dashboard-section">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Group breakouts</h2>
              <p className="text-sm text-slate-600">Track collaborative rooms and facilitator coverage at a glance.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {groups.map((group) => (
              <div key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="dashboard-kicker">{group.stage}</p>
                    <p className="text-base font-semibold text-slate-900">{group.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{group.startLabel}</p>
                  </div>
                  <ReadinessBadge status={group.callToAction?.enabled === false ? 'attention' : 'ready'} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm">
                    <UsersIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                    {group.occupancy?.reserved ?? 0}/{group.occupancy?.capacity ?? '∞'} seats
                  </span>
                  {Array.isArray(group.breakoutRooms) && group.breakoutRooms.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm">
                      <SparklesIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                      {group.breakoutRooms.length} rooms
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Whiteboard readiness & security</h2>
            <p className="text-sm text-slate-600">Every board and safeguard preflighted before the room opens.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {readiness.length > 0 ? (
            readiness.map((item) => (
              <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                {item.status === 'ready' ? (
                  <CheckCircleIcon className="mt-0.5 h-5 w-5 text-emerald-500" aria-hidden="true" />
                ) : (
                  <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 text-amber-500" aria-hidden="true" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <ReadinessBadge status={item.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No readiness insights yet—schedule a session to begin monitoring.</p>
          )}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Whiteboard snapshots</h2>
            <p className="text-sm text-slate-600">Quickly reopen canvases, templates, and collaborative boards.</p>
          </div>
        </div>
        {whiteboardSnapshots.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {whiteboardSnapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="rounded-2xl border border-slate-200 bg-gradient-to-br from-primary/5 via-white to-white p-5 shadow-sm"
              >
                <p className="text-sm font-semibold text-slate-900">{snapshot.title}</p>
                <p className="mt-1 text-xs text-slate-500">{snapshot.template}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                  <SparklesIcon className={`h-4 w-4 ${snapshot.ready ? 'text-emerald-500' : 'text-amber-500'}`} aria-hidden="true" />
                  {snapshot.ready ? 'Ready for launch' : 'Finishing touches needed'}
                </div>
                {snapshot.lastUpdatedLabel && (
                  <p className="mt-2 text-xs text-slate-500">Updated {snapshot.lastUpdatedLabel}</p>
                )}
                {Array.isArray(snapshot.facilitators) && snapshot.facilitators.length > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    Collaborators: {snapshot.facilitators.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Boards will appear here as soon as a live classroom is scheduled.</p>
        )}
      </section>

      {completed.length > 0 && (
        <section className="dashboard-section">
          <h2 className="text-lg font-semibold text-slate-900">Recently completed</h2>
          <div className="mt-4 space-y-3">
            {completed.map((session) => (
              <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{session.title}</p>
                  <p className="text-xs text-slate-500">Wrapped {session.endLabel ?? session.startLabel}</p>
                </div>
                <ReadinessBadge status={session.whiteboard?.ready ? 'ready' : 'attention'} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
