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

function UpcomingCard({ event }) {
  const tone = urgencyTone[event.urgency] ?? 'text-slate-500';
  const badgeTone = urgencyBadgeTone[event.urgency] ?? 'bg-slate-100 text-slate-600';
  return (
    <li className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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
      {event.href ? (
        <a
          href={event.href}
          target={event.href.startsWith('mailto:') ? '_self' : '_blank'}
          rel="noreferrer noopener"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark"
        >
          {event.action}
        </a>
      ) : (
        <button
          type="button"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm opacity-60"
          disabled
        >
          {event.action}
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
