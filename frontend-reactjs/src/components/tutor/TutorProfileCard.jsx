import PropTypes from 'prop-types';

import MediaPreviewSlot from '../media/MediaPreviewSlot.jsx';

function NormalisedFocusAreas({ focusAreas }) {
  if (!Array.isArray(focusAreas) || focusAreas.length === 0) {
    return null;
  }
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
      {focusAreas.slice(0, 6).map((item) => (
        <span key={item} className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
          {item}
        </span>
      ))}
    </div>
  );
}

NormalisedFocusAreas.propTypes = {
  focusAreas: PropTypes.arrayOf(PropTypes.string)
};

NormalisedFocusAreas.defaultProps = {
  focusAreas: undefined
};

export default function TutorProfileCard({ tutor, onBook, onRoute, actionsDisabled }) {
  const statusTone = tutor.statusTone ?? 'neutral';
  const toneClasses = {
    success: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-200',
    info: 'bg-sky-500/10 text-sky-600 border-sky-200',
    neutral: 'bg-slate-500/10 text-slate-600 border-slate-200'
  };

  const tone = toneClasses[statusTone] ?? toneClasses.neutral;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{tutor.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{tutor.headline}</p>
          <p className="mt-1 text-xs text-slate-500">{tutor.timezone}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone}`}>
          {tutor.status}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,_1fr)_minmax(0,_120px)] sm:items-start">
        <dl className="space-y-2 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-500">Rate</dt>
            <dd className="font-medium text-slate-900">{tutor.rate ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-500">Rating</dt>
            <dd className="font-medium text-slate-900">{tutor.rating ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-500">Response SLA</dt>
            <dd className="font-medium text-slate-900">{tutor.responseTime ?? '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-500">Availability</dt>
            <dd className="font-medium text-slate-900">{tutor.availability ?? '—'}</dd>
          </div>
          {tutor.weeklyHours ? (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">Preference</dt>
              <dd className="font-medium text-slate-900">{tutor.weeklyHours}</dd>
            </div>
          ) : null}
          {tutor.sessions ? (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-500">Sessions</dt>
              <dd className="font-medium text-slate-900">{tutor.sessions}</dd>
            </div>
          ) : null}
        </dl>
        <MediaPreviewSlot
          thumbnailUrl={tutor.avatarUrl}
          fallbackIllustration="tutor"
          aspectRatio="1:1"
          caption={tutor.focusLabel ?? 'Mentor focus areas'}
          badges={tutor.badges}
          metadata={tutor.previewMetadata}
        />
      </div>

      <NormalisedFocusAreas focusAreas={tutor.focusAreas} />

      {tutor.workload ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{tutor.workload}</p>
      ) : null}

      <div className="flex flex-wrap gap-3 text-sm font-semibold">
        {typeof onBook === 'function' ? (
          <button
            type="button"
            className="rounded-full border border-primary px-4 py-2 text-primary transition hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => onBook(tutor)}
            disabled={actionsDisabled}
          >
            Book session
          </button>
        ) : null}
        {typeof onRoute === 'function' ? (
          <button
            type="button"
            className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => onRoute(tutor)}
            disabled={actionsDisabled}
          >
            Adjust routing
          </button>
        ) : null}
      </div>
    </article>
  );
}

TutorProfileCard.propTypes = {
  tutor: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    headline: PropTypes.string,
    timezone: PropTypes.string,
    status: PropTypes.string,
    statusTone: PropTypes.string,
    rate: PropTypes.string,
    rating: PropTypes.string,
    responseTime: PropTypes.string,
    availability: PropTypes.string,
    weeklyHours: PropTypes.string,
    sessions: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    focusAreas: PropTypes.arrayOf(PropTypes.string),
    focusLabel: PropTypes.string,
    workload: PropTypes.string,
    avatarUrl: PropTypes.string,
    badges: PropTypes.arrayOf(PropTypes.string),
    previewMetadata: PropTypes.shape({
      source: PropTypes.string,
      freshnessLabel: PropTypes.string
    })
  }).isRequired,
  onBook: PropTypes.func,
  onRoute: PropTypes.func,
  actionsDisabled: PropTypes.bool
};

TutorProfileCard.defaultProps = {
  onBook: undefined,
  onRoute: undefined,
  actionsDisabled: false
};
