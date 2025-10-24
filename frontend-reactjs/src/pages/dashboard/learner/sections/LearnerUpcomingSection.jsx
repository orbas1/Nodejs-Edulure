import PropTypes from 'prop-types';
import clsx from 'clsx';

const upcomingItemPropType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  type: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  relative: PropTypes.string,
  urgency: PropTypes.string,
  urgencyLabel: PropTypes.string,
  title: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  action: PropTypes.string.isRequired,
  actionLabel: PropTypes.string,
  actionType: PropTypes.string,
  href: PropTypes.string
});

const urgencyTone = {
  overdue: 'text-rose-600',
  soon: 'text-amber-600',
  future: 'text-slate-500'
};

const urgencyBadgeTone = {
  overdue: 'bg-rose-100 text-rose-700',
  soon: 'bg-amber-100 text-amber-700',
  future: 'bg-emerald-100 text-emerald-700'
};

const ACTION_VARIANTS = {
  join: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:outline-emerald-600',
  review: 'bg-indigo-600 hover:bg-indigo-700 focus-visible:outline-indigo-600',
  schedule: 'bg-primary hover:bg-primary-dark focus-visible:outline-primary',
  default: 'bg-primary hover:bg-primary-dark focus-visible:outline-primary'
};

function resolveActionVariant(actionType) {
  if (!actionType) {
    return ACTION_VARIANTS.default;
  }
  const key = actionType.toLowerCase();
  if (ACTION_VARIANTS[key]) {
    return ACTION_VARIANTS[key];
  }
  return ACTION_VARIANTS.default;
}

function isSameOriginLink(href) {
  if (!href) {
    return false;
  }
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.edulure.com';
    const url = new URL(href, origin);
    return url.origin === origin;
  } catch (_error) {
    return false;
  }
}

function resolveLinkTarget(href) {
  if (!href) {
    return { target: undefined, rel: undefined };
  }
  if (href.startsWith('mailto:') || href.startsWith('#')) {
    return { target: undefined, rel: undefined };
  }
  if (isSameOriginLink(href)) {
    return { target: undefined, rel: undefined };
  }
  return { target: '_blank', rel: 'noreferrer noopener' };
}

function UpcomingCard({ event }) {
  const tone = urgencyTone[event.urgency] ?? 'text-slate-500';
  const badgeTone = urgencyBadgeTone[event.urgency] ?? 'bg-slate-100 text-slate-600';
  const urgencyDescriptor =
    event.urgencyLabel ??
    (event.urgency === 'overdue'
      ? 'This session has passed its scheduled start.'
      : event.urgency === 'soon'
        ? 'Upcoming soon. Prep materials ready.'
        : 'Scheduled and on track.');
  const actionVariant = resolveActionVariant(event.actionType);
  const { target, rel } = resolveLinkTarget(event.href);
  return (
    <li
      className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      data-urgency={event.urgency ?? 'future'}
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>{event.type}</span>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className={clsx('text-[11px] font-semibold', tone)}>{event.date}</span>
          {event.relative && (
            <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-semibold', badgeTone)}>
              {event.relative}
            </span>
          )}
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900">{event.title}</p>
      <p className="text-xs text-slate-500">Hosted by {event.host}</p>
      <p className="mt-1 text-xs text-slate-400">{urgencyDescriptor}</p>
      {event.href ? (
        <a
          href={event.href}
          target={target}
          rel={rel}
          className={clsx(
            'mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold text-white shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
            actionVariant
          )}
          aria-label={`${event.actionLabel ?? event.action ?? 'Open details'} for ${event.title}`}
        >
          {event.actionLabel ?? event.action ?? 'View details'}
        </a>
      ) : (
        <button
          type="button"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-300 px-4 py-2 text-xs font-semibold text-white shadow-sm opacity-60"
          disabled
        >
          {event.actionLabel ?? event.action ?? 'View details'}
        </button>
      )}
    </li>
  );
}

UpcomingCard.propTypes = {
  event: upcomingItemPropType.isRequired
};

export default function LearnerUpcomingSection({ upcoming, className }) {
  if (!Array.isArray(upcoming) || upcoming.length === 0) {
    return (
      <section className={clsx('dashboard-section h-full', className)}>
        <p className="dashboard-kicker">Upcoming commitments</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">No sessions on the books yet</h3>
        <p className="mt-2 text-sm text-slate-600" role="status" aria-live="polite">
          Connect your calendar or explore live classrooms to populate this space with workshops, mentor sessions, and
          community events as they go live.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark"
            href="/dashboard/learner/live-classes"
          >
            View live classrooms
          </a>
          <a
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
            href="/dashboard/learner/bookings"
          >
            Book a tutor
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className={clsx('dashboard-section h-full', className)}>
      <p className="dashboard-kicker">Upcoming commitments</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">Stay ready for the week ahead</h3>
      <ul className="mt-4 space-y-4">
        {upcoming.map((event) => (
          <UpcomingCard key={event.id} event={event} />
        ))}
      </ul>
    </section>
  );
}

LearnerUpcomingSection.propTypes = {
  upcoming: PropTypes.arrayOf(upcomingItemPropType),
  className: PropTypes.string
};

LearnerUpcomingSection.defaultProps = {
  upcoming: [],
  className: ''
};
