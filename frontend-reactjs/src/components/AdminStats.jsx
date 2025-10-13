import PropTypes from 'prop-types';

function TrendIndicator({ trend }) {
  const isDown = trend === 'down';
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
        isDown ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
      }`}
    >
      <svg
        className={`h-3 w-3 ${isDown ? 'rotate-180' : ''}`}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M10 4.5a.75.75 0 0 1 .64.37l4 7a.75.75 0 1 1-1.28.74L10 6.518 6.64 12.61a.75.75 0 0 1-1.28-.74l4-7A.75.75 0 0 1 10 4.5Z" />
      </svg>
    </span>
  );
}

TrendIndicator.propTypes = {
  trend: PropTypes.oneOf(['up', 'down']).isRequired
};

export default function AdminStats({ metrics }) {
  if (!metrics?.length) {
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.id ?? metric.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.label}</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{metric.value}</p>
          {metric.change ? (
            <p
              className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold ${
                metric.trend === 'down' ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              <TrendIndicator trend={metric.trend === 'down' ? 'down' : 'up'} />
              {metric.change}
            </p>
          ) : null}
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
      trend: PropTypes.oneOf(['up', 'down'])
    })
  )
};

AdminStats.defaultProps = {
  metrics: []
};
