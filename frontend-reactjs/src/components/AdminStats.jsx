import PropTypes from 'prop-types';

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1
});

const currencyFormatterCache = new Map();

function getCurrencyFormatter(currency = 'USD') {
  const cacheKey = currency.toUpperCase();
  if (!currencyFormatterCache.has(cacheKey)) {
    currencyFormatterCache.set(
      cacheKey,
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: cacheKey,
        maximumFractionDigits: 0
      })
    );
  }
  return currencyFormatterCache.get(cacheKey);
}

function resolveNumeric(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? null : numericValue;
}

function formatMetricValue(metric) {
  const numericValue = resolveNumeric(metric.value);

  if (metric.format === 'currency' && numericValue !== null) {
    return getCurrencyFormatter(metric.currency).format(numericValue);
  }

  if (metric.format === 'percentage') {
    if (numericValue === null) return '—';
    return percentFormatter.format(numericValue / 100);
  }

  if (metric.format === 'duration' && numericValue !== null) {
    const minutes = Math.round(numericValue);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainderMinutes = minutes % 60;
    return remainderMinutes
      ? `${hours}h ${remainderMinutes}m`
      : `${hours}h`;
  }

  if (numericValue !== null) {
    return compactFormatter.format(numericValue);
  }

  return metric.value ?? '—';
}

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
        focusable="false"
        aria-hidden="true"
      >
        <path d="M10 4.5a.75.75 0 0 1 .64.37l4 7a.75.75 0 1 1-1.28.74L10 6.518 6.64 12.61a.75.75 0 0 1-1.28-.74l4-7A.75.75 0 0 1 10 4.5Z" />
      </svg>
      <span className="sr-only">{isDown ? 'Performance decreased' : 'Performance increased'}</span>
    </span>
  );
}

TrendIndicator.propTypes = {
  trend: PropTypes.oneOf(['up', 'down']).isRequired
};

function MetricSkeleton() {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-3 w-24 animate-pulse rounded-full bg-slate-100" />
      <div className="h-8 w-32 animate-pulse rounded-full bg-slate-200" />
      <div className="h-3 w-20 animate-pulse rounded-full bg-slate-100" />
    </div>
  );
}

export default function AdminStats({ metrics, isLoading = false }) {
  if (isLoading) {
    return (
      <div
        className="grid gap-6 md:grid-cols-2 xl:grid-cols-4"
        aria-busy="true"
        role="status"
        aria-live="polite"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <MetricSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (!metrics?.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Performance metrics will appear here once your communities start reporting activity.
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.id ?? metric.label}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {metric.label}
          </p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">
            {formatMetricValue(metric)}
            {metric.unit && (
              <span className="ml-1 text-base font-medium text-slate-400">{metric.unit}</span>
            )}
          </p>
          {metric.helper && (
            <p className="mt-2 text-xs text-slate-500" aria-live="polite">
              {metric.helper}
            </p>
          )}
          {metric.change ? (
            <p
              className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold ${
                metric.trend === 'down' ? 'text-rose-600' : 'text-emerald-600'
              }`}
              aria-live="polite"
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
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      format: PropTypes.oneOf(['currency', 'percentage', 'duration', 'number']),
      currency: PropTypes.string,
      unit: PropTypes.string,
      helper: PropTypes.string,
      change: PropTypes.string,
      trend: PropTypes.oneOf(['up', 'down'])
    })
  ),
  isLoading: PropTypes.bool
};

AdminStats.defaultProps = {
  metrics: [],
  isLoading: false
};
