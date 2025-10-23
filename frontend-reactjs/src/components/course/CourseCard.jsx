import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  AcademicCapIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  UserGroupIcon,
  StarIcon
} from '@heroicons/react/24/outline';

import CourseProgressBar from './CourseProgressBar.jsx';

function formatPrice(amount, currency) {
  if (amount === null || amount === undefined) {
    return 'Free';
  }
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) {
    return String(amount);
  }
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(numeric);
  } catch (error) {
    return `${currency ?? 'USD'} ${numeric.toFixed(2)}`;
  }
}

function Badge({ children, tone }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
        tone === 'primary' && 'bg-primary/10 text-primary',
        tone === 'emerald' && 'bg-emerald-100 text-emerald-600',
        tone === 'amber' && 'bg-amber-100 text-amber-600',
        tone === 'slate' && 'bg-slate-100 text-slate-600'
      )}
    >
      {children}
    </span>
  );
}

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  tone: PropTypes.oneOf(['primary', 'emerald', 'amber', 'slate'])
};

Badge.defaultProps = {
  tone: 'slate'
};

function Metric({ icon: Icon, label, value, tone }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon className={clsx('h-4 w-4', tone === 'amber' ? 'text-amber-500' : 'text-slate-400')} />
        {label}
      </p>
      <p className={clsx('mt-2 text-lg font-semibold', tone === 'amber' ? 'text-amber-600' : 'text-slate-900')}>{value}</p>
    </div>
  );
}

Metric.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
  tone: PropTypes.oneOf(['default', 'amber'])
};

Metric.defaultProps = {
  value: null,
  tone: 'default'
};

export default function CourseCard({
  course,
  primaryHref,
  onPrimaryAction,
  primaryActionLabel,
  secondaryHref,
  onSecondaryAction,
  secondaryActionLabel
}) {
  const {
    title,
    subtitle,
    description,
    thumbnailUrl,
    instructor,
    level,
    deliveryFormat,
    tags,
    rating,
    ratingCount,
    duration,
    memberCount,
    price,
    currency,
    progressPercent,
    highlights
  } = course;

  const hasProgress = progressPercent !== undefined && progressPercent !== null;
  const resolvedPrimaryActionLabel = primaryActionLabel ?? (primaryHref ? 'View course' : null);

  return (
    <article className="group flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,_280px)_1fr] lg:items-start">
        <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-slate-100/80">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title ?? 'Course preview'}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/20 p-6 text-center text-sm font-semibold text-primary">
              <AcademicCapIcon className="h-10 w-10" />
              <span>Preview coming soon</span>
            </div>
          )}
          <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm">
            <AcademicCapIcon className="h-4 w-4" /> Course
          </div>
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
            {level ? <Badge tone="emerald">{level}</Badge> : null}
            {deliveryFormat ? <Badge tone="primary">{deliveryFormat}</Badge> : null}
            {price !== undefined && price !== null ? <Badge tone="amber">{formatPrice(price, currency)}</Badge> : null}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
            {subtitle ? <p className="text-sm font-medium text-slate-500">{subtitle}</p> : null}
            {instructor ? (
              <p className="text-sm text-slate-500">
                Taught by <span className="font-semibold text-slate-700">{instructor}</span>
              </p>
            ) : null}
            {description ? <p className="text-sm leading-relaxed text-slate-600">{description}</p> : null}
          </div>

          {Array.isArray(highlights) && highlights.length ? (
            <ul className="flex flex-wrap gap-2 text-xs text-primary">
              {highlights.slice(0, 4).map((highlight) => (
                <li key={highlight} className="rounded-full bg-primary/5 px-3 py-1 font-semibold">
                  {highlight}
                </li>
              ))}
            </ul>
          ) : null}

          {Array.isArray(tags) && tags.length ? (
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 8).map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric icon={StarIcon} label="Rating" value={rating ? `${rating}${ratingCount ? ` · ${ratingCount}` : ''}` : null} tone="amber" />
            <Metric icon={ClockIcon} label="Duration" value={duration} />
            <Metric icon={UserGroupIcon} label="Learners" value={memberCount} />
          </div>

          {hasProgress ? (
            <CourseProgressBar
              value={progressPercent}
              label="Your progress"
              srLabel={`Course progress ${Math.round(Number(progressPercent) || 0)} percent`}
              tone={Number(progressPercent) >= 100 ? 'emerald' : 'primary'}
              className="mt-2"
            />
          ) : null}

          <div className="mt-2 flex flex-wrap gap-3">
            {resolvedPrimaryActionLabel ? (
              primaryHref ? (
                <a
                  href={primaryHref}
                  className="inline-flex items-center gap-2 rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                >
                  {resolvedPrimaryActionLabel}
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onPrimaryAction}
                  className="inline-flex items-center gap-2 rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                >
                  {resolvedPrimaryActionLabel}
                </button>
              )
            ) : null}
            {secondaryActionLabel ? (
              secondaryHref ? (
                <a
                  href={secondaryHref}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                >
                  {secondaryActionLabel}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onSecondaryAction}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                >
                  {secondaryActionLabel}
                </button>
              )
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

CourseCard.propTypes = {
  course: PropTypes.shape({
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    description: PropTypes.string,
    thumbnailUrl: PropTypes.string,
    instructor: PropTypes.string,
    level: PropTypes.string,
    deliveryFormat: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    ratingCount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    duration: PropTypes.string,
    memberCount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    currency: PropTypes.string,
    progressPercent: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    highlights: PropTypes.arrayOf(PropTypes.string)
  }).isRequired,
  primaryHref: PropTypes.string,
  onPrimaryAction: PropTypes.func,
  primaryActionLabel: PropTypes.string,
  secondaryHref: PropTypes.string,
  onSecondaryAction: PropTypes.func,
  secondaryActionLabel: PropTypes.string
};

CourseCard.defaultProps = {
  primaryHref: undefined,
  onPrimaryAction: undefined,
  primaryActionLabel: undefined,
  secondaryHref: undefined,
  onSecondaryAction: undefined,
  secondaryActionLabel: undefined
};
