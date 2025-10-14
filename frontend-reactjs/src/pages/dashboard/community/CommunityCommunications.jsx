import PropTypes from 'prop-types';
import { useMemo } from 'react';

import DashboardStateMessage from '../../../components/dashboard/DashboardStateMessage.jsx';

export default function CommunityCommunications({ dashboard, onRefresh }) {
  const highlights = useMemo(
    () => (Array.isArray(dashboard?.communications?.highlights) ? dashboard.communications.highlights : []),
    [dashboard?.communications?.highlights]
  );
  const broadcasts = useMemo(
    () => (Array.isArray(dashboard?.communications?.broadcasts) ? dashboard.communications.broadcasts : []),
    [dashboard?.communications?.broadcasts]
  );
  const trends = useMemo(
    () => (Array.isArray(dashboard?.communications?.trends) ? dashboard.communications.trends : []),
    [dashboard?.communications?.trends]
  );

  if (!dashboard) {
    return (
      <DashboardStateMessage
        title="Communications telemetry unavailable"
        description="We could not retrieve communications insights. Refresh to retry loading highlights and broadcast data."
        actionLabel="Refresh"
        onAction={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">Communications hub</h1>
          <p className="dashboard-subtitle">
            Review conversation highlights, upcoming announcements, and engagement trends across your communities.
          </p>
        </div>
        <button type="button" className="dashboard-primary-pill" onClick={onRefresh}>
          Refresh engagement data
        </button>
      </header>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Conversation highlights</p>
          <h2 className="text-lg font-semibold text-slate-900">Signals from your members</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {highlights.map((highlight) => (
            <div key={highlight.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{highlight.community}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{highlight.preview}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{highlight.postedAt}</span>
                <span>•</span>
                <span>{highlight.reactions} reactions</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-primary">
                {highlight.tags?.map((tag) => (
                  <span key={`${highlight.id}-${tag}`} className="rounded-full bg-primary/10 px-3 py-1">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {highlights.length === 0 ? (
            <DashboardStateMessage
              title="No highlights yet"
              description="Member conversations will appear here once engagement telemetry is captured."
            />
          ) : null}
        </div>
      </section>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Broadcast pipeline</p>
          <h2 className="text-lg font-semibold text-slate-900">Announcements calendar</h2>
        </div>
        <ul className="space-y-4">
          {broadcasts.map((broadcast) => (
            <li key={broadcast.id} className="rounded-2xl border border-slate-200 p-5">
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
            title="No broadcasts scheduled"
            description="Plan announcements, webinars, or podcast drops to orchestrate member communications."
          />
        ) : null}
      </section>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Engagement trends</p>
          <h2 className="text-lg font-semibold text-slate-900">Community sentiment</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trends.map((trend) => (
            <div key={trend.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{trend.metric}</p>
              <p className="mt-1 text-xs text-slate-500">Current: {trend.current}</p>
              <p className="mt-1 text-xs text-slate-500">Previous: {trend.previous}</p>
            </div>
          ))}
          {trends.length === 0 ? (
            <DashboardStateMessage
              title="No trend data"
              description="Once participation telemetry is active we will surface trend deltas across each community."
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

CommunityCommunications.propTypes = {
  dashboard: PropTypes.object,
  onRefresh: PropTypes.func
};

CommunityCommunications.defaultProps = {
  dashboard: null,
  onRefresh: undefined
};
