import PropTypes from 'prop-types';

const statPropType = PropTypes.shape({
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
});

function LearnerStatCard({ stat }) {
  return (
    <div className="dashboard-card-muted p-4">
      <p className="dashboard-kicker">{stat.label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{stat.value}</p>
    </div>
  );
}

LearnerStatCard.propTypes = {
  stat: statPropType.isRequired
};

export default function LearnerProfileSection({ profile, stats }) {
  return (
    <section className="dashboard-section lg:col-span-3">
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
        {stats.map((stat) => (
          <LearnerStatCard key={stat.label} stat={stat} />
        ))}
      </div>
    </section>
  );
}

LearnerProfileSection.propTypes = {
  profile: PropTypes.shape({
    avatar: PropTypes.string,
    name: PropTypes.string,
    title: PropTypes.string,
    bio: PropTypes.string
  }),
  stats: PropTypes.arrayOf(statPropType)
};

LearnerProfileSection.defaultProps = {
  profile: null,
  stats: []
};
