import PropTypes from 'prop-types';
import clsx from 'clsx';

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
    <li className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>{highlight.time}</span>
        <span className="truncate text-right">{highlight.tags.join(' • ')}</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-900">{highlight.headline}</p>
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <span aria-label="Reactions">❤️ {highlight.reactions}</span>
        <span aria-label="Comments">💬 {highlight.comments}</span>
      </div>
    </li>
  );
}

HighlightCard.propTypes = {
  highlight: highlightPropType.isRequired
};

export default function LearnerFeedHighlightsSection({ highlights, className }) {
  if (!Array.isArray(highlights) || highlights.length === 0) return null;

  return (
    <section className={clsx('dashboard-section h-full', className)}>
      <p className="dashboard-kicker">Feed highlights</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">Signals from your communities</h3>
      <ul className="mt-4 space-y-4">
        {highlights.map((item) => (
          <HighlightCard key={item.id} highlight={item} />
        ))}
      </ul>
    </section>
  );
}

LearnerFeedHighlightsSection.propTypes = {
  highlights: PropTypes.arrayOf(highlightPropType),
  className: PropTypes.string
};

LearnerFeedHighlightsSection.defaultProps = {
  highlights: [],
  className: ''
};
