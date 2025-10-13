import PropTypes from 'prop-types';

import MetricCard from '../../../../components/dashboard/MetricCard.jsx';

export default function InstructorMetricsSection({ metrics }) {
  if (metrics.length === 0) return null;

  return (
    <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} metric={metric} />
      ))}
    </section>
  );
}

InstructorMetricsSection.propTypes = {
  metrics: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
    })
  )
};

InstructorMetricsSection.defaultProps = {
  metrics: []
};
