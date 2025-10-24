import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/24/outline';

function RevenueBar({ label, value, trend }) {
  const width = Math.min(Math.max(Number(value ?? 0), 0), 100);
  const numericTrend = Number(trend);
  const hasTrend = Number.isFinite(numericTrend) && numericTrend !== 0;
  const TrendIcon = numericTrend >= 0 ? ArrowUpIcon : ArrowDownIcon;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span className="inline-flex items-center gap-1">
          {width}%
          {hasTrend ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                numericTrend >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
              }`}
            >
              <TrendIcon className="h-3 w-3" />
              {Math.abs(numericTrend)}%
            </span>
          ) : null}
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-gradient-to-r from-primary to-primary-dark" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

RevenueBar.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  trend: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

RevenueBar.defaultProps = {
  trend: null
};

export default function PricingRevenueMix({ streams, onRefresh }) {
  const normalisedStreams = useMemo(() => {
    if (!Array.isArray(streams)) return [];
    return streams.map((stream) => ({
      name: stream.name,
      value: Number(stream.value ?? 0),
      trend: stream.trend ?? null,
      category: stream.category ?? 'one-time'
    }));
  }, [streams]);

  if (!normalisedStreams.length) {
    return null;
  }

  const recurringShare = normalisedStreams
    .filter((stream) => stream.category === 'recurring')
    .reduce((total, stream) => total + Math.max(stream.value, 0), 0);
  const totalShare = normalisedStreams.reduce((total, stream) => total + Math.max(stream.value, 0), 0);
  const normalisedRecurring = totalShare > 0 ? Math.round((recurringShare / totalShare) * 100) : 0;

  return (
    <section className="dashboard-section">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Revenue mix</h2>
          <p className="text-sm text-slate-600">
            Distribution of revenue over the last 30 days.
            {totalShare > 0 ? ` Recurring share ${normalisedRecurring}% of captured revenue.` : ''}
          </p>
        </div>
        <button type="button" className="dashboard-pill" onClick={onRefresh}>
          Refresh snapshot
        </button>
      </div>
      <div className="mt-6 space-y-4">
        {normalisedStreams.map((stream) => (
          <RevenueBar key={stream.name} label={stream.name} value={stream.value} trend={stream.trend} />
        ))}
      </div>
    </section>
  );
}

PricingRevenueMix.propTypes = {
  streams: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      trend: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      category: PropTypes.string
    })
  ),
  onRefresh: PropTypes.func
};

PricingRevenueMix.defaultProps = {
  streams: [],
  onRefresh: undefined
};
