import PropTypes from 'prop-types';
import {
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  SparklesIcon,
  StarIcon,
  UserCircleIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

function formatNumber(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  if (Number.isNaN(number)) return null;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(number);
}

function formatCurrency(value) {
  if (!value) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }
  if (typeof value === 'object') {
    const amount = Number(value.amount ?? value.value);
    if (!Number.isFinite(amount)) {
      return null;
    }
    const currency = value.currency ?? 'USD';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / (amount >= 100 ? 100 : 1));
  }
  return null;
}

function formatDuration(minutes) {
  if (!minutes || Number.isNaN(Number(minutes))) return null;
  const mins = Number(minutes);
  if (mins < 60) return `${Math.round(mins)} min`;
  const hours = mins / 60;
  return `${hours.toFixed(hours < 10 ? 1 : 0)} hr`;
}

const ENTITY_ICON = {
  communities: UsersIcon,
  courses: AcademicCapIcon,
  ebooks: BookOpenIcon,
  tutors: UsersIcon,
  profiles: UserCircleIcon,
  events: CalendarDaysIcon
};

export default function SearchResultCard({ entityType, hit }) {
  const Icon = ENTITY_ICON[entityType] ?? ArrowTopRightOnSquareIcon;
  const price = formatCurrency(hit.price ?? hit.metrics?.price ?? hit.raw?.price);
  const rating =
    hit.metrics?.rating?.average ?? hit.raw?.rating?.average
      ? `${formatNumber(hit.metrics?.rating?.average ?? hit.raw?.rating?.average)}★`
      : null;
  const enrolments = formatNumber(hit.metrics?.enrolments ?? hit.raw?.enrolmentCount);
  const readingTime = formatDuration(hit.metrics?.readingTimeMinutes ?? hit.raw?.readingTimeMinutes);
  const location = hit.geo?.country ?? hit.raw?.country ?? hit.metrics?.location;
  const availability = hit.metrics?.startAt ?? hit.raw?.startAt ?? hit.metrics?.upcomingSession;
  const imageUrl =
    hit.imageUrl ??
    hit.coverImageUrl ??
    hit.thumbnailUrl ??
    hit.avatarUrl ??
    hit.previewImage ??
    hit.preview?.image ??
    hit.media?.[0]?.url ??
    hit.assets?.[0]?.url ??
    hit.raw?.coverImageUrl ??
    hit.raw?.thumbnailUrl ??
    hit.raw?.avatarUrl ??
    hit.raw?.previewImage ??
    hit.raw?.media?.[0]?.url ??
    null;

  const badgeLabels = [];
  const monetisationTag =
    hit.monetisationTag ??
    hit.monetisation?.tag ??
    hit.badges?.find((badge) => badge.type === 'sponsored')?.label ??
    (hit.isSponsored ? 'Sponsored' : null);
  if (monetisationTag) {
    badgeLabels.push({ label: monetisationTag, tone: 'amber' });
  }

  if (hit.featured || hit.badges?.some((badge) => badge.type === 'featured')) {
    badgeLabels.push({ label: 'Featured', tone: 'indigo' });
  }

  if (hit.badges?.length) {
    hit.badges
      .filter((badge) => badge.type !== 'featured' && badge.type !== 'sponsored')
      .slice(0, 3)
      .forEach((badge) => {
        badgeLabels.push({ label: badge.label ?? badge.type, tone: 'slate' });
      });
  }

  return (
    <article className="group flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="grid gap-6 lg:grid-cols-[320px,1fr] lg:items-start">
        <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-slate-100/80 shadow-inner">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={hit.title ?? hit.name ?? 'Search result'}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/20 p-6 text-center text-sm font-semibold text-primary">
              <Icon className="h-10 w-10" />
              <span>Visual preview coming soon</span>
            </div>
          )}
          <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm">
            <Icon className="h-4 w-4" /> {entityType.replace('-', ' ')}
          </div>
          {badgeLabels.length ? (
            <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
              {badgeLabels.map((badge, index) => (
                <span
                  key={`${entityType}-${badge.label}-${index}`}
                  className={
                    badge.tone === 'amber'
                      ? 'inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600 shadow-sm'
                      : badge.tone === 'indigo'
                        ? 'inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 shadow-sm'
                        : 'inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm'
                  }
                >
                  <SparklesIcon className="h-3.5 w-3.5" /> {badge.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900">{hit.title ?? hit.name}</h3>
            {hit.subtitle ? <p className="mt-1 text-sm font-medium text-slate-500">{hit.subtitle}</p> : null}
            {hit.description ? <p className="mt-3 text-sm leading-relaxed text-slate-600">{hit.description}</p> : null}
            {hit.highlights?.length ? (
              <ul className="mt-3 flex flex-wrap gap-2 text-xs text-primary">
                {hit.highlights.slice(0, 4).map((highlight) => (
                  <li key={highlight} className="rounded-full bg-primary/5 px-3 py-1 font-semibold">
                    {highlight}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {hit.tags?.length ? (
            <div className="flex flex-wrap gap-2">
              {hit.tags.slice(0, 8).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
            {price ? (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="inline-flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <CurrencyDollarIcon className="h-4 w-4" /> Price
                </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{price}</p>
            </div>
          ) : null}
          {rating ? (
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="inline-flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-500">
                <StarIcon className="h-4 w-4" /> Rating
              </p>
              <p className="mt-2 text-lg font-semibold text-amber-600">{rating}</p>
            </div>
          ) : null}
          {enrolments ? (
            <div className="rounded-2xl bg-primary/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Members</p>
              <p className="mt-2 text-lg font-semibold text-primary-dark">{enrolments}</p>
            </div>
          ) : null}
          {readingTime ? (
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Duration</p>
              <p className="mt-2 text-lg font-semibold text-slate-700">{readingTime}</p>
            </div>
          ) : null}
          {location ? (
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="inline-flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <GlobeAltIcon className="h-4 w-4" /> Location
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-700">{location}</p>
            </div>
          ) : null}
          {availability ? (
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Next session</p>
              <p className="mt-2 text-sm font-semibold text-emerald-600">{availability}</p>
            </div>
          ) : null}
          </div>
        </div>
      </div>
      {hit.actions?.length ? (
        <div className="flex flex-wrap gap-3">
          {hit.actions.map((action) => (
            <a
              key={action.href ?? action.id ?? action.label}
              href={action.href ?? '#'}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
            >
              {action.label}
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

SearchResultCard.propTypes = {
  entityType: PropTypes.string.isRequired,
  hit: PropTypes.shape({
    title: PropTypes.string,
    name: PropTypes.string,
    subtitle: PropTypes.string,
    description: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
    metrics: PropTypes.object,
    raw: PropTypes.object,
    geo: PropTypes.object,
    media: PropTypes.array,
    assets: PropTypes.array,
    preview: PropTypes.object,
    previewImage: PropTypes.string,
    monetisation: PropTypes.shape({ tag: PropTypes.string }),
    monetisationTag: PropTypes.string,
    badges: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string,
        label: PropTypes.string
      })
    ),
    highlights: PropTypes.arrayOf(PropTypes.string),
    actions: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        label: PropTypes.string,
        href: PropTypes.string
      })
    )
  }).isRequired
};
