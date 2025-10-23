import PropTypes from 'prop-types';
import clsx from 'clsx';

import { trackAnalyticsWidgetView } from '../../lib/analytics.js';

export default function AnalyticsStat({
  label,
  value,
  change,
  trend,
  description,
  tone = 'default',
  onVisible
}) {
  const trendClass = trend === 'down' ? 'text-rose-500' : 'text-emerald-500';
  const toneClass = tone === 'muted' ? 'bg-slate-50/80' : 'bg-white';

  return (
    <article
      className={clsx(
        'rounded-3xl border border-slate-200 p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md',
        toneClass
      )}
      onFocus={() => {
        trackAnalyticsWidgetView(label, { trigger: 'focus' });
        onVisible?.('focus');
      }}
      onMouseEnter={() => {
        trackAnalyticsWidgetView(label, { trigger: 'hover' });
        onVisible?.('hover');
      }}
    >
      <p className="dashboard-kicker">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      {change ? (
        <p className={clsx('mt-1 text-sm font-semibold', trendClass)}>{change}</p>
      ) : null}
      {description ? <p className="mt-3 text-xs text-slate-500">{description}</p> : null}
    </article>
  );
}

AnalyticsStat.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  change: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  trend: PropTypes.oneOf(['up', 'down']),
  description: PropTypes.string,
  tone: PropTypes.oneOf(['default', 'muted']),
  onVisible: PropTypes.func
};

AnalyticsStat.defaultProps = {
  change: null,
  trend: 'up',
  description: '',
  tone: 'default',
  onVisible: null
};
