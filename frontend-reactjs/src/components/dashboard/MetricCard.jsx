import PropTypes from 'prop-types';

export default function MetricCard({ metric }) {
  return (
    <div className="dashboard-section">
      <p className="dashboard-kicker">{metric.label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{metric.value}</p>
      {metric.change ? (
        <p className={`mt-1 text-sm font-medium ${metric.trend === 'down' ? 'text-rose-500' : 'text-emerald-500'}`}>
          {metric.change}
        </p>
      ) : null}
    </div>
  );
}

MetricCard.propTypes = {
  metric: PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    change: PropTypes.string,
    trend: PropTypes.oneOf(['up', 'down'])
  }).isRequired
};
