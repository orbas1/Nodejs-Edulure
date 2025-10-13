import PropTypes from 'prop-types';

const highlightPropType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  time: PropTypes.string.isRequired,
  tags: PropTypes.arrayOf(PropTypes.string).isRequired,
  headline: PropTypes.string.isRequired,
  reactions: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  comments: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
});

function HighlightCard({ highlight }) {
  return (
    <li className="dashboard-card-muted p-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{highlight.time}</span>
        <span>{highlight.tags.join(' • ')}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">{highlight.headline}</p>
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span>❤️ {highlight.reactions}</span>
        <span>💬 {highlight.comments}</span>
      </div>
    </li>
  );
}

HighlightCard.propTypes = {
  highlight: highlightPropType.isRequired
};

export default function LearnerFeedHighlightsSection({ highlights }) {
  if (highlights.length === 0) return null;

  return (
    <section className="dashboard-section">
      <p className="dashboard-kicker">Feed highlights</p>
      <ul className="mt-4 space-y-4">
        {highlights.map((item) => (
          <HighlightCard key={item.id} highlight={item} />
        ))}
      </ul>
    </section>
  );
}

LearnerFeedHighlightsSection.propTypes = {
  highlights: PropTypes.arrayOf(highlightPropType)
};

LearnerFeedHighlightsSection.defaultProps = {
  highlights: []
};
