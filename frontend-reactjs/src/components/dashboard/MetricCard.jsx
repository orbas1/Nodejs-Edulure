import PropTypes from 'prop-types';

import AnalyticsStat from '../shared/AnalyticsStat.jsx';

export default function MetricCard({ metric }) {
  return (
    <AnalyticsStat
      label={metric.label}
      value={metric.value}
      change={metric.change}
      trend={metric.trend}
      description={metric.description}
    />
  );
}

MetricCard.propTypes = {
  metric: PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    change: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    trend: PropTypes.oneOf(['up', 'down']),
    description: PropTypes.string
  }).isRequired
};
