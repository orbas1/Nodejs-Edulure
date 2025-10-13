import { useMemo } from 'react';
import PropTypes from 'prop-types';

import MetricCard from '../../../components/dashboard/MetricCard.jsx';

export default function InstructorOverview({ dashboard, profile }) {
  const metrics = dashboard.metrics ?? [];
  const enrollmentMetrics = useMemo(
    () =>
      (dashboard.analytics?.enrollment ?? []).map((metric) => ({
        label: metric.label,
        value: `${metric.current}`,
        change: `${metric.current >= metric.previous ? '+' : '−'}${Math.abs(metric.current - metric.previous)}`,
        trend: metric.current >= metric.previous ? 'up' : 'down'
      })),
    [dashboard.analytics?.enrollment]
  );

  const revenueSlices = dashboard.analytics?.revenueStreams ?? [];
  const pipeline = dashboard.courses?.pipeline ?? [];
  const production = dashboard.courses?.production ?? [];

  const profileStats = enrollmentMetrics;

  return (
    <div className="space-y-10">
      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="dashboard-section lg:col-span-3">
          <div className="flex items-center gap-4">
            <img
              src={profile?.avatar}
              alt={profile?.name ?? 'Instructor profile'}
              className="h-16 w-16 rounded-2xl border border-slate-200"
            />
            <div>
              <p className="dashboard-kicker">Instructor-in-residence</p>
              <h2 className="text-2xl font-semibold text-slate-900">{profile?.name ?? 'Instructor'}</h2>
              <p className="text-sm text-slate-600">Cohort architect &amp; facilitator</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Operational visibility across cohorts, communities, bookings, and experiments. Keep your pods humming with the most
            recent signals.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {profileStats.map((stat) => (
              <div key={stat.label} className="dashboard-card-muted p-4">
                <p className="dashboard-kicker">{stat.label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{stat.value}</p>
                <p className={`mt-1 text-xs ${stat.trend === 'down' ? 'text-rose-500' : 'text-emerald-500'}`}>{stat.change} vs last cycle</p>
              </div>
            ))}
          </div>
        </div>
        <div className="dashboard-section lg:col-span-2">
          <p className="dashboard-kicker">Revenue composition</p>
          <ul className="mt-4 space-y-3">
            {revenueSlices.map((slice) => (
              <li key={slice.name} className="dashboard-card-muted flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium text-slate-900">{slice.name}</span>
                <span className="text-slate-500">{slice.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="dashboard-section">
          <p className="dashboard-kicker">Launch radar</p>
          <ul className="mt-4 space-y-4">
            {pipeline.map((cohort) => (
              <li key={cohort.id} className="dashboard-card-muted p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{cohort.stage}</span>
                  <span>Launch {cohort.startDate}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{cohort.name}</p>
                <p className="text-xs text-slate-500">{cohort.learners} learners waiting</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="dashboard-section">
          <p className="dashboard-kicker">Production board</p>
          <ul className="mt-4 space-y-4">
            {production.map((asset) => (
              <li key={asset.id} className="dashboard-card-muted p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{asset.owner}</span>
                  <span>{asset.status}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{asset.asset}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

InstructorOverview.propTypes = {
  dashboard: PropTypes.object.isRequired,
  profile: PropTypes.object.isRequired
};
