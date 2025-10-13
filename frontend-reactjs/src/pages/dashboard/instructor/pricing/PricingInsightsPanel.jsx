import PropTypes from 'prop-types';

export default function PricingInsightsPanel({ insights }) {
  return (
    <div className="dashboard-section">
      <h2 className="text-lg font-semibold text-slate-900">Signals & insights</h2>
      {insights.length > 0 ? (
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          {insights.map((insight, index) => (
            <li key={`${insight}-${index}`} className="dashboard-card-muted px-4 py-3">
              {insight}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-600">Insights will populate once revenue streams stabilise.</p>
      )}
    </div>
  );
}

PricingInsightsPanel.propTypes = {
  insights: PropTypes.arrayOf(PropTypes.string)
};

PricingInsightsPanel.defaultProps = {
  insights: []
};
