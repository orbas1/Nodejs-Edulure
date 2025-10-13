import PropTypes from 'prop-types';

const paceEntryPropType = PropTypes.shape({
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired
});

function BarTrack({ value, label }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark" style={{ width: value }} />
      </div>
    </div>
  );
}

BarTrack.propTypes = {
  value: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired
};

export default function LearnerPaceSection({ pace }) {
  if (pace.length === 0) return null;

  return (
    <section className="dashboard-section lg:col-span-2">
      <p className="dashboard-kicker">Learning pace</p>
      <div className="mt-4 space-y-4">
        {pace.map((entry) => (
          <BarTrack key={entry.label} label={entry.label} value={entry.value} />
        ))}
      </div>
    </section>
  );
}

LearnerPaceSection.propTypes = {
  pace: PropTypes.arrayOf(paceEntryPropType)
};

LearnerPaceSection.defaultProps = {
  pace: []
};
