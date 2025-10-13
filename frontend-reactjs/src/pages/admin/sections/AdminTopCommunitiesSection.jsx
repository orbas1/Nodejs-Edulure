import PropTypes from 'prop-types';

export default function AdminTopCommunitiesSection({ communities, formatNumber }) {
  return (
    <section className="dashboard-section">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Top performing communities</h2>
        <span className="text-xs uppercase tracking-wide text-slate-500">Last 30 days</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600">
          <thead>
            <tr>
              <th className="py-2 pr-6 font-semibold text-slate-500">Community</th>
              <th className="py-2 pr-6 font-semibold text-slate-500">Revenue</th>
              <th className="py-2 pr-6 font-semibold text-slate-500">Subscribers</th>
              <th className="py-2 font-semibold text-slate-500">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {communities.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-xs text-slate-500">
                  No monetised communities in the selected window.
                </td>
              </tr>
            ) : (
              communities.map((community) => (
                <tr key={community.id}>
                  <td className="py-3 pr-6 font-semibold text-slate-900">{community.name}</td>
                  <td className="py-3 pr-6 text-slate-700">{community.revenue}</td>
                  <td className="py-3 pr-6 text-slate-700">{formatNumber(community.subscribers)}</td>
                  <td className="py-3 text-slate-700">{community.share}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

AdminTopCommunitiesSection.propTypes = {
  communities: PropTypes.arrayOf(PropTypes.object).isRequired,
  formatNumber: PropTypes.func.isRequired
};
