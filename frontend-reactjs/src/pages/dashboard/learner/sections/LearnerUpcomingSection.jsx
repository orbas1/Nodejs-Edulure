import PropTypes from 'prop-types';

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
    <li className="dashboard-card-muted p-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{event.type}</span>
        <span>{event.date}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{event.title}</p>
      <p className="text-xs text-slate-500">Hosted by {event.host}</p>
      <button type="button" className="mt-4 inline-flex items-center justify-center dashboard-primary-pill">
        {event.action}
      </button>
    </li>
  );
}

UpcomingCard.propTypes = {
  event: upcomingItemPropType.isRequired
};

export default function LearnerUpcomingSection({ upcoming }) {
  if (upcoming.length === 0) return null;

  return (
    <section className="dashboard-section">
      <p className="dashboard-kicker">Upcoming commitments</p>
      <ul className="mt-4 space-y-4">
        {upcoming.map((event) => (
          <UpcomingCard key={event.id} event={event} />
        ))}
      </ul>
    </section>
  );
}

LearnerUpcomingSection.propTypes = {
  upcoming: PropTypes.arrayOf(upcomingItemPropType)
};

LearnerUpcomingSection.defaultProps = {
  upcoming: []
};
