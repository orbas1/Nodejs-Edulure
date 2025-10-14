import PropTypes from 'prop-types';
import clsx from 'clsx';

const paceEntryPropType = PropTypes.shape({
  label: PropTypes.string.isRequired,
  minutes: PropTypes.number.isRequired
});

function formatMinutes(minutes) {
  if (!Number.isFinite(minutes)) return '0 min';
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (remainder === 0) return `${hours} hr`;
    return `${hours} hr ${remainder} min`;
  }
  return `${minutes} min`;
}

function BarTrack({ value, label, percentage }) {
  const width = Math.max(percentage, 4);
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-primary via-primary-light to-primary-dark"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

BarTrack.propTypes = {
  value: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  percentage: PropTypes.number.isRequired
};

export default function LearnerPaceSection({ pace, className }) {
  if (!Array.isArray(pace) || pace.length === 0) return null;

  const maxMinutes = pace.reduce((max, entry) => Math.max(max, entry.minutes ?? 0), 0) || 1;

  return (
    <section className={clsx('dashboard-section h-full', className)}>
      <p className="dashboard-kicker">Learning pace</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">Your focus time this week</h3>
      <div className="mt-4 space-y-4">
        {pace.map((entry) => (
          <BarTrack
            key={entry.label}
            label={entry.label}
            value={formatMinutes(entry.minutes)}
            percentage={Math.round(((entry.minutes ?? 0) / maxMinutes) * 100)}
          />
        ))}
      </div>
      <p className="mt-6 rounded-2xl bg-slate-100 px-4 py-3 text-xs font-medium text-slate-600">
        We aggregate all live lessons, self-paced modules, and mentor sessions completed in the last seven days.
      </p>
    </section>
  );
}

LearnerPaceSection.propTypes = {
  pace: PropTypes.arrayOf(paceEntryPropType),
  className: PropTypes.string
};

LearnerPaceSection.defaultProps = {
  pace: [],
  className: ''
};
