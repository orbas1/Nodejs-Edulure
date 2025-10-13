import PropTypes from 'prop-types';

export default function PricingOffersTable({ offers, onLaunchOffer }) {
  return (
    <div className="dashboard-section">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Course offers</h2>
        <button type="button" className="dashboard-pill px-3 py-1" onClick={onLaunchOffer}>
          Launch new offer
        </button>
      </div>
      {offers.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="pb-3">Program</th>
                <th className="pb-3">Price</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Conversion</th>
                <th className="pb-3">Learners</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {offers.map((offer) => (
                <tr key={offer.id} className="hover:bg-primary/5">
                  <td className="py-3 text-slate-900">{offer.name}</td>
                  <td className="py-3 text-slate-600">{offer.price}</td>
                  <td className="py-3 text-slate-600">{offer.status}</td>
                  <td className="py-3 text-slate-600">{offer.conversion}</td>
                  <td className="py-3 text-slate-600">{offer.learners}</td>
                  <td className="py-3 text-right text-xs text-slate-600">
                    <button type="button" className="dashboard-pill px-3 py-1">
                      View funnel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">
          No course offers are live. Publish a cohort to populate this table.
        </p>
      )}
    </div>
  );
}

PricingOffersTable.propTypes = {
  offers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string,
      price: PropTypes.string,
      status: PropTypes.string,
      conversion: PropTypes.string,
      learners: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })
  ),
  onLaunchOffer: PropTypes.func
};

PricingOffersTable.defaultProps = {
  offers: [],
  onLaunchOffer: undefined
};
