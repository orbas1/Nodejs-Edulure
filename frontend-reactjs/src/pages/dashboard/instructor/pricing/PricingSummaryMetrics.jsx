import PropTypes from 'prop-types';

function PricingMetricCard({ title, value, hint }) {
  return (
    <div className="dashboard-section">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
    </div>
  );
}

PricingMetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  hint: PropTypes.string
};

PricingMetricCard.defaultProps = {
  hint: null
};

export default function PricingSummaryMetrics({ metrics }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <PricingMetricCard key={metric.title} {...metric} />
      ))}
    </section>
  );
}

PricingSummaryMetrics.propTypes = {
  metrics: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      hint: PropTypes.string
    })
  )
};

PricingSummaryMetrics.defaultProps = {
  metrics: []
};
