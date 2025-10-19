import PropTypes from 'prop-types';
import { useMemo } from 'react';

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0%';
  return `${Math.round(numeric)}%`;
}

export default function CohortAnalyticsSection({ analytics }) {
  const cohorts = useMemo(() => (Array.isArray(analytics?.cohortHealth) ? analytics.cohortHealth : []), [analytics]);

  if (cohorts.length === 0) {
    return null;
  }

  const totalAtRisk = cohorts.reduce((sum, cohort) => sum + Number(cohort.atRiskLearners ?? 0), 0);
  const averageCompletion = analytics?.velocity?.averageCompletion ?? 0;
  const trending = Array.isArray(analytics?.velocity?.trending) ? analytics.velocity.trending : [];

  return (
    <section className="dashboard-section">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="dashboard-card-muted">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Average completion</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatPercent(averageCompletion)}</p>
          <p className="text-xs text-slate-500">Across all active cohorts</p>
        </div>
        <div className="dashboard-card-muted">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cohorts monitored</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{cohorts.length}</p>
          <p className="text-xs text-slate-500">Ready to launch or in-flight</p>
        </div>
        <div className="dashboard-card-muted">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Learners at risk</p>
          <p className={`mt-2 text-2xl font-semibold ${totalAtRisk > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {totalAtRisk}
          </p>
          <p className="text-xs text-slate-500">Trigger proactive nudges</p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-600">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="pb-3">Cohort</th>
              <th className="pb-3">Stage</th>
              <th className="pb-3">Active learners</th>
              <th className="pb-3">Completion rate</th>
              <th className="pb-3">Average progress</th>
              <th className="pb-3">At risk</th>
              <th className="pb-3">Last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {cohorts.map((cohort) => (
              <tr key={cohort.id} className="hover:bg-primary/5">
                <td className="py-3 font-semibold text-slate-900">
                  <span className="block text-sm">{cohort.courseTitle}</span>
                  <span className="text-xs text-slate-500">{cohort.cohort}</span>
                </td>
                <td className="py-3">{cohort.stage}</td>
                <td className="py-3">{cohort.activeLearners ?? 0}</td>
                <td className="py-3">{formatPercent((cohort.completionRate ?? 0) * 100)}</td>
                <td className="py-3">{formatPercent(cohort.averageProgress ?? 0)}</td>
                <td className="py-3 text-amber-600">{cohort.atRiskLearners ?? 0}</td>
                <td className="py-3 text-xs text-slate-500">
                  {cohort.lastActivityAt ? new Date(cohort.lastActivityAt).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {trending.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-slate-900">Top performing catalog entries</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {trending.map((entry) => (
              <div key={entry.id} className="dashboard-card-muted">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{entry.title}</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{entry.averageProgress ?? 0}% progress</p>
                <p className="text-xs text-slate-500">{entry.learners ?? 0} engaged learners</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

CohortAnalyticsSection.propTypes = {
  analytics: PropTypes.shape({
    cohortHealth: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        courseTitle: PropTypes.string,
        cohort: PropTypes.string,
        stage: PropTypes.string,
        activeLearners: PropTypes.number,
        completionRate: PropTypes.number,
        averageProgress: PropTypes.number,
        atRiskLearners: PropTypes.number,
        lastActivityAt: PropTypes.string
      })
    ),
    velocity: PropTypes.shape({
      averageCompletion: PropTypes.number,
      trending: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          title: PropTypes.string,
          averageProgress: PropTypes.number,
          learners: PropTypes.number
        })
      )
    })
  })
};

CohortAnalyticsSection.defaultProps = {
  analytics: null
};
