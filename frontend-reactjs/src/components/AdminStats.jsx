import PropTypes from 'prop-types';

export default function AdminStats({ metrics }) {
  const cards = Array.isArray(metrics) && metrics.length > 0 ? metrics : [];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {cards.map((metric) => (
        <div key={metric.id ?? metric.label} className="dashboard-panel">
          <h3 className="text-sm font-semibold text-slate-500">{metric.label}</h3>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{metric.value}</p>
          {metric.change && (
            <p
              className={`mt-2 text-xs font-medium uppercase tracking-wide ${
                metric.trend === 'down'
                  ? 'text-rose-500'
                  : metric.trend === 'steady'
                    ? 'text-slate-500'
                    : 'text-emerald-600'
              }`}
            >
              {metric.change}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

AdminStats.propTypes = {
  metrics: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      change: PropTypes.string,
      trend: PropTypes.oneOf(['up', 'down', 'steady', undefined])
    })
  )
};

AdminStats.defaultProps = {
  metrics: []
};
