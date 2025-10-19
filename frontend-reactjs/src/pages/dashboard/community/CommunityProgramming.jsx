import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';

import DashboardStateMessage from '../../../components/dashboard/DashboardStateMessage.jsx';
import { scheduleCommunityEvent } from '../../../api/communityApi.js';
import { useAuth } from '../../../context/AuthContext.jsx';

export default function CommunityProgramming({ dashboard, onRefresh }) {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const initialEvents = useMemo(
    () => (Array.isArray(dashboard?.programming?.upcomingEvents) ? dashboard.programming.upcomingEvents : []),
    [dashboard?.programming?.upcomingEvents]
  );
  const tutorPods = useMemo(
    () => (Array.isArray(dashboard?.programming?.tutorPods) ? dashboard.programming.tutorPods : []),
    [dashboard?.programming?.tutorPods]
  );
  const broadcasts = useMemo(
    () => (Array.isArray(dashboard?.programming?.broadcasts) ? dashboard.programming.broadcasts : []),
    [dashboard?.programming?.broadcasts]
  );
  const [events, setEvents] = useState(initialEvents);
  const [error, setError] = useState(null);
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  const formatEvent = (event) => ({
    ...event,
    date: event.date ?? (event.startAt ? new Date(event.startAt).toLocaleString() : undefined),
    status: event.status ?? 'scheduled',
    facilitator: event.facilitator ?? event.owner ?? 'Community team',
    seats: event.seats ?? (event.attendanceLimit ? `${event.attendanceLimit} seats` : 'Open seating')
  });

  const handleScheduleEvent = useCallback(async () => {
    if (!token) {
      setError('You must be signed in to schedule events.');
      return;
    }
    setError(null);
    const title = window.prompt('Event title');
    if (!title) {
      return;
    }
    const startAtInput = window.prompt('Start time (ISO)', new Date().toISOString());
    const endAtInput = window.prompt(
      'End time (ISO)',
      new Date(Date.now() + 60 * 60 * 1000).toISOString()
    );
    const communityId =
      dashboard?.programming?.targetCommunityId ??
      events[0]?.communityId ??
      window.prompt('Target community ID');
    if (!communityId) {
      setError('Community identifier is required to schedule an event.');
      return;
    }

    const optimisticEvent = formatEvent({
      id: `temp-${Date.now()}`,
      title,
      startAt: startAtInput,
      endAt: endAtInput,
      facilitator: 'Pending facilitator',
      seats: 'Pending capacity',
      status: 'scheduled',
      communityId
    });
    setEvents((prev) => [optimisticEvent, ...prev]);
    setIsScheduling(true);
    try {
      const response = await scheduleCommunityEvent({
        communityId,
        token,
        payload: {
          title,
          summary: '',
          description: '',
          startAt: startAtInput,
          endAt: endAtInput,
          isOnline: true
        }
      });
      if (response.data) {
        setEvents((prev) =>
          prev.map((event) => (event.id === optimisticEvent.id ? formatEvent(response.data) : event))
        );
      }
    } catch (err) {
      setEvents((prev) => prev.filter((event) => event.id !== optimisticEvent.id));
      setError(err?.message || 'Failed to schedule event.');
    } finally {
      setIsScheduling(false);
    }
  }, [dashboard?.programming?.targetCommunityId, events, token]);

  if (!dashboard) {
    return (
      <DashboardStateMessage
        title="Programming telemetry unavailable"
        description="We were unable to load events or broadcasts for your communities. Refresh to retry the sync."
        actionLabel="Refresh"
        onAction={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">Programming and rituals</h1>
          <p className="dashboard-subtitle">
            Coordinate the rituals, live sessions, and broadcasts that keep your communities energised and aligned.
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" className="dashboard-primary-pill" onClick={onRefresh}>
            Refresh agenda
          </button>
          <button
            type="button"
            className="dashboard-pill px-4 py-2"
            onClick={handleScheduleEvent}
            disabled={isScheduling}
          >
            {isScheduling ? 'Scheduling…' : 'Schedule event'}
          </button>
        </div>
      </header>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Live rituals</p>
          <h2 className="text-lg font-semibold text-slate-900">Upcoming sessions</h2>
        </div>
        <ul className="space-y-4">
          {events.map((event) => (
            <li key={event.id} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-900">{event.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{event.date}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="dashboard-pill px-3 py-1">{event.facilitator}</span>
                  <span className="dashboard-pill px-3 py-1">{event.seats}</span>
                  <span className="dashboard-pill px-3 py-1 capitalize">{event.status}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {events.length === 0 ? (
          <DashboardStateMessage
            title="No rituals scheduled"
            description="Plan a live classroom or cohort ritual to populate the programming roadmap."
          />
        ) : null}
        {error ? (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-rose-700"
          >
            {error}
          </div>
        ) : null}
      </section>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Tutor pods</p>
          <h2 className="text-lg font-semibold text-slate-900">Mentorship commitments</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tutorPods.map((pod) => (
            <div key={pod.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{pod.mentor}</p>
              <p className="mt-1 text-xs text-slate-500">{pod.focus}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="dashboard-pill px-3 py-1">{pod.status}</span>
                <span className="dashboard-pill px-3 py-1">{pod.scheduled}</span>
              </div>
            </div>
          ))}
          {tutorPods.length === 0 ? (
            <DashboardStateMessage
              title="No mentor sessions"
              description="Coordinate mentor pods and publish availability to populate this view."
            />
          ) : null}
        </div>
      </section>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Broadcast pipeline</p>
          <h2 className="text-lg font-semibold text-slate-900">Announcements and media</h2>
        </div>
        <ul className="space-y-4">
          {broadcasts.map((broadcast) => (
            <li key={broadcast.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-900">{broadcast.title}</p>
                  <p className="mt-1 text-xs text-slate-500">Channel: {broadcast.channel}</p>
                </div>
                <span className="dashboard-pill px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {broadcast.stage}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Release: {broadcast.release}</p>
            </li>
          ))}
        </ul>
        {broadcasts.length === 0 ? (
          <DashboardStateMessage
            title="No broadcasts queued"
            description="Draft a broadcast or programme update to begin orchestrating your communications cadence."
          />
        ) : null}
      </section>
    </div>
  );
}

CommunityProgramming.propTypes = {
  dashboard: PropTypes.object,
  onRefresh: PropTypes.func
};

CommunityProgramming.defaultProps = {
  dashboard: null,
  onRefresh: undefined
};
