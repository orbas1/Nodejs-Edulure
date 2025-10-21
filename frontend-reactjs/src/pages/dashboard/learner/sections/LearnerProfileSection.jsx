import PropTypes from 'prop-types';
import clsx from 'clsx';

const statPropType = PropTypes.shape({
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
});

function LearnerStatCard({ stat }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{stat.label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{stat.value}</p>
    </div>
  );
}

LearnerStatCard.propTypes = {
  stat: statPropType.isRequired
};

function sanitiseImageUrl(url) {
  if (typeof url !== 'string' || url.trim().length === 0) {
    return null;
  }
  const value = url.trim();
  if (value.startsWith('data:')) {
    return value;
  }
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.edulure.com';
    const parsed = new URL(value, origin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch (error) {
    return null;
  }
}

function resolveAvatar(profile) {
  const safeAvatar = sanitiseImageUrl(profile?.avatar);
  if (safeAvatar) return safeAvatar;
  const seed = encodeURIComponent(profile?.email ?? profile?.name ?? 'learner');
  return `https://avatar.vercel.sh/${seed}.svg?size=96&background=0D1224&color=F8FAFC`;
}

export default function LearnerProfileSection({ profile, stats, className }) {
  const safeStats = Array.isArray(stats) ? stats.filter((stat) => stat?.label && stat?.value !== undefined) : [];
  const bio = profile?.bio?.trim?.() ?? '';

  return (
    <section
      className={clsx(
        'relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary to-primary-dark p-6 text-white shadow-lg lg:col-span-4',
        className
      )}
    >
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <img
            src={resolveAvatar(profile)}
            alt={profile?.name ?? 'Learner profile'}
            className="h-20 w-20 rounded-3xl border border-white/40 bg-white/10 object-cover shadow-lg"
            loading="lazy"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Learner Profile</p>
            <h2 className="text-2xl font-semibold text-white">{profile?.name ?? 'Learner'}</h2>
            <p className="text-sm text-white/80">{profile?.title ?? 'Active learner'}</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-white/80">
          {bio.length > 0
            ? bio
            : 'Welcome to your learning control center. Stay close to your cohorts, metrics, and mentors here.'}
        </p>
        {safeStats.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {safeStats.map((stat) => (
              <LearnerStatCard key={stat.label} stat={stat} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

LearnerProfileSection.propTypes = {
  profile: PropTypes.shape({
    avatar: PropTypes.string,
    name: PropTypes.string,
    title: PropTypes.string,
    bio: PropTypes.string,
    email: PropTypes.string
  }),
  stats: PropTypes.arrayOf(statPropType),
  className: PropTypes.string
};

LearnerProfileSection.defaultProps = {
  profile: null,
  stats: [],
  className: ''
};
