import PropTypes from 'prop-types';
import { useMemo } from 'react';

import DashboardStateMessage from '../../../components/dashboard/DashboardStateMessage.jsx';

export default function CommunityMonetisation({ dashboard, onRefresh }) {
  const tiers = useMemo(
    () => (Array.isArray(dashboard?.monetisation?.tiers) ? dashboard.monetisation.tiers : []),
    [dashboard?.monetisation?.tiers]
  );
  const experiments = useMemo(
    () => (Array.isArray(dashboard?.monetisation?.experiments) ? dashboard.monetisation.experiments : []),
    [dashboard?.monetisation?.experiments]
  );
  const insights = useMemo(
    () => (Array.isArray(dashboard?.monetisation?.insights) ? dashboard.monetisation.insights : []),
    [dashboard?.monetisation?.insights]
  );

  if (!dashboard) {
    return (
      <DashboardStateMessage
        title="Monetisation telemetry unavailable"
        description="We were unable to load paywall or campaign data. Refresh after syncing your billing sources."
        actionLabel="Refresh"
        onAction={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">Community monetisation</h1>
          <p className="dashboard-subtitle">
            Track premium tiers, membership health, and growth experiments powering your communities.
          </p>
        </div>
        <button type="button" className="dashboard-primary-pill" onClick={onRefresh}>
          Refresh revenue signals
        </button>
      </header>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Premium tiers</p>
          <h2 className="text-lg font-semibold text-slate-900">Active membership products</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tiers.map((tier) => (
            <div key={tier.id} className="rounded-2xl border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-900">{tier.name}</p>
              <p className="mt-1 text-xs text-slate-500">{tier.price}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="dashboard-pill px-3 py-1">{tier.members}</span>
                <span className="dashboard-pill px-3 py-1">{tier.churn}</span>
                <span className="dashboard-pill px-3 py-1">Next: {tier.renewal}</span>
              </div>
            </div>
          ))}
          {tiers.length === 0 ? (
            <DashboardStateMessage
              title="No premium tiers"
              description="Configure a subscription tier or cohort upgrade to generate recurring community revenue."
            />
          ) : null}
        </div>
      </section>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Growth experiments</p>
          <h2 className="text-lg font-semibold text-slate-900">Campaign telemetry</h2>
        </div>
        <ul className="space-y-4">
          {experiments.map((experiment) => (
            <li key={experiment.id} className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-primary-dark">{experiment.name}</p>
                  <p className="mt-1 text-xs text-primary">{experiment.community}</p>
                </div>
                <span className="dashboard-pill border-primary/40 px-3 py-1 text-xs font-semibold text-primary">
                  {experiment.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-primary-dark">{experiment.hypothesis}</p>
            </li>
          ))}
        </ul>
        {experiments.length === 0 ? (
          <DashboardStateMessage
            title="No experiments running"
            description="Launch an acquisition or conversion experiment to start tracking monetisation hypotheses."
          />
        ) : null}
      </section>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Key insights</p>
          <h2 className="text-lg font-semibold text-slate-900">Revenue highlights</h2>
        </div>
        <ul className="space-y-3">
          {insights.map((insight, index) => (
            <li key={`${insight}-${index}`} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
              {insight}
            </li>
          ))}
        </ul>
        {insights.length === 0 ? (
          <DashboardStateMessage
            title="No monetisation highlights"
            description="As revenue data streams in we will surface forecasts, renewal telemetry, and pipeline trends."
          />
        ) : null}
      </section>
    </div>
  );
}

CommunityMonetisation.propTypes = {
  dashboard: PropTypes.object,
  onRefresh: PropTypes.func
};

CommunityMonetisation.defaultProps = {
  dashboard: null,
  onRefresh: undefined
};
