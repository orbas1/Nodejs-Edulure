import PropTypes from 'prop-types';

const profileStatPropType = PropTypes.shape({
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  change: PropTypes.string.isRequired,
  trend: PropTypes.oneOf(['up', 'down']).isRequired
});

function ProfileStat({ stat }) {
  return (
    <div className="dashboard-card-muted p-4">
      <p className="dashboard-kicker">{stat.label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{stat.value}</p>
      <p className={`mt-1 text-xs ${stat.trend === 'down' ? 'text-rose-500' : 'text-emerald-500'}`}>{stat.change} vs last cycle</p>
    </div>
  );
}

ProfileStat.propTypes = {
  stat: profileStatPropType.isRequired
};

export default function InstructorProfileSection({ profile, stats }) {
  return (
    <section className="dashboard-section lg:col-span-3">
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
        {stats.map((stat) => (
          <ProfileStat key={stat.label} stat={stat} />
        ))}
      </div>
    </section>
  );
}

InstructorProfileSection.propTypes = {
  profile: PropTypes.shape({
    avatar: PropTypes.string,
    name: PropTypes.string
  }),
  stats: PropTypes.arrayOf(profileStatPropType)
};

InstructorProfileSection.defaultProps = {
  profile: null,
  stats: []
};
