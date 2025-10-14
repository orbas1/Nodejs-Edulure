import PropTypes from 'prop-types';

const summaryShape = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  helper: PropTypes.string.isRequired
};

export default function CourseCreationSummaryCards({ cards }) {
  if (!cards.length) {
    return null;
  }

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="dashboard-section">
          <p className="dashboard-kicker">{card.label}</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{card.value}</p>
          <p className="mt-1 text-xs text-slate-600">{card.helper}</p>
        </div>
      ))}
    </section>
  );
}

CourseCreationSummaryCards.propTypes = {
  cards: PropTypes.arrayOf(PropTypes.shape(summaryShape))
};

CourseCreationSummaryCards.defaultProps = {
  cards: []
};
