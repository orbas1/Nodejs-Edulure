import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useOutletContext } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext.jsx';

function MetricCard({ metric }) {
  return (
    <div className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
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
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-800">
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
  const learningPace = dashboard.analytics.learningPace.map((entry) => ({
    label: entry.day,
    value: `${entry.minutes}m`
  }));

  return (
    <div className="space-y-10">
      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {dashboard.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-3xl border border-slate-900/70 bg-slate-900/40 p-6 lg:col-span-3">
          <div className="flex items-center gap-4">
            <img src={profile.avatar} alt={profile.name} className="h-16 w-16 rounded-2xl border border-slate-800" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Learner Profile</p>
              <h2 className="text-2xl font-semibold text-white">{profile.name}</h2>
              <p className="text-sm text-slate-400">{profile.title}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-300">{profile.bio}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {profile.stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-900/60 bg-slate-900/40 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
                <p className="mt-2 text-xl font-semibold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-900/70 bg-slate-900/40 p-6 lg:col-span-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Learning pace</p>
          <div className="mt-4 space-y-4">
            {learningPace.map((entry) => (
              <BarTrack key={entry.label} label={entry.label} value={entry.value} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
          <p className="text-xs uppercase tracking-wide text-slate-500">Upcoming commitments</p>
          <ul className="mt-4 space-y-4">
            {dashboard.upcoming.map((event) => (
              <li key={event.id} className="rounded-2xl border border-slate-900/60 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{event.type}</span>
                  <span>{event.date}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-white">{event.title}</p>
                <p className="text-xs text-slate-400">Hosted by {event.host}</p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center justify-center rounded-full border border-primary/50 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10"
                >
                  {event.action}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
          <p className="text-xs uppercase tracking-wide text-slate-500">Feed highlights</p>
          <ul className="mt-4 space-y-4">
            {profile.feedHighlights.map((item) => (
              <li key={item.id} className="rounded-2xl border border-slate-900/60 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{item.time}</span>
                  <span>{item.tags.join(' • ')}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-white">{item.headline}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
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
  const enrollmentMetrics = useMemo(
    () =>
      dashboard.analytics.enrollment.map((metric) => ({
        label: metric.label,
        value: `${metric.current}`,
        change: `${metric.current >= metric.previous ? '+' : '−'}${Math.abs(metric.current - metric.previous)}`,
        trend: metric.current >= metric.previous ? 'up' : 'down'
      })),
    [dashboard.analytics.enrollment]
  );

  const revenueSlices = dashboard.analytics.revenueStreams;

  return (
    <div className="space-y-10">
      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {dashboard.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-3xl border border-slate-900/70 bg-slate-900/40 p-6 lg:col-span-3">
          <div className="flex items-center gap-4">
            <img src={profile.avatar} alt={profile.name} className="h-16 w-16 rounded-2xl border border-slate-800" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Instructor-in-residence</p>
              <h2 className="text-2xl font-semibold text-white">{profile.name}</h2>
              <p className="text-sm text-slate-400">Cohort architect & facilitator</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-300">
            Operational visibility across cohorts, communities, bookings, and experiments. Keep your pods humming with the most
            recent signals.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {enrollmentMetrics.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-900/60 bg-slate-900/40 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
                <p className="mt-2 text-xl font-semibold text-white">{stat.value}</p>
                <p className={`mt-1 text-xs ${stat.trend === 'down' ? 'text-rose-400' : 'text-emerald-400'}`}>{stat.change} vs last
                  cycle</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-900/70 bg-slate-900/40 p-6 lg:col-span-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Revenue composition</p>
          <ul className="mt-4 space-y-3">
            {revenueSlices.map((slice) => (
              <li key={slice.name} className="flex items-center justify-between rounded-2xl border border-slate-900/60 bg-slate-900/60 px-4 py-3 text-sm">
                <span className="font-medium text-white">{slice.name}</span>
                <span className="text-slate-400">{slice.value}%</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
          <p className="text-xs uppercase tracking-wide text-slate-500">Launch radar</p>
          <ul className="mt-4 space-y-4">
            {dashboard.courses.pipeline.map((cohort) => (
              <li key={cohort.id} className="rounded-2xl border border-slate-900/60 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{cohort.stage}</span>
                  <span>Launch {cohort.startDate}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-white">{cohort.name}</p>
                <p className="text-xs text-slate-400">{cohort.learners} learners waiting</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-6">
          <p className="text-xs uppercase tracking-wide text-slate-500">Production board</p>
          <ul className="mt-4 space-y-4">
            {dashboard.courses.production.map((asset) => (
              <li key={asset.id} className="rounded-2xl border border-slate-900/60 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{asset.owner}</span>
                  <span>{asset.status}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-white">{asset.asset}</p>
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
  const { role, dashboard } = useOutletContext();
  const { profile } = useDashboard();

  if (!dashboard) {
    return (
      <div className="rounded-3xl border border-slate-900/60 bg-slate-900/40 p-10 text-center text-sm text-slate-400">
        No dashboard data configured for this role.
      </div>
    );
  }

  return role === 'instructor' ? (
    <HomeInstructor dashboard={dashboard} profile={profile} />
  ) : (
    <HomeLearner dashboard={dashboard} profile={profile} />
  );
}
