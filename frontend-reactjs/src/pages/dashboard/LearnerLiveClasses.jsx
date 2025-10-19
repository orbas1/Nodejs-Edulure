import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { useCallback, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { checkInToLiveSession, joinLiveSession } from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

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

function SessionCard({ session, onAction, pending }) {
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
              disabled={action.enabled === false || pending}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                action.action === 'join' || action.action === 'check-in'
                  ? 'bg-primary text-white shadow-sm hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500'
                  : 'border border-slate-200 text-slate-700 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400'
              }`}
              onClick={() => onAction?.(session, action.action)}
            >
              {pending ? 'Processing…' : action.label}
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
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const [statusMessage, setStatusMessage] = useState(null);
  const [pendingSessionId, setPendingSessionId] = useState(null);

  const { data, loading, error } = useMemo(() => {
    const section = dashboard?.liveClassrooms;
    if (section && typeof section === 'object' && ('data' in section || 'loading' in section || 'error' in section)) {
      return {
        data: section.data ?? null,
        loading: Boolean(section.loading ?? (section.status === 'loading')),
        error: section.error ?? null
      };
    }
    return { data: section ?? null, loading: false, error: null };
  }, [dashboard?.liveClassrooms]);

  const handleSessionAction = useCallback(
    async (sessionItem, action) => {
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage live sessions.' });
        return;
      }

      setPendingSessionId(sessionItem.id);
      setStatusMessage({ type: 'pending', message: `Connecting to ${sessionItem.title}…` });
      try {
        const api = action === 'check-in' ? checkInToLiveSession : joinLiveSession;
        const response = await api({ token, sessionId: sessionItem.id });
        setStatusMessage({ type: 'success', message: response?.message ?? 'Live session action completed.' });
      } catch (sessionError) {
        setStatusMessage({
          type: 'error',
          message:
            sessionError instanceof Error ? sessionError.message : 'We were unable to complete that session action.'
        });
      } finally {
        setPendingSessionId(null);
      }
    },
    [token]
  );

  if (loading) {
    return (
      <DashboardStateMessage
        title="Loading live classrooms"
        description="We are synchronising your upcoming sessions and readiness checks."
      />
    );
  }

  if (error) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Live classrooms unavailable"
        description={error.message ?? 'We were unable to load your learner live classroom workspace.'}
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

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
              No active live classrooms yet. Once scheduled, live session health metrics will appear here.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Active sessions</h2>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <SparklesIcon className="h-4 w-4" aria-hidden="true" />
            {active.length} running
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {active.map((sessionItem) => (
            <SessionCard
              key={sessionItem.id}
              session={sessionItem}
              onAction={handleSessionAction}
              pending={pendingSessionId === sessionItem.id}
            />
          ))}
          {active.length === 0 && (
            <DashboardStateMessage
              title="No active sessions"
              description="You do not have any active live classrooms right now. Join upcoming sessions below."
            />
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming sessions</h2>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
            {upcoming.length} scheduled
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {upcoming.map((sessionItem) => (
            <SessionCard
              key={sessionItem.id}
              session={sessionItem}
              onAction={handleSessionAction}
              pending={pendingSessionId === sessionItem.id}
            />
          ))}
          {upcoming.length === 0 && (
            <DashboardStateMessage
              title="No upcoming sessions"
              description="All caught up! New live experiences will appear here when they are scheduled."
            />
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Completed sessions</h2>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
            {completed.length} archived
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {completed.map((sessionItem) => (
            <SessionCard key={sessionItem.id} session={sessionItem} onAction={handleSessionAction} pending={false} />
          ))}
          {completed.length === 0 && (
            <DashboardStateMessage
              title="No completed sessions"
              description="Once sessions wrap up, they will appear here with readiness insights and recaps."
            />
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="dashboard-card space-y-4 p-5">
          <header className="flex items-center gap-3">
            <ShieldCheckIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Security readiness</h2>
              <p className="text-sm text-slate-600">Keep waiting rooms, passcodes, and moderator checklists aligned.</p>
            </div>
          </header>
          <ul className="space-y-2 text-sm text-slate-600">
            {readiness.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                <div className="flex items-center gap-2">
                  <ReadinessBadge status={item.status} />
                  <span>{item.label}</span>
                </div>
                <span className="text-xs text-slate-500">{item.owner}</span>
              </li>
            ))}
            {readiness.length === 0 && <li className="text-xs text-slate-500">No readiness alerts at this time.</li>}
          </ul>
        </article>

        <article className="dashboard-card space-y-4 p-5">
          <header className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Groups & cohorts</h2>
              <p className="text-sm text-slate-600">Track which cohorts are aligned to upcoming live classrooms.</p>
            </div>
          </header>
          <ul className="space-y-2 text-sm text-slate-600">
            {groups.map((group) => (
              <li key={group.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                <span>{group.name}</span>
                <span className="text-xs text-slate-500">{group.members} learners</span>
              </li>
            ))}
            {groups.length === 0 && <li className="text-xs text-slate-500">No cohorts assigned to live classrooms yet.</li>}
          </ul>
        </article>
      </section>

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Whiteboard snapshots</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {whiteboardSnapshots.map((snapshot) => (
            <div key={snapshot.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="dashboard-kicker">{snapshot.template}</p>
              <p className="mt-2 text-sm text-slate-600">{snapshot.summary}</p>
              <p className="mt-3 text-xs text-slate-500">Updated {snapshot.updatedAt}</p>
            </div>
          ))}
          {whiteboardSnapshots.length === 0 && (
            <DashboardStateMessage
              title="No whiteboard snapshots"
              description="Collaborative boards will appear here when facilitators share templates or updates."
            />
          )}
        </div>
      </section>

      {statusMessage ? (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-3xl border px-5 py-4 text-sm ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : statusMessage.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-primary/20 bg-primary/5 text-primary'
          }`}
        >
          {statusMessage.message}
        </div>
      ) : null}
    </div>
  );
}
