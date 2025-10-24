import PropTypes from 'prop-types';

import MetricCard from './MetricCard.jsx';

const toneClassByHealth = {
  operational: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  degraded: 'bg-amber-50 text-amber-700 border-amber-200',
  incident: 'bg-rose-50 text-rose-700 border-rose-200',
  critical: 'bg-rose-50 text-rose-700 border-rose-200'
};

function formatRelativeTime(timestamp) {
  if (!timestamp) return null;
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 0) return 'moments ago';
  const seconds = Math.round(diff / 1000);
  if (seconds < 45) return 'moments ago';
  if (seconds < 90) return 'about a minute ago';
  const minutes = Math.round(seconds / 60);
  if (minutes < 45) return `${minutes} minutes ago`;
  if (minutes < 90) return 'about an hour ago';
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 4) return `${weeks} weeks ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} months ago`;
  const years = Math.round(days / 365);
  return `${years} years ago`;
}

export default function DashboardSwitcherHeader({
  title,
  description,
  surface,
  onRefresh,
  actions,
  alignMetrics
}) {
  const resolvedTitle = title ?? surface?.title ?? 'Workspace overview';
  const resolvedDescription = description ?? surface?.description ?? surface?.summary ?? null;
  const lastSynced = surface?.lastSyncedAt ? formatRelativeTime(surface.lastSyncedAt) : null;
  const healthTone = surface?.serviceHealth ? toneClassByHealth[surface.serviceHealth] ?? 'bg-slate-100 text-slate-600 border-slate-200' : null;

  return (
    <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-900">{resolvedTitle}</h1>
          {resolvedDescription ? <p className="max-w-2xl text-sm text-slate-600">{resolvedDescription}</p> : null}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {surface?.serviceHealth ? (
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold ${healthTone}`}>
                <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
                {surface.serviceHealth === 'operational' ? 'Operational' : surface.serviceHealth}
              </span>
            ) : null}
            {surface?.stale ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                Data refresh recommended
              </span>
            ) : null}
            {lastSynced ? <span>Synced {lastSynced}</span> : null}
            {typeof surface?.pendingCount === 'number' && surface.pendingCount > 0 ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 font-semibold text-primary">
                {surface.pendingCount} awaiting attention
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          {Array.isArray(actions)
            ? actions.map((action) => (
                <button
                  key={action.id ?? action.label}
                  type="button"
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary/50 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  onClick={action.onSelect}
                >
                  {action.label}
                </button>
              ))
            : null}
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              Refresh data
            </button>
          ) : null}
        </div>
      </div>
      {surface?.metrics?.length ? (
        <div className={`mt-6 grid gap-3 ${alignMetrics === 'center' ? 'sm:grid-cols-3' : 'sm:grid-cols-3 lg:grid-cols-3'}`}>
          {surface.metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              helper={metric.helper}
              tone={metric.tone}
              trend={metric.trend}
            />
          ))}
        </div>
      ) : null}
    </header>
  );
}

DashboardSwitcherHeader.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  surface: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    lastSyncedAt: PropTypes.number,
    serviceHealth: PropTypes.string,
    pendingCount: PropTypes.number,
    stale: PropTypes.bool,
    metrics: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        helper: PropTypes.string,
        tone: PropTypes.string,
        trend: PropTypes.shape({
          direction: PropTypes.oneOf(['up', 'down', 'steady']),
          label: PropTypes.string
        })
      })
    )
  }),
  onRefresh: PropTypes.func,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      label: PropTypes.string.isRequired,
      onSelect: PropTypes.func
    })
  ),
  alignMetrics: PropTypes.oneOf(['start', 'center'])
};

DashboardSwitcherHeader.defaultProps = {
  title: null,
  description: null,
  surface: null,
  onRefresh: null,
  actions: null,
  alignMetrics: 'start'
};
