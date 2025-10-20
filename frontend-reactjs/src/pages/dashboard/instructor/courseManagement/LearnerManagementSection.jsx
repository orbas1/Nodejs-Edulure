import PropTypes from 'prop-types';
import { useMemo } from 'react';

const RISK_LEVEL_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function formatRiskLabel(riskLevel) {
  switch (riskLevel) {
    case 'critical':
      return 'Critical';
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    default:
      return 'Low';
  }
}

function resolveRiskClass(riskLevel) {
  if (riskLevel === 'critical') return 'text-rose-600';
  if (riskLevel === 'high') return 'text-amber-600';
  if (riskLevel === 'medium') return 'text-amber-500';
  return 'text-emerald-600';
}

export default function LearnerManagementSection({ learners }) {
  const roster = Array.isArray(learners?.roster) ? learners.roster : [];
  const riskAlerts = Array.isArray(learners?.riskAlerts) ? learners.riskAlerts : [];

  const rosterWithSort = useMemo(
    () =>
      [...roster].sort((a, b) => {
        const riskDelta = (RISK_LEVEL_ORDER[a.riskLevel] ?? 4) - (RISK_LEVEL_ORDER[b.riskLevel] ?? 4);
        if (riskDelta !== 0) return riskDelta;
        return (a.progressPercent ?? 0) - (b.progressPercent ?? 0);
      }),
    [roster]
  );

  const metrics = useMemo(() => {
    const totals = roster.reduce(
      (acc, entry) => {
        acc.total += 1;
        if (entry.status === 'active') acc.active += 1;
        if (entry.status === 'completed') acc.completed += 1;
        acc.progressSum += Number(entry.progressPercent ?? 0);
        acc.risk[entry.riskLevel ?? 'low'] = (acc.risk[entry.riskLevel ?? 'low'] ?? 0) + 1;
        return acc;
      },
      { total: 0, active: 0, completed: 0, progressSum: 0, risk: {} }
    );
    const averageProgress = totals.total ? Math.round(totals.progressSum / totals.total) : 0;
    const topRiskKey = Object.entries(totals.risk).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'low';
    return {
      totalLearners: totals.total,
      activeLearners: totals.active,
      averageProgress,
      topRiskLevel: topRiskKey,
      topRiskCount: totals.risk[topRiskKey] ?? 0
    };
  }, [roster]);

  if (rosterWithSort.length === 0 && riskAlerts.length === 0) {
    return null;
  }

  const handleEscalate = (entry) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('edulure:learner-intervention', {
        detail: {
          learnerId: entry.learnerId,
          courseId: entry.courseId,
          riskLevel: entry.riskLevel,
          lastActivityAt: entry.lastActivityAt,
          context: 'learner-management-section'
        }
      })
    );
  };

  return (
    <section className="dashboard-section">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Learner management</h2>
          <p className="text-sm text-slate-600">
            Prioritise interventions and monitor progression across every cohort.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 md:grid-cols-4 md:text-sm">
          <div className="dashboard-card-muted px-4 py-3 text-center">
            <p className="text-lg font-semibold text-slate-900">{metrics.totalLearners}</p>
            <p>Total roster</p>
          </div>
          <div className="dashboard-card-muted px-4 py-3 text-center">
            <p className="text-lg font-semibold text-slate-900">{metrics.activeLearners}</p>
            <p>Active learners</p>
          </div>
          <div className="dashboard-card-muted px-4 py-3 text-center">
            <p className="text-lg font-semibold text-slate-900">{metrics.averageProgress}%</p>
            <p>Avg. progress</p>
          </div>
          <div className="dashboard-card-muted px-4 py-3 text-center">
            <p className={`text-lg font-semibold ${resolveRiskClass(metrics.topRiskLevel)}`}>
              {metrics.topRiskCount}
            </p>
            <p>{formatRiskLabel(metrics.topRiskLevel)} risk</p>
          </div>
        </div>
      </div>

      {riskAlerts.length > 0 && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="dashboard-card-muted p-4">
            <h3 className="text-sm font-semibold text-slate-900">High priority alerts</h3>
            <p className="mt-2 text-xs text-slate-500">
              These learners require intervention within the next 48 hours.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {riskAlerts.map((entry) => (
                <li key={entry.id} className="rounded border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{entry.name}</p>
                      <p className="text-xs text-slate-500">
                        {entry.courseTitle} · {entry.cohort}
                      </p>
                    </div>
                    <span className={`text-xs font-medium ${resolveRiskClass(entry.riskLevel)}`}>
                      {formatRiskLabel(entry.riskLevel)} risk
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>Progress {entry.progressPercent ?? 0}%</span>
                    <span>
                      Last activity:{' '}
                      {entry.lastActivityAt ? new Date(entry.lastActivityAt).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="dashboard-pill px-3 py-1 text-xs"
                      onClick={() => handleEscalate(entry)}
                    >
                      Schedule intervention
                    </button>
                    {entry.lastLocation && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        Last seen in {entry.lastLocation}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="dashboard-card-muted p-4">
            <h3 className="text-sm font-semibold text-slate-900">Notes & signals</h3>
            {riskAlerts.every((entry) => !entry.notes?.length) ? (
              <p className="mt-2 text-xs text-slate-500">No instructor notes available for current alerts.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                {riskAlerts
                  .flatMap((entry) => (entry.notes ?? []).map((note, index) => ({ entry, note, index })))
                  .map(({ entry, note, index }) => (
                    <li key={`${entry.id}-${index}`} className="rounded bg-white/60 p-2">
                      <p className="font-semibold text-slate-900">{entry.name}</p>
                      <p>{note}</p>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-600">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="pb-3">Learner</th>
              <th className="pb-3">Course</th>
              <th className="pb-3">Progress</th>
              <th className="pb-3">Cohort</th>
              <th className="pb-3">Risk</th>
              <th className="pb-3">Last activity</th>
              <th className="pb-3">Next lesson</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rosterWithSort.map((entry) => (
              <tr key={entry.id} className="hover:bg-primary/5">
                <td className="py-3 font-semibold text-slate-900">{entry.name}</td>
                <td className="py-3">{entry.courseTitle}</td>
                <td className="py-3">{entry.progressPercent ?? 0}%</td>
                <td className="py-3">{entry.cohort}</td>
                <td className={`py-3 text-xs font-semibold ${resolveRiskClass(entry.riskLevel)}`}>
                  {formatRiskLabel(entry.riskLevel)}
                </td>
                <td className="py-3 text-xs text-slate-500">
                  {entry.lastActivityAt ? new Date(entry.lastActivityAt).toLocaleDateString() : 'Unknown'}
                </td>
                <td className="py-3 text-xs text-slate-500">{entry.nextLesson ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

LearnerManagementSection.propTypes = {
  learners: PropTypes.shape({
    roster: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        learnerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string,
        courseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        courseTitle: PropTypes.string,
        status: PropTypes.string,
        progressPercent: PropTypes.number,
        cohort: PropTypes.string,
        riskLevel: PropTypes.string,
        lastActivityAt: PropTypes.string,
        lastLocation: PropTypes.string,
        nextLesson: PropTypes.string,
        notes: PropTypes.arrayOf(PropTypes.string)
      })
    ),
    riskAlerts: PropTypes.arrayOf(PropTypes.object)
  })
};

LearnerManagementSection.defaultProps = {
  learners: null
};
