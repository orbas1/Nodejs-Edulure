import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ClockIcon,
  PlayCircleIcon,
  StarIcon,
  TagIcon
} from '@heroicons/react/24/outline';

const VARIANT_CLASSNAMES = {
  catalogue:
    'border-slate-200 bg-white/95 shadow-sm hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl',
  dashboard:
    'border-slate-200 bg-slate-50/90 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md',
  recommendation:
    'border-slate-200 bg-white/90 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg'
};

const BADGE_TONE_CLASSNAMES = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  info: 'bg-sky-100 text-sky-700',
  danger: 'bg-rose-100 text-rose-600',
  monetisation: 'bg-purple-100 text-purple-700'
};

const FALLBACK_BADGE_CLASSNAME = BADGE_TONE_CLASSNAMES.primary;

function clampPercentage(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) {
    return null;
  }
  const numeric = Number(minutes);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  if (numeric < 60) {
    return `${Math.round(numeric)} min`;
  }
  const hours = numeric / 60;
  return `${hours.toFixed(hours < 10 ? 1 : 0)} hr`;
}

function formatRating(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return numeric.toFixed(numeric >= 1 ? 1 : 2);
}

function resolveActionIcon(action) {
  if (typeof action?.icon === 'function') {
    const IconComponent = action.icon;
    return <IconComponent className="h-4 w-4" aria-hidden="true" />;
  }
  return null;
}

function handleAction(event, action, course) {
  if (action?.onClick) {
    event.preventDefault();
    action.onClick(course, event);
    return;
  }
  if (action?.href) {
    // Allow default navigation behaviour for anchor tags.
    return;
  }
  event.preventDefault();
}

