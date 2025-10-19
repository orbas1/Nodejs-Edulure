import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';

import DashboardStateMessage from '../../../components/dashboard/DashboardStateMessage.jsx';
import { resolveCommunityIncident } from '../../../api/communityApi.js';
import { useAuth } from '../../../context/AuthContext.jsx';

export default function CommunitySafety({ dashboard, onRefresh }) {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const initialIncidents = useMemo(
    () => (Array.isArray(dashboard?.safety?.incidents) ? dashboard.safety.incidents : []),
    [dashboard?.safety?.incidents]
  );
  const initialBacklog = useMemo(
    () => (Array.isArray(dashboard?.safety?.backlog) ? dashboard.safety.backlog : []),
    [dashboard?.safety?.backlog]
  );
  const moderators = useMemo(
    () => (Array.isArray(dashboard?.safety?.moderators) ? dashboard.safety.moderators : []),
    [dashboard?.safety?.moderators]
  );
  const [incidents, setIncidents] = useState(initialIncidents);
  const [backlog, setBacklog] = useState(initialBacklog);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIncidents(initialIncidents);
  }, [initialIncidents]);

  useEffect(() => {
    setBacklog(initialBacklog);
  }, [initialBacklog]);

  const resolveTargetCommunity = (fallbackIncident) =>
    dashboard?.safety?.targetCommunityId ??
    fallbackIncident?.communityId ??
    incidents[0]?.communityId ??
    backlog[0]?.communityId ??
    window.prompt('Target community ID');

  const handleResolve = useCallback(
    async (item) => {
      if (!token) {
        setError('You must be signed in to resolve incidents.');
        return;
      }
      const communityId = resolveTargetCommunity(item);
      if (!communityId) {
        setError('Community identifier is required to resolve incidents.');
        return;
      }
      setError(null);
      const note = window.prompt('Resolution summary (optional)') ?? '';
      try {
        await resolveCommunityIncident({
          communityId,
          incidentId: item.id,
          token,
          payload: note ? { resolutionSummary: note } : {}
        });
        setIncidents((prev) => prev.filter((incident) => incident.id !== item.id));
        setBacklog((prev) => prev.filter((task) => task.id !== item.id));
      } catch (err) {
        setError(err?.message || 'Failed to resolve incident.');
      }
    },
    [backlog, incidents, token]
  );

  if (!dashboard) {
    return (
      <DashboardStateMessage
        title="Safety telemetry unavailable"
        description="We were unable to load community safety signals. Refresh or ensure moderation data sources are connected."
        actionLabel="Refresh"
        onAction={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">Safety and governance</h1>
          <p className="dashboard-subtitle">
            Monitor incidents, escalations, and moderator coverage to uphold your community policies.
          </p>
        </div>
        <button type="button" className="dashboard-primary-pill" onClick={onRefresh}>
          Refresh safety signals
        </button>
      </header>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Active incidents</p>
          <h2 className="text-lg font-semibold text-slate-900">Escalations requiring attention</h2>
        </div>
        <ul className="space-y-4">
          {incidents.map((incident) => (
            <li key={incident.id} className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-rose-900">{incident.summary}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-rose-600">{incident.communityName}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-rose-600">
                  <span className="dashboard-pill border-rose-200 px-3 py-1">Severity: {incident.severity}</span>
                  <span className="dashboard-pill border-rose-200 px-3 py-1">Owner: {incident.owner}</span>
                  <button
                    type="button"
                    className="dashboard-pill border-rose-300 px-3 py-1 text-rose-700"
                    onClick={() => handleResolve(incident)}
                  >
                    Resolve
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-rose-600">Opened {incident.openedAt ? new Date(incident.openedAt).toLocaleString() : 'Recently'}</p>
            </li>
          ))}
        </ul>
        {incidents.length === 0 ? (
          <DashboardStateMessage
            title="No incidents logged"
            description="Once members flag conversations or moderators escalate issues, we will surface them here."
          />
        ) : null}
      </section>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Escalation backlog</p>
          <h2 className="text-lg font-semibold text-slate-900">Operational queue</h2>
        </div>
        <ul className="space-y-4">
          {backlog.map((task) => (
            <li key={task.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-amber-900">{task.title}</p>
                  <p className="mt-1 text-xs text-amber-600">{task.community}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-amber-600">
                  <span className="dashboard-pill border-amber-200 px-3 py-1">Owner: {task.owner}</span>
                  <span className="dashboard-pill border-amber-200 px-3 py-1">Status: {task.status}</span>
                  <span className="dashboard-pill border-amber-200 px-3 py-1">Due: {task.due}</span>
                  <button
                    type="button"
                    className="dashboard-pill border-amber-300 px-3 py-1 text-amber-700"
                    onClick={() => handleResolve(task)}
                  >
                    Resolve
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {backlog.length === 0 ? (
          <DashboardStateMessage
            title="No backlog"
            description="Escalations and operational tasks will appear here as workflows trigger."
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
          <p className="dashboard-kicker">Moderator roster</p>
          <h2 className="text-lg font-semibold text-slate-900">Coverage and time zones</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {moderators.map((moderator) => (
            <div key={moderator.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{moderator.community}</p>
              <p className="mt-1 text-xs text-slate-500">{moderator.role}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="dashboard-pill px-3 py-1">{moderator.timezone}</span>
                <span className="dashboard-pill px-3 py-1">{moderator.coverage}</span>
              </div>
            </div>
          ))}
          {moderators.length === 0 ? (
            <DashboardStateMessage
              title="No moderators configured"
              description="Assign moderators or stewards to each community to maintain safety coverage."
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

CommunitySafety.propTypes = {
  dashboard: PropTypes.object,
  onRefresh: PropTypes.func
};

CommunitySafety.defaultProps = {
  dashboard: null,
  onRefresh: undefined
};
