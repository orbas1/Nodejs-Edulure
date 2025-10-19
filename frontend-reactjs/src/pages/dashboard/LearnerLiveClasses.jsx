import { ClockIcon, ShieldCheckIcon, UsersIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { joinLiveSession, checkInLiveSession } from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLearnerDashboardSection } from '../../hooks/useLearnerDashboard.js';

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

function SessionCard({ session, onAction, pendingAction, statusMessage }) {
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
              onClick={() => onAction?.(session)}
              disabled={action.enabled === false || !!pendingAction}
              aria-busy={!!pendingAction}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                action.action === 'join' || action.action === 'check-in'
                  ? 'bg-primary text-white shadow-sm hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500'
                  : 'border border-slate-200 text-slate-700 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400'
              }`}
            >
              {pendingAction ? `${action.label}…` : action.label}
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

      {statusMessage ? (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-xl border px-4 py-3 text-sm ${
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
    </article>
  );
}

export default function LearnerLiveClasses() {
  const { isLearner, section: data, refresh, refreshAfterAction } = useLearnerDashboardSection('liveClassrooms');
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const [sessionStatus, setSessionStatus] = useState({});
  const [pendingSessions, setPendingSessions] = useState({});

  if (!isLearner) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Learner Learnspace required"
        description="Switch to the learner dashboard to manage live classroom participation."
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

  const metrics = useMemo(() => (Array.isArray(data.metrics) ? data.metrics : []), [data.metrics]);
  const active = useMemo(() => (Array.isArray(data.active) ? data.active : []), [data.active]);
  const upcoming = useMemo(() => (Array.isArray(data.upcoming) ? data.upcoming : []), [data.upcoming]);
  const completed = useMemo(() => (Array.isArray(data.completed) ? data.completed : []), [data.completed]);
  const groups = useMemo(() => (Array.isArray(data.groups) ? data.groups : []), [data.groups]);
  const whiteboardSnapshots = useMemo(
    () => (Array.isArray(data.whiteboard?.snapshots) ? data.whiteboard.snapshots : []),
    [data.whiteboard?.snapshots]
  );
  const readiness = useMemo(
    () => (Array.isArray(data.whiteboard?.readiness) ? data.whiteboard.readiness : []),
    [data.whiteboard?.readiness]
  );

  const handleSessionAction = async (sessionItem) => {
    if (!token) {
      setSessionStatus((prev) => ({
        ...prev,
        [sessionItem.id]: { type: 'error', message: 'Sign in to manage live sessions.' }
      }));
      return;
    }
    const action = sessionItem.callToAction?.action;
    if (!action) return;
    setPendingSessions((prev) => ({ ...prev, [sessionItem.id]: action }));
    setSessionStatus((prev) => ({
      ...prev,
      [sessionItem.id]: {
        type: 'pending',
        message: action === 'check-in' ? 'Checking you in…' : 'Generating join link…'
      }
    }));
    try {
      const handler = action === 'check-in' ? checkInLiveSession : joinLiveSession;
      const result = await refreshAfterAction(() =>
        handler({ token, sessionId: sessionItem.id, payload: { location: 'dashboard' } })
      );
      const message =
        action === 'check-in'
          ? result?.message ?? 'Check-in complete.'
          : result?.joinUrl
            ? `Join link ready: ${result.joinUrl}`
            : 'Join link ready.';
      setSessionStatus((prev) => ({
        ...prev,
        [sessionItem.id]: { type: 'success', message }
      }));
    } catch (error) {
      setSessionStatus((prev) => ({
        ...prev,
        [sessionItem.id]: {
          type: 'error',
          message: error instanceof Error ? error.message : 'Unable to process the session request.'
        }
      }));
    } finally {
      setPendingSessions((prev) => {
        const next = { ...prev };
        delete next[sessionItem.id];
        return next;
      });
    }
  };

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
                  className={`mt-2 text-sm font-medium ${metric.trend === 'down' ? 'text-rose-500' : 'text-emerald-600'}`}
                >
                  {metric.change}
                </p>
              )}
            </div>
          ))}
          {metrics.length === 0 && (
            <p className="col-span-full text-sm text-slate-500">
              No live session telemetry available. Connect your classroom providers to populate this section.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {active.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onAction={handleSessionAction}
            pendingAction={pendingSessions[session.id]}
            statusMessage={sessionStatus[session.id]}
          />
        ))}
        {active.length === 0 && (
          <DashboardStateMessage
            title="No active sessions"
            description="You're not currently registered for any live classrooms. Review upcoming sessions to join the action."
          />
        )}
      </section>

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Upcoming live classrooms</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {upcoming.map((session) => (
            <div key={session.id} className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="dashboard-kicker">{session.startLabel}</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{session.title}</p>
                </div>
                <ReadinessBadge status={session.readiness} />
              </div>
              <p className="mt-3 text-sm text-slate-600">{session.summary}</p>
            </div>
          ))}
          {upcoming.length === 0 && (
            <DashboardStateMessage
              title="No upcoming sessions"
              description="Great news – you have breathing room. Use this time to review replays or prep your next cohort."
            />
          )}
        </div>
      </section>

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Completed experiences</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {completed.map((session) => (
            <div key={session.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{session.title}</p>
              <p className="mt-1 text-xs">Facilitated by {session.facilitator}</p>
              <p className="mt-2 text-xs text-slate-500">Recording ready · {session.recordingStatus}</p>
            </div>
          ))}
          {completed.length === 0 && (
            <p className="col-span-full text-sm text-slate-500">No recent live classrooms have wrapped yet.</p>
          )}
        </div>
      </section>

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Breakout pods</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {groups.map((group) => (
            <div key={group.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="dashboard-kicker">{group.label}</p>
              <p className="mt-1 text-sm text-slate-600">Moderator {group.moderator}</p>
              <p className="mt-2 text-xs text-slate-500">{group.description}</p>
            </div>
          ))}
          {groups.length === 0 && (
            <p className="col-span-full text-sm text-slate-500">
              No breakout pods configured yet. Add pods to orchestrate smaller cohort experiences.
            </p>
          )}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Whiteboard readiness</h2>
            <p className="text-sm text-slate-600">Live whiteboards that need action before your next sessions go live.</p>
          </div>
          <button type="button" className="dashboard-pill" onClick={() => refresh?.()}>
            Refresh snapshots
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {whiteboardSnapshots.map((snapshot) => (
            <div key={snapshot.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="dashboard-kicker">{snapshot.template}</p>
              <p className="mt-1 text-sm text-slate-600">{snapshot.updatedAt}</p>
              <p className="mt-2 text-xs text-slate-500">Maintainer {snapshot.owner}</p>
            </div>
          ))}
          {whiteboardSnapshots.length === 0 && (
            <p className="col-span-full text-sm text-slate-500">
              Whiteboard snapshots look good! Automations will populate this space if changes are required.
            </p>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {readiness.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <ReadinessBadge status={item.status} />
              </div>
              <p className="mt-2 text-xs text-slate-500">Owner {item.owner}</p>
            </div>
          ))}
          {readiness.length === 0 && (
            <p className="col-span-full text-sm text-slate-500">All set! No readiness actions pending.</p>
          )}
        </div>
      </section>
    </div>
  );
}
