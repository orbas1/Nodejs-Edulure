import PropTypes from 'prop-types';
import { useMemo } from 'react';

import DashboardStateMessage from '../../../components/dashboard/DashboardStateMessage.jsx';

export default function CommunityProgramming({ dashboard, onRefresh }) {
  const events = useMemo(
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
          <a href="/dashboard/community/communications" className="dashboard-pill px-4 py-2">
            Open communications hub
          </a>
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