export default function CourseCard({
  course,
  variant = 'catalogue',
  primaryAction,
  secondaryActions = [],
  onSelect
}) {
  const [downloadsOpen, setDownloadsOpen] = useState(false);

  const progress = useMemo(() => clampPercentage(course.progress), [course.progress]);
  const hasPreview = Boolean(course.previewUrl || course.previewAction);
  const previewDuration = formatDuration(course.previewDuration ?? course.durationMinutes ?? null);
  const ratingValue = formatRating(course.rating);
  const ratingCount = Number.isFinite(Number(course.ratingCount))
    ? Number(course.ratingCount)
    : null;
  const variantClassName = VARIANT_CLASSNAMES[variant] ?? VARIANT_CLASSNAMES.catalogue;
  const downloads = Array.isArray(course.downloads) ? course.downloads : [];
  const tags = useMemo(() => {
    const raw = Array.isArray(course.tags) ? course.tags : [];
    const skills = Array.isArray(course.skills) ? course.skills : [];
    const combined = [...raw, ...skills].map((entry) => String(entry).trim()).filter(Boolean);
    const unique = Array.from(new Set(combined));
    return unique.slice(0, 8);
  }, [course.skills, course.tags]);

  const badgeToneClassName = (tone) => BADGE_TONE_CLASSNAMES[tone] ?? FALLBACK_BADGE_CLASSNAME;

  const handlePrimaryAction = (event) => {
    if (!primaryAction) {
      return;
    }
    handleAction(event, primaryAction, course);
  };

  const handleSecondaryAction = (event, action) => {
    handleAction(event, action, course);
  };

  const handlePreview = (event) => {
    if (!hasPreview) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (typeof course.previewAction === 'function') {
      course.previewAction(course);
      return;
    }
    if (course.previewUrl) {
      window.open(course.previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadsToggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDownloadsOpen((current) => !current);
  };

  const guardOnSelect = (event) => {
    if (!onSelect) {
      return;
    }
    const target = event.target;
    if (target.closest('[data-course-card-action="true"]')) {
      return;
    }
    onSelect(course, event);
  };

  return (
    <article
      className={clsx(
        'group relative flex flex-col gap-6 rounded-3xl border p-6 transition duration-200',
        variantClassName,
        onSelect && 'cursor-pointer'
      )}
      onClick={guardOnSelect}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,260px),1fr] lg:items-start">
        <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-slate-100/60 shadow-inner">
          {course.previewThumbnailUrl || course.thumbnailUrl ? (
            <img
              src={course.previewThumbnailUrl ?? course.thumbnailUrl}
              alt={course.previewTitle ?? course.title ?? 'Course preview'}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/10 via-primary/5 to-primary/20 p-6 text-center text-sm font-semibold text-primary">
              <AcademicCapIcon className="h-10 w-10" aria-hidden="true" />
              <span>Course preview coming soon</span>
            </div>
          )}
          {course.status ? (
            <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm">
              <AcademicCapIcon className="h-4 w-4" aria-hidden="true" /> {course.status}
            </span>
          ) : null}
          {hasPreview ? (
            <button
              type="button"
              className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark"
              onClick={handlePreview}
              data-course-card-action="true"
            >
              <PlayCircleIcon className="h-5 w-5" aria-hidden="true" />
              {course.previewTitle ? `Preview · ${course.previewTitle}` : 'Preview lesson'}
              {previewDuration ? <span className="text-xs font-medium text-white/80">{previewDuration}</span> : null}
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-5">
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {course.level ? <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{course.level}</span> : null}
              {course.deliveryFormat ? (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">{course.deliveryFormat}</span>
              ) : null}
              {course.price ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">{course.price}</span>
              ) : null}
              {ratingValue ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                  <StarIcon className="h-4 w-4" aria-hidden="true" />
                  {ratingValue}
                  {ratingCount ? <span className="text-[10px] text-amber-600/80">({ratingCount})</span> : null}
                </span>
              ) : null}
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-semibold text-slate-900">{course.title}</h3>
              {course.subtitle ? <p className="text-sm font-medium text-slate-500">{course.subtitle}</p> : null}
            </div>
            {course.description ? (
              <p className="text-sm leading-relaxed text-slate-600">{course.description}</p>
            ) : null}
          </header>

          {course.nextLesson || course.goalStatus ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {course.nextLesson ? (
                <span className="inline-flex items-center gap-2 text-slate-600">
                  <ClockIcon className="h-4 w-4" aria-hidden="true" /> Next · {course.nextLesson}
                </span>
              ) : null}
              {course.goalStatus ? (
                <span className="inline-flex items-center gap-2 text-primary">
                  <TagIcon className="h-4 w-4" aria-hidden="true" /> Goal · {course.goalStatus}
                </span>
              ) : null}
            </div>
          ) : null}

          {progress !== null ? (
            <div>
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark"
                  style={{ width: `${progress}%` }}
                  aria-hidden="true"
                />
              </div>
            </div>
          ) : null}

          {course.upsellBadges?.length ? (
            <div className="flex flex-wrap gap-2">
              {course.upsellBadges.map((badge) => (
                <span
                  key={`${badge.label}-${badge.tone ?? 'badge'}`}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
                    badgeToneClassName(badge.tone)
                  )}
                >
                  {badge.icon ? resolveActionIcon(badge) : null}
                  {badge.label}
                </span>
              ))}
            </div>
          ) : null}

          {tags.length ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {primaryAction ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark"
                onClick={handlePrimaryAction}
                data-course-card-action="true"
              >
                {resolveActionIcon(primaryAction)}
                {primaryAction.label}
              </button>
            ) : null}
            {secondaryActions
              .filter((action) => action && action.label && (action.href || action.onClick))
              .map((action) =>
                action.href ? (
                  <a
                    key={action.label}
                    href={action.href}
                    target={action.target ?? '_blank'}
                    rel={action.rel ?? 'noopener noreferrer'}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                    onClick={(event) => handleSecondaryAction(event, action)}
                    data-course-card-action="true"
                  >
                    {resolveActionIcon(action)}
                    {action.label}
                  </a>
                ) : (
                  <button
                    key={action.label}
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                    onClick={(event) => handleSecondaryAction(event, action)}
                    data-course-card-action="true"
                  >
                    {resolveActionIcon(action)}
                    {action.label}
                  </button>
                )
              )}
          </div>

          {downloads.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 text-sm font-semibold text-slate-700"
                onClick={handleDownloadsToggle}
                data-course-card-action="true"
              >
                <span className="inline-flex items-center gap-2">
                  <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                  {downloadsOpen ? 'Hide downloads' : 'Download resources'}
                </span>
                <ChevronDownIcon
                  className={clsx('h-4 w-4 transition-transform', downloadsOpen && 'rotate-180')}
                  aria-hidden="true"
                />
              </button>
              {downloadsOpen ? (
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {downloads.map((item, index) => (
                    <li key={`${item.label ?? 'Resource'}-${item.href ?? index}`}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-800">{item.label ?? `Resource ${index + 1}`}</p>
                          {item.description ? (
                            <p className="text-xs text-slate-500">{item.description}</p>
                          ) : null}
                        </div>
                        {item.href ? (
                          <a
                            href={item.href}
                            download={item.download ?? true}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary hover:text-primary-dark"
                            data-course-card-action="true"
                          >
                            Download
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

const actionShape = PropTypes.shape({
  label: PropTypes.string.isRequired,
  href: PropTypes.string,
  onClick: PropTypes.func,
  target: PropTypes.string,
  rel: PropTypes.string,
  icon: PropTypes.oneOfType([PropTypes.func, PropTypes.node])
});

CourseCard.propTypes = {
  course: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    subtitle: PropTypes.string,
    description: PropTypes.string,
    instructor: PropTypes.string,
    level: PropTypes.string,
    deliveryFormat: PropTypes.string,
    price: PropTypes.string,
    rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    ratingCount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    progress: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    nextLesson: PropTypes.string,
    goalStatus: PropTypes.string,
    goalReference: PropTypes.string,
    status: PropTypes.string,
    thumbnailUrl: PropTypes.string,
    previewThumbnailUrl: PropTypes.string,
    previewTitle: PropTypes.string,
    previewUrl: PropTypes.string,
    previewDuration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    previewAction: PropTypes.func,
    durationMinutes: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    downloads: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string,
        description: PropTypes.string,
        href: PropTypes.string,
        download: PropTypes.oneOfType([PropTypes.bool, PropTypes.string])
      })
    ),
    upsellBadges: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string,
        tone: PropTypes.string,
        icon: PropTypes.oneOfType([PropTypes.func, PropTypes.node])
      })
    ),
    tags: PropTypes.arrayOf(PropTypes.string),
    skills: PropTypes.arrayOf(PropTypes.string)
  }).isRequired,
  variant: PropTypes.oneOf(['catalogue', 'dashboard', 'recommendation']),
  primaryAction: actionShape,
  secondaryActions: PropTypes.arrayOf(actionShape),
  onSelect: PropTypes.func
};
