import PropTypes from 'prop-types';

export default function PricingSubscriptionsTable({ tiers, onManageTiers }) {
  return (
    <div className="dashboard-section">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Subscription tiers</h2>
        <button type="button" className="dashboard-pill px-3 py-1" onClick={onManageTiers}>
          Manage tiers
        </button>
      </div>
      {tiers.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-3">Tier</th>
                <th className="pb-3">Price</th>
                <th className="pb-3">Members</th>
                <th className="pb-3">Churn</th>
                <th className="pb-3">Next renewal</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tiers.map((tier) => (
                <tr key={tier.id} className="hover:bg-primary/5">
                  <td className="py-3 text-slate-900">{tier.name}</td>
                  <td className="py-3 text-slate-600">{tier.price}</td>
                  <td className="py-3 text-slate-600">{tier.members}</td>
                  <td className="py-3 text-slate-600">{tier.churn}</td>
                  <td className="py-3 text-slate-600">{tier.renewal}</td>
                  <td className="py-3 text-right text-xs text-slate-600">
                    <button type="button" className="dashboard-pill px-3 py-1">
                      Adjust pricing
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">
          No subscription tiers are active. Create a community paywall to start recurring revenue.
        </p>
      )}
    </div>
  );
}

PricingSubscriptionsTable.propTypes = {
  tiers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string,
      price: PropTypes.string,
      members: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      churn: PropTypes.string,
      renewal: PropTypes.string
    })
  ),
  onManageTiers: PropTypes.func
};

PricingSubscriptionsTable.defaultProps = {
  tiers: [],
  onManageTiers: undefined
};
