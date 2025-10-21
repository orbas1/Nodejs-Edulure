import PropTypes from 'prop-types';
import { ArrowDownRightIcon, ArrowUpRightIcon } from '@heroicons/react/20/solid';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';

const profileStatPropType = PropTypes.shape({
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  change: PropTypes.string.isRequired,
  trend: PropTypes.oneOf(['up', 'down']).isRequired
});

function ProfileStat({ stat }) {
  const isDown = stat.trend === 'down';
  const TrendIcon = isDown ? ArrowDownRightIcon : ArrowUpRightIcon;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm ring-1 ring-inset ring-slate-100">
      <p className="dashboard-kicker text-slate-500/90">{stat.label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{stat.value}</p>
      <span
        className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${
          isDown ? 'text-rose-600' : 'text-emerald-600'
        }`}
      >
        <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
        {stat.change}
        <span className="text-slate-400">vs last cycle</span>
      </span>
    </div>
  );
}

ProfileStat.propTypes = {
  stat: profileStatPropType.isRequired
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

function computeInitials(profile) {
  const primaryName = profile?.name ?? '';
  if (primaryName.trim().length > 0) {
    return primaryName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((segment) => segment[0]?.toUpperCase())
      .join('');
  }

  const firstName = profile?.firstName ?? '';
  const lastName = profile?.lastName ?? '';
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.trim();
  return initials ? initials.toUpperCase() : 'IN';
}

export default function InstructorProfileSection({ profile, stats }) {
  const displayName = profile?.name ?? 'Instructor';
  const displayTitle = profile?.title ?? 'Cohort architect & facilitator';
  const avatarUrl = sanitiseImageUrl(profile?.avatar);
  const initials = computeInitials(profile);
  const verificationStatus = profile?.verification?.status;
  const safeStats = Array.isArray(stats) ? stats.filter((stat) => stat?.label && stat?.value) : [];

  return (
    <section className="dashboard-section space-y-6 lg:col-span-3">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-white to-white p-6">
        <div className="absolute inset-y-0 right-0 -mr-16 hidden h-full w-48 rounded-full bg-primary/10 blur-2xl lg:block" aria-hidden="true" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="relative h-20 w-20 shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full rounded-3xl border-4 border-white object-cover shadow-card"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-3xl border-2 border-white/60 bg-primary/15 text-2xl font-semibold text-primary shadow-inner">
                {initials}
              </div>
            )}
            {verificationStatus === 'verified' && (
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg" title="Verified instructor">
                <CheckBadgeIcon className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
          </div>
          <div>
            <p className="dashboard-kicker text-primary">Instructor-in-residence</p>
            <h2 className="text-2xl font-semibold text-slate-900">{displayName}</h2>
            <p className="text-sm text-slate-600">{displayTitle}</p>
          </div>
        </div>
        <p className="mt-6 max-w-3xl text-sm text-slate-600">
          Operational visibility across cohorts, communities, bookings, and experiments. Keep your pods humming with the most
          recent signals.
        </p>
      </div>

      {safeStats.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {safeStats.map((stat) => (
            <ProfileStat key={stat.label} stat={stat} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
          Connect your enrolment tracking to surface cohort velocity and retention signals.
        </div>
      )}
    </section>
  );
}

InstructorProfileSection.propTypes = {
  profile: PropTypes.shape({
    avatar: PropTypes.string,
    name: PropTypes.string,
    title: PropTypes.string,
    verification: PropTypes.shape({
      status: PropTypes.string
    })
  }),
  stats: PropTypes.arrayOf(profileStatPropType)
};

InstructorProfileSection.defaultProps = {
  profile: null,
  stats: []
};
