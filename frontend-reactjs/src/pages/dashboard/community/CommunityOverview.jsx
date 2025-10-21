import PropTypes from 'prop-types';
import { useMemo } from 'react';

import MetricCard from '../../../components/dashboard/MetricCard.jsx';
import DashboardStateMessage from '../../../components/dashboard/DashboardStateMessage.jsx';
import useRoleGuard from '../../../hooks/useRoleGuard.js';

export default function CommunityOverview({ dashboard, onRefresh }) {
  const { allowed, explanation } = useRoleGuard(['community', 'admin']);
  const metrics = useMemo(() => (Array.isArray(dashboard?.metrics) ? dashboard.metrics : []), [dashboard?.metrics]);
  const healthOverview = useMemo(
    () => (Array.isArray(dashboard?.health?.overview) ? dashboard.health.overview : []),
    [dashboard?.health?.overview]
  );
  const insights = useMemo(
    () => (Array.isArray(dashboard?.monetisation?.insights) ? dashboard.monetisation.insights : []),
    [dashboard?.monetisation?.insights]
  );
  const events = useMemo(
    () => (Array.isArray(dashboard?.programming?.upcomingEvents) ? dashboard.programming.upcomingEvents : []),
    [dashboard?.programming?.upcomingEvents]
  );
  const runbooks = useMemo(
    () => (Array.isArray(dashboard?.operations?.runbooks) ? dashboard.operations.runbooks : []),
    [dashboard?.operations?.runbooks]
  );
  const highlights = useMemo(
    () => (Array.isArray(dashboard?.communications?.highlights) ? dashboard.communications.highlights : []),
    [dashboard?.communications?.highlights]
  );

  if (!allowed) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Community privileges required"
        description={explanation ?? 'Switch to a community workspace to view operations intelligence.'}
      />
    );
  }

  if (!dashboard) {
    return (
      <DashboardStateMessage
        title="Community intelligence unavailable"
        description="We could not resolve any community operations signals for this Learnspace yet. Refresh after syncing sources."
        actionLabel="Refresh"
        onAction={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="dashboard-kicker text-primary">Community operations</p>
          <h1 className="dashboard-title">Community command deck</h1>
          <p className="dashboard-subtitle">
            Track membership health, programme readiness, and monetisation signals across every community you steward.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="dashboard-primary-pill" onClick={onRefresh}>
            Refresh telemetry
          </button>
          <a
            href="/dashboard/community/operations"
            className="dashboard-pill flex items-center gap-2 px-4 py-2"
          >
            View runbooks
          </a>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="dashboard-section space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="dashboard-kicker">Community health</p>
              <h2 className="text-lg font-semibold text-slate-900">Active Learnspaces</h2>
            </div>
            <a href="/dashboard/community/safety" className="dashboard-pill px-3 py-1">
              Escalation queue
            </a>
          </div>
          <div className="space-y-4">
            {healthOverview.slice(0, 4).map((community) => (
              <div
                key={community.id}
                className="rounded-2xl border border-slate-200 p-5 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                  <span>{community.members}</span>
                  <span>{community.trend}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{community.name}</p>
                    <p className="text-xs text-slate-500">Health: {community.health}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>{community.moderators}</p>
                    {community.approvalsPending > 0 ? (
                      <p className="mt-1 text-amber-600">
                        {community.approvalsPending} pending approval{community.approvalsPending === 1 ? '' : 's'}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Incidents</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{community.incidentsOpen ?? 0} open</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Escalations</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{community.escalationsOpen ?? 0} tracked</p>
                  </div>
                </div>
              </div>
            ))}
            {healthOverview.length === 0 ? (
              <DashboardStateMessage
                title="No managed communities"
                description="Once you steward a community we will surface health and engagement telemetry here."
              />
            ) : null}
          </div>
        </article>

        <article className="dashboard-section flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="dashboard-kicker">Upcoming events</p>
              <h2 className="text-lg font-semibold text-slate-900">Member rituals and live programmes</h2>
            </div>
            <a href="/dashboard/community/programming" className="dashboard-pill px-3 py-1">
              Programming hub
            </a>
          </div>
          <ul className="space-y-4">
            {events.slice(0, 5).map((event) => (
              <li key={event.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                <p className="mt-1 text-xs text-slate-500">{event.date}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="dashboard-pill px-3 py-1">{event.facilitator}</span>
                  <span className="dashboard-pill px-3 py-1">{event.seats}</span>
                  <span className="dashboard-pill px-3 py-1 capitalize">{event.status}</span>
                </div>
              </li>
            ))}
            {events.length === 0 ? (
              <DashboardStateMessage
                title="No events scheduled"
                description="Schedule a ritual or broadcast to populate your community programming roadmap."
              />
            ) : null}
          </ul>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="dashboard-section space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="dashboard-kicker">Runbooks</p>
              <h2 className="text-lg font-semibold text-slate-900">Operational playbooks</h2>
            </div>
            <a href="/dashboard/community/operations" className="dashboard-pill px-3 py-1">
              Manage runbooks
            </a>
          </div>
          <ul className="space-y-3">
            {runbooks.slice(0, 4).map((runbook) => (
              <li key={runbook.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{runbook.title}</p>
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {runbook.automationReady ? 'Automated' : 'Manual'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Owner: {runbook.owner}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  {runbook.tags?.map((tag) => (
                    <span key={`${runbook.id}-${tag}`} className="dashboard-pill px-3 py-1">
                      {tag}
                    </span>
                  ))}
                </div>
              </li>
            ))}
            {runbooks.length === 0 ? (
              <DashboardStateMessage
                title="No runbooks published"
                description="Upload or author a community ritual playbook to standardise your operations."
              />
            ) : null}
          </ul>
        </article>

        <article className="dashboard-section space-y-4">
          <div>
            <p className="dashboard-kicker">Growth insights</p>
            <h2 className="text-lg font-semibold text-slate-900">Monetisation highlights</h2>
          </div>
          <ul className="space-y-3">
            {insights.slice(0, 5).map((insight, index) => (
              <li key={`${insight}-${index}`} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                {insight}
              </li>
            ))}
            {insights.length === 0 ? (
              <DashboardStateMessage
                title="No monetisation signals"
                description="Launch a premium tier or campaign to unlock actionable community revenue telemetry."
              />
            ) : null}
          </ul>
        </article>
      </section>

      <section className="dashboard-section space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="dashboard-kicker">Member highlights</p>
            <h2 className="text-lg font-semibold text-slate-900">Recent community moments</h2>
          </div>
          <a href="/dashboard/community/communications" className="dashboard-pill px-3 py-1">
            Communications hub
          </a>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {highlights.slice(0, 6).map((highlight) => (
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
              title="No conversations detected"
              description="Encourage members to share updates so we can capture highlights here."
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

CommunityOverview.propTypes = {
  dashboard: PropTypes.object,
  onRefresh: PropTypes.func
};

CommunityOverview.defaultProps = {
  dashboard: null,
  onRefresh: undefined
};
