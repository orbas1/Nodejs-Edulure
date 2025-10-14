import PropTypes from 'prop-types';
import { ArrowRightIcon, CheckCircleIcon, UsersIcon } from '@heroicons/react/24/solid';
import { SparklesIcon, BoltIcon } from '@heroicons/react/24/outline';

const numberFormatter = new Intl.NumberFormat('en-US');

function CommunityStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{label}</p>
        <p className="text-lg font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

CommunityStat.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default function CommunityHero({
  community,
  isLoading,
  error,
  onJoin,
  isJoining,
  joinError,
  canJoin = true,
  joinDisabledReason
}) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white p-10 shadow-lg">
        <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-4xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-600 shadow-sm" role="alert">
        {error}
      </div>
    );
  }

  if (!community) {
    return (
      <div className="rounded-4xl border border-dashed border-slate-300 bg-white px-6 py-5 text-sm text-slate-500 shadow-sm">
        Select a community to unlock tailored updates, upcoming events, and resource drops.
      </div>
    );
  }

  const isMember = community.membership?.status === 'active';
  const memberRole = community.membership?.role;
  const bannerUrl = community.coverImageUrl;
  const stats = community.stats ?? {};
  const metadata = community.metadata ?? {};

  const formattedStats = [
    {
      icon: UsersIcon,
      label: 'Members',
      value: numberFormatter.format(stats.members ?? 0)
    },
    {
      icon: SparklesIcon,
      label: 'Resources',
      value: numberFormatter.format(stats.resources ?? 0)
    },
    {
      icon: BoltIcon,
      label: 'Posts',
      value: numberFormatter.format(stats.posts ?? 0)
    }
  ];

  const tagline = metadata.tagline ?? community.description;

  return (
    <section className="relative overflow-hidden rounded-4xl border border-slate-200 bg-slate-950 shadow-xl">
      <div className="absolute inset-0">
        {bannerUrl ? (
          <img src={bannerUrl} alt="Community banner" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary via-blue-500 to-indigo-600" />
        )}
        <div className="absolute inset-0 bg-slate-950/80" />
      </div>
      <div className="relative space-y-6 px-8 py-10 text-white">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
          <SparklesIcon className="h-4 w-4" />
          Community spotlight
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold text-white">{community.name}</h2>
          {tagline && <p className="max-w-3xl text-sm leading-6 text-white/80">{tagline}</p>}
          {memberRole && (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-1 text-xs font-semibold text-emerald-100">
              <CheckCircleIcon className="h-4 w-4 text-emerald-300" />
              Your role: {memberRole}
            </span>
          )}
        </div>
        {joinError && (
          <div className="rounded-2xl border border-red-300 bg-red-500/20 px-4 py-2 text-sm text-red-50" role="alert">
            {joinError}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <a
            href={`https://app.edulure.com/communities/${community.slug}`}
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
          >
            Visit hub
            <ArrowRightIcon className="h-4 w-4" />
          </a>
          {typeof onJoin === 'function' && !isMember && (
            <button
              type="button"
              onClick={canJoin ? onJoin : undefined}
              disabled={isJoining || !canJoin}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isJoining ? 'Joining…' : canJoin ? 'Join community' : 'Join unavailable'}
            </button>
          )}
          {!canJoin && !isMember && joinDisabledReason && (
            <span className="text-xs font-medium text-amber-200">{joinDisabledReason}</span>
          )}
          {isMember && (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold text-white/90">
              <CheckCircleIcon className="h-4 w-4 text-emerald-200" />
              You’re a member
            </span>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {formattedStats.map((stat) => (
            <CommunityStat key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} />
          ))}
        </div>
      </div>
    </section>
  );
}

CommunityHero.propTypes = {
  community: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    name: PropTypes.string,
    slug: PropTypes.string,
    description: PropTypes.string,
    coverImageUrl: PropTypes.string,
    membership: PropTypes.shape({
      status: PropTypes.string,
      role: PropTypes.string
    }),
    stats: PropTypes.shape({
      members: PropTypes.number,
      resources: PropTypes.number,
      posts: PropTypes.number
    }),
    metadata: PropTypes.object
  }),
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  onJoin: PropTypes.func,
  isJoining: PropTypes.bool,
  joinError: PropTypes.string,
  canJoin: PropTypes.bool,
  joinDisabledReason: PropTypes.string
};
