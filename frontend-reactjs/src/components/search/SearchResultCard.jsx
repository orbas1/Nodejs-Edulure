import PropTypes from 'prop-types';
import {
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
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

  return (
    <article className="group flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <Icon className="h-4 w-4" /> {entityType.replace('-', ' ')}
          </div>
          <h3 className="mt-3 text-2xl font-semibold text-slate-900">{hit.title ?? hit.name}</h3>
          {hit.subtitle ? <p className="text-sm font-medium text-slate-500">{hit.subtitle}</p> : null}
          {hit.description ? <p className="mt-3 text-sm leading-relaxed text-slate-600">{hit.description}</p> : null}
          {hit.tags?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {hit.tags.slice(0, 8).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-4 text-center text-sm text-slate-600 sm:grid-cols-3">
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
    actions: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        label: PropTypes.string,
        href: PropTypes.string
      })
    )
  }).isRequired
};
