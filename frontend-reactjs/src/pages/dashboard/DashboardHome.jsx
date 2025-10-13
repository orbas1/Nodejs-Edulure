import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import { useDashboard } from '../../context/DashboardContext.jsx';

function MetricCard({ metric }) {
  return (
    <div className="dashboard-surface p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{metric.value}</p>
      <p className={`mt-1 text-sm font-medium ${metric.trend === 'down' ? 'text-rose-400' : 'text-emerald-400'}`}>
        {metric.change}
      </p>
    </div>
  );
}

MetricCard.propTypes = {
  metric: PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    change: PropTypes.string,
    trend: PropTypes.oneOf(['up', 'down'])
  }).isRequired
};

function BarTrack({ value, label }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark" style={{ width: value }} />
      </div>
    </div>
  );
}

BarTrack.propTypes = {
  value: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired
};

function HomeLearner({ dashboard, profile }) {
  const metrics = dashboard.metrics ?? [];
  const learningPace = (dashboard.analytics?.learningPace ?? []).map((entry) => ({
    label: entry.day,
    value: `${entry.minutes}m`
  }));
  const upcoming = dashboard.upcoming ?? [];
  const profileStats = profile?.stats ?? [];
  const feedHighlights = profile?.feedHighlights ?? [];

  return (
    <div className="space-y-10">
      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
          <div className="flex items-center gap-4">
            <img src={profile?.avatar} alt={profile?.name ?? 'Learner profile'} className="h-16 w-16 rounded-2xl border border-slate-200" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">Learner Profile</p>
              <h2 className="text-2xl font-semibold text-slate-900">{profile?.name ?? 'Learner'}</h2>
              <p className="text-sm text-slate-600">{profile?.title ?? 'Active learner'}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">{profile?.bio ?? 'Welcome to your learning control center.'}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {profileStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Learning pace</p>
          <div className="mt-4 space-y-4">
            {learningPace.map((entry) => (
              <BarTrack key={entry.label} label={entry.label} value={entry.value} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Upcoming commitments</p>
          <ul className="mt-4 space-y-4">
            {upcoming.map((event) => (
              <li key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>{event.type}</span>
                  <span>{event.date}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{event.title}</p>
                <p className="text-xs text-slate-600">Hosted by {event.host}</p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center justify-center dashboard-action"
                >
                  {event.action}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Feed highlights</p>
          <ul className="mt-4 space-y-4">
            {feedHighlights.map((item) => (
              <li key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{item.time}</span>
                  <span>{item.tags.join(' • ')}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.headline}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
                  <span>❤️ {item.reactions}</span>
                  <span>💬 {item.comments}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

HomeLearner.propTypes = {
  dashboard: PropTypes.object.isRequired,
  profile: PropTypes.object.isRequired
};

function HomeInstructor({ dashboard, profile }) {
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
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
          <div className="flex items-center gap-4">
            <img src={profile?.avatar} alt={profile?.name ?? 'Instructor profile'} className="h-16 w-16 rounded-2xl border border-slate-200" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-600">Instructor-in-residence</p>
              <h2 className="text-2xl font-semibold text-slate-900">{profile?.name ?? 'Instructor'}</h2>
              <p className="text-sm text-slate-600">Cohort architect & facilitator</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Operational visibility across cohorts, communities, bookings, and experiments. Keep your pods humming with the most
            recent signals.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {profileStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{stat.value}</p>
                <p className={`mt-1 text-xs ${stat.trend === 'down' ? 'text-rose-400' : 'text-emerald-400'}`}>{stat.change} vs last
                  cycle</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Revenue composition</p>
          <ul className="mt-4 space-y-3">
            {revenueSlices.map((slice) => (
              <li key={slice.name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="font-medium text-slate-900">{slice.name}</span>
                <span className="text-slate-600">{slice.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Launch radar</p>
          <ul className="mt-4 space-y-4">
            {pipeline.map((cohort) => (
              <li key={cohort.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>{cohort.stage}</span>
                  <span>Launch {cohort.startDate}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{cohort.name}</p>
                <p className="text-xs text-slate-600">{cohort.learners} learners waiting</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Production board</p>
          <ul className="mt-4 space-y-4">
            {production.map((asset) => (
              <li key={asset.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between text-xs text-slate-600">
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

HomeInstructor.propTypes = {
  dashboard: PropTypes.object.isRequired,
  profile: PropTypes.object.isRequired
};

export default function DashboardHome() {
  const { role, dashboard, refresh } = useOutletContext();
  const { profile } = useDashboard();

  if (!dashboard) {
    return (
      <DashboardStateMessage
        title="Dashboard data unavailable"
        description="We don't have any overview data for this workspace yet. Refresh once data sources are connected."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  if (!profile) {
    return (
      <DashboardStateMessage
        title="Profile data missing"
        description="We couldn't load your learner profile. Refresh to retry the sync."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return role === 'instructor' ? (
    <HomeInstructor dashboard={dashboard} profile={profile} />
  ) : (
    <HomeLearner dashboard={dashboard} profile={profile} />
  );
}
