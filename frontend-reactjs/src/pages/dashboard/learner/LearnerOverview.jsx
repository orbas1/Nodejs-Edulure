import PropTypes from 'prop-types';

import MetricCard from '../../../components/dashboard/MetricCard.jsx';

function BarTrack({ value, label }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500">
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

export default function LearnerOverview({ dashboard, profile }) {
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
        <div className="dashboard-section lg:col-span-3">
          <div className="flex items-center gap-4">
            <img
              src={profile?.avatar}
              alt={profile?.name ?? 'Learner profile'}
              className="h-16 w-16 rounded-2xl border border-slate-200"
            />
            <div>
              <p className="dashboard-kicker">Learner Profile</p>
              <h2 className="text-2xl font-semibold text-slate-900">{profile?.name ?? 'Learner'}</h2>
              <p className="text-sm text-slate-600">{profile?.title ?? 'Active learner'}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600">{profile?.bio ?? 'Welcome to your learning control center.'}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {profileStats.map((stat) => (
              <div key={stat.label} className="dashboard-card-muted p-4">
                <p className="dashboard-kicker">{stat.label}</p>
                <p className="mt-2 text-xl font-semibold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="dashboard-section lg:col-span-2">
          <p className="dashboard-kicker">Learning pace</p>
          <div className="mt-4 space-y-4">
            {learningPace.map((entry) => (
              <BarTrack key={entry.label} label={entry.label} value={entry.value} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="dashboard-section">
          <p className="dashboard-kicker">Upcoming commitments</p>
          <ul className="mt-4 space-y-4">
            {upcoming.map((event) => (
              <li key={event.id} className="dashboard-card-muted p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{event.type}</span>
                  <span>{event.date}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{event.title}</p>
                <p className="text-xs text-slate-500">Hosted by {event.host}</p>
                <button type="button" className="mt-4 inline-flex items-center justify-center dashboard-primary-pill">
                  {event.action}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="dashboard-section">
          <p className="dashboard-kicker">Feed highlights</p>
          <ul className="mt-4 space-y-4">
            {feedHighlights.map((item) => (
              <li key={item.id} className="dashboard-card-muted p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{item.time}</span>
                  <span>{item.tags.join(' • ')}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.headline}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
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

LearnerOverview.propTypes = {
  dashboard: PropTypes.object.isRequired,
  profile: PropTypes.object.isRequired
};
