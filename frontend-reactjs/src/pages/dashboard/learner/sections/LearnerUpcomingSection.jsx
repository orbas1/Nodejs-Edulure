import PropTypes from 'prop-types';
import clsx from 'clsx';

const upcomingItemPropType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  type: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  host: PropTypes.string.isRequired,
  action: PropTypes.string.isRequired
});

function UpcomingCard({ event }) {
  return (
    <li className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>{event.type}</span>
        <span>{event.date}</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900">{event.title}</p>
      <p className="text-xs text-slate-500">Hosted by {event.host}</p>
      <button
        type="button"
        className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-dark"
      >
        {event.action}
      </button>
    </li>
  );
}

UpcomingCard.propTypes = {
  event: upcomingItemPropType.isRequired
};

export default function LearnerUpcomingSection({ upcoming, className }) {
  if (!Array.isArray(upcoming) || upcoming.length === 0) return null;

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
