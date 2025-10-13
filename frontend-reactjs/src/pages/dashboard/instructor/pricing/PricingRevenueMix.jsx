import PropTypes from 'prop-types';

function RevenueBar({ label, value }) {
  const width = Math.min(Math.max(Number(value ?? 0), 0), 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span>{width}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

RevenueBar.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default function PricingRevenueMix({ streams, onRefresh }) {
  if (!streams.length) {
    return null;
  }

  return (
    <section className="dashboard-section">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Revenue mix</h2>
          <p className="text-sm text-slate-600">Distribution of revenue over the last 30 days.</p>
        </div>
        <button type="button" className="dashboard-pill" onClick={onRefresh}>
          Refresh snapshot
        </button>
      </div>
      <div className="mt-6 space-y-4">
        {streams.map((stream) => (
          <RevenueBar key={stream.name} label={stream.name} value={stream.value} />
        ))}
      </div>
    </section>
  );
}

PricingRevenueMix.propTypes = {
  streams: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
    })
  ),
  onRefresh: PropTypes.func
};

PricingRevenueMix.defaultProps = {
  streams: [],
  onRefresh: undefined
};
