import PropTypes from 'prop-types';
import clsx from 'clsx';

const engagementEntryPropType = PropTypes.shape({
  name: PropTypes.string.isRequired,
  participation: PropTypes.number.isRequired
});

function EngagementRow({ name, participation, percentage }) {
  const width = Math.max(percentage, 6);
  return (
    <li>
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="truncate" title={name}>
          {name}
        </span>
        <span>{participation} touchpoints</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-primary via-primary-light to-primary-dark"
          style={{ width: `${width}%` }}
        />
      </div>
    </li>
  );
}

EngagementRow.propTypes = {
  name: PropTypes.string.isRequired,
  participation: PropTypes.number.isRequired,
  percentage: PropTypes.number.isRequired
};

export default function LearnerCommunityEngagementSection({ communities, className }) {
  if (!Array.isArray(communities) || communities.length === 0) return null;

  const maxParticipation = communities.reduce((max, entry) => Math.max(max, entry.participation ?? 0), 0) || 1;

  return (
    <section className={clsx('dashboard-section h-full', className)}>
      <p className="dashboard-kicker">Community energy</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">Where your peers are collaborating</h3>
      <ul className="mt-6 space-y-4">
        {communities.map((community) => (
          <EngagementRow
            key={community.name}
            name={community.name}
            participation={community.participation}
            percentage={Math.round(((community.participation ?? 0) / maxParticipation) * 100)}
          />
        ))}
      </ul>
      <p className="mt-6 rounded-2xl bg-primary/10 px-4 py-3 text-xs font-medium text-primary-dark">
        Signals combine feed activity, live session chat, and reactions. Refresh to see the latest moderation-reviewed stats.
      </p>
    </section>
  );
}

LearnerCommunityEngagementSection.propTypes = {
  communities: PropTypes.arrayOf(engagementEntryPropType),
  className: PropTypes.string
};

LearnerCommunityEngagementSection.defaultProps = {
  communities: [],
  className: ''
};
