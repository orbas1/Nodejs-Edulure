import PropTypes from 'prop-types';
import { useMemo } from 'react';

function formatPercent(value) {
  if (!Number.isFinite(value)) return '—';
  return `${Math.round(value)}%`;
}

function normaliseMetrics(metrics) {
  if (!Array.isArray(metrics)) return [];
  return metrics
    .map((metric) => {
      if (!metric) return null;
      const value = Number(metric.value ?? metric.currentValue ?? metric.count);
      const target = Number(metric.target ?? metric.targetValue ?? metric.goal);
      const progress = Number.isFinite(value) && Number.isFinite(target) && target > 0 ? (value / target) * 100 : null;
      return {
        id: metric.id ?? metric.label ?? metric.name ?? Math.random().toString(36).slice(2),
        label: metric.label ?? metric.name ?? 'Goal metric',
        value: Number.isFinite(value) ? value : metric.value ?? metric.currentValue ?? '—',
        unit: metric.unit ?? metric.unitLabel ?? null,
        target: Number.isFinite(target) ? target : null,
        progress,
        trend: metric.trend ?? metric.delta ?? null
      };
    })
    .filter(Boolean)
    .slice(0, 6);
}

export default function LearnerGoalsWidget({ initiatives, metrics }) {
  const metricCards = useMemo(() => normaliseMetrics(metrics), [metrics]);
  const initiativeStats = useMemo(() => {
    const all = Array.isArray(initiatives) ? initiatives : [];
    const total = all.length;
    const active = all.filter((item) => String(item.status ?? '').toLowerCase() === 'active').length;
    const completed = all.filter((item) => String(item.status ?? '').toLowerCase() === 'completed').length;
    const paused = all.filter((item) => String(item.status ?? '').toLowerCase() === 'paused').length;
    const nextMilestone = all
      .map((item) => item.nextMilestone ?? item.endAt ?? item.deadline)
      .filter(Boolean)
      .sort();
    return {
      total,
      active,
      completed,
      paused,
      nextMilestone: nextMilestone[0] ?? null
    };
  }, [initiatives]);

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,_1.3fr)_minmax(0,_1fr)]">
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Learner goals</p>
            <h2 className="text-lg font-semibold text-slate-900">Pipeline status</h2>
          </div>
          {initiativeStats.nextMilestone ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Next milestone {initiativeStats.nextMilestone}
            </span>
          ) : null}
        </header>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active initiatives</dt>
            <dd className="mt-1 text-2xl font-semibold text-slate-900">{initiativeStats.active}</dd>
            <dd className="mt-1 text-xs text-slate-500">{initiativeStats.total} total</dd>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Completed</dt>
            <dd className="mt-1 text-2xl font-semibold text-emerald-800">{initiativeStats.completed}</dd>
            <dd className="mt-1 text-xs text-emerald-700">Celebrated wins ready for recap</dd>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-amber-700">Paused or gated</dt>
            <dd className="mt-1 text-2xl font-semibold text-amber-800">{initiativeStats.paused}</dd>
            <dd className="mt-1 text-xs text-amber-700">Focus areas to unblock next</dd>
          </div>
        </dl>
      </div>
      <div className="space-y-3 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Key metrics</h3>
        {metricCards.length === 0 ? (
          <p className="text-sm text-slate-600">Track initiative metrics to surface momentum and focus areas automatically.</p>
        ) : (
          <ul className="space-y-3">
            {metricCards.map((metric) => (
              <li key={metric.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.label}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {metric.value}
                      {metric.unit ? <span className="ml-1 text-xs font-semibold text-slate-500">{metric.unit}</span> : null}
                    </p>
                  </div>
                  {metric.progress !== null ? (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {formatPercent(metric.progress)}
                    </span>
                  ) : null}
                </div>
                {metric.target ? (
                  <p className="mt-1 text-xs text-slate-500">Target {metric.target}</p>
                ) : null}
                {metric.trend ? (
                  <p className="mt-1 text-xs text-primary">Trend {metric.trend}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

LearnerGoalsWidget.propTypes = {
  initiatives: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      status: PropTypes.string,
      nextMilestone: PropTypes.string,
      endAt: PropTypes.string,
      deadline: PropTypes.string
    })
  ),
  metrics: PropTypes.arrayOf(PropTypes.object)
};

LearnerGoalsWidget.defaultProps = {
  initiatives: [],
  metrics: []
};
