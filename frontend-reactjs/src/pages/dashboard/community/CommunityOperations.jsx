import PropTypes from 'prop-types';
import { useMemo } from 'react';

import DashboardStateMessage from '../../../components/dashboard/DashboardStateMessage.jsx';

export default function CommunityOperations({ dashboard, onRefresh }) {
  const runbooks = useMemo(
    () => (Array.isArray(dashboard?.operations?.runbooks) ? dashboard.operations.runbooks : []),
    [dashboard?.operations?.runbooks]
  );
  const escalations = useMemo(
    () => (Array.isArray(dashboard?.operations?.escalations) ? dashboard.operations.escalations : []),
    [dashboard?.operations?.escalations]
  );
  const moderators = useMemo(
    () => (Array.isArray(dashboard?.health?.moderators) ? dashboard.health.moderators : []),
    [dashboard?.health?.moderators]
  );

  if (!dashboard) {
    return (
      <DashboardStateMessage
        title="Community operations unavailable"
        description="We could not resolve any operational telemetry for your communities. Refresh once data sources are synced."
        actionLabel="Refresh"
        onAction={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">Operations command center</h1>
          <p className="dashboard-subtitle">
            Review playbooks, outstanding escalations, and moderator coverage to maintain consistent community rituals.
          </p>
        </div>
        <button type="button" className="dashboard-primary-pill" onClick={onRefresh}>
          Refresh signals
        </button>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="dashboard-section space-y-5">
          <div>
            <p className="dashboard-kicker">Runbooks</p>
            <h2 className="text-lg font-semibold text-slate-900">Automation-ready playbooks</h2>
          </div>
          <ul className="space-y-4">
            {runbooks.map((runbook) => (
              <li key={runbook.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{runbook.title}</p>
                    <p className="mt-1 text-xs text-slate-500">Maintained by {runbook.owner}</p>
                  </div>
                  <span
                    className={`dashboard-pill px-3 py-1 text-xs font-semibold ${
                      runbook.automationReady ? 'border-primary/30 text-primary' : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    {runbook.automationReady ? 'Automation ready' : 'Manual workflow'}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  {runbook.tags?.map((tag) => (
                    <span key={`${runbook.id}-${tag}`} className="dashboard-pill px-3 py-1">
                      {tag}
                    </span>
                  ))}
                  <span className="dashboard-pill px-3 py-1">Updated {runbook.updatedAt}</span>
                </div>
              </li>
            ))}
          </ul>
          {runbooks.length === 0 ? (
            <DashboardStateMessage
              title="No runbooks available"
              description="Create a community operations playbook to document rituals, cadences, and escalation paths."
            />
          ) : null}
        </article>

        <article className="dashboard-section space-y-5">
          <div>
            <p className="dashboard-kicker">Escalations</p>
            <h2 className="text-lg font-semibold text-slate-900">Operational backlog</h2>
          </div>
          <ul className="space-y-4">
            {escalations.map((task) => (
              <li key={task.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-amber-900">{task.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-amber-600">Due {task.due}</p>
                  </div>
                  <span className="dashboard-pill border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                    {task.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-amber-800">{task.community}</p>
                <p className="mt-1 text-xs text-amber-700">Owner: {task.owner}</p>
              </li>
            ))}
          </ul>
          {escalations.length === 0 ? (
            <DashboardStateMessage
              title="No escalations in queue"
              description="Escalation-ready rituals will surface here when tasks require intervention."
            />
          ) : null}
        </article>
      </section>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Moderator coverage</p>
          <h2 className="text-lg font-semibold text-slate-900">Leadership roster</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {moderators.map((moderator) => (
            <div key={moderator.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{moderator.role}</p>
              <p className="mt-1 text-xs text-slate-500">{moderator.community}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="dashboard-pill px-3 py-1">{moderator.timezone}</span>
                <span className="dashboard-pill px-3 py-1">{moderator.coverage}</span>
              </div>
            </div>
          ))}
          {moderators.length === 0 ? (
            <DashboardStateMessage
              title="No moderators assigned"
              description="Invite moderators or community leads to ensure hand-offs and coverage are documented."
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

CommunityOperations.propTypes = {
  dashboard: PropTypes.object,
  onRefresh: PropTypes.func
};

CommunityOperations.defaultProps = {
  dashboard: null,
  onRefresh: undefined
};
