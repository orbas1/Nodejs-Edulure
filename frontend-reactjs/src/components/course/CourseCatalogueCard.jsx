import { AcademicCapIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import PropTypes from 'prop-types';

import MediaPreviewSlot from '../media/MediaPreviewSlot.jsx';

function resolveBadges(course) {
  const badges = [];
  if (course.level) {
    badges.push(course.level);
  }
  if (course.deliveryFormat) {
    badges.push(course.deliveryFormat.replace(/[_-]+/g, ' '));
  }
  if (course.certificateLabel) {
    badges.push(course.certificateLabel);
  }
  return badges;
}

function resolveMetadata(course) {
  if (!course.previewMetadata) {
    return null;
  }
  const { source, freshnessLabel } = course.previewMetadata;
  return {
    source: source ?? 'Edulure Search',
    freshnessLabel: freshnessLabel ?? 'Live metadata'
  };
}

export default function CourseCatalogueCard({ course, onPurchase }) {
  const badges = resolveBadges(course);
  const mediaMetadata = resolveMetadata(course);

  return (
    <article className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            <AcademicCapIcon className="h-4 w-4" /> Course
          </div>
          <h3 className="text-2xl font-semibold text-slate-900">{course.title}</h3>
          {course.subtitle ? <p className="text-sm font-medium text-slate-500">{course.subtitle}</p> : null}
          {course.description ? (
            <p className="text-sm leading-relaxed text-slate-600">{course.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {course.price ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary">
                {course.price}
              </span>
            ) : null}
            {course.scheduleLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                {course.scheduleLabel}
              </span>
            ) : null}
            {course.durationLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                {course.durationLabel}
              </span>
            ) : null}
          </div>
        </div>
        <div className="w-full max-w-[200px]">
          <MediaPreviewSlot
            thumbnailUrl={course.thumbnailUrl}
            hoverVideoUrl={course.previewVideoUrl}
            fallbackIllustration="course"
            aspectRatio={course.previewAspectRatio ?? '3:2'}
            caption={course.previewCaption ?? course.previewMetadata?.caption ?? null}
            badges={badges}
            metadata={mediaMetadata}
          />
        </div>
      </div>

      {Array.isArray(course.skills) && course.skills.length ? (
        <div className="flex flex-wrap gap-2">
          {course.skills.slice(0, 8).map((skill) => (
            <span key={skill} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              #{skill}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {Array.isArray(course.actions)
          ? course.actions.map((action) => (
              <a
                key={`${course.id}-${action.label}`}
                href={action.href ?? '#'}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
              >
                {action.label}
              </a>
            ))
          : null}
        {onPurchase ? (
          <button
            type="button"
            onClick={() => onPurchase(course)}
            className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
          >
            <CreditCardIcon className="h-4 w-4" /> Purchase cohort
          </button>
        ) : null}
      </div>
    </article>
  );
}

CourseCatalogueCard.propTypes = {
  course: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    description: PropTypes.string,
    level: PropTypes.string,
    deliveryFormat: PropTypes.string,
    price: PropTypes.string,
    scheduleLabel: PropTypes.string,
    durationLabel: PropTypes.string,
    thumbnailUrl: PropTypes.string,
    previewVideoUrl: PropTypes.string,
    previewCaption: PropTypes.string,
    previewAspectRatio: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    previewMetadata: PropTypes.shape({
      source: PropTypes.string,
      freshnessLabel: PropTypes.string,
      caption: PropTypes.string
    }),
    certificateLabel: PropTypes.string,
    skills: PropTypes.arrayOf(PropTypes.string),
    actions: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        href: PropTypes.string
      })
    )
  }).isRequired,
  onPurchase: PropTypes.func
};

CourseCatalogueCard.defaultProps = {
  onPurchase: undefined
};
