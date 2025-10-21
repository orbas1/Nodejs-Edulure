import { useMemo } from 'react';
import PropTypes from 'prop-types';

const DEFAULT_NUMBER_FORMATTER = new Intl.NumberFormat('en-US');
function formatCommunityRevenue(community, formatCurrency) {
  const amount = community.revenue;
  if (typeof amount === 'number' && Number.isFinite(amount)) {
    const currency = community.currency ?? 'USD';
    return formatCurrency(amount, currency);
  }

  if (typeof amount === 'string' && amount.trim().length > 0) {
    return amount;
  }

  return '—';
}

function normaliseShare(value, formatNumber) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value % 1 === 0) {
      return `${formatNumber(value)}%`;
    }
    return `${value.toFixed(1)}%`;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.includes('%') ? value : `${value}%`;
  }

  return '—';
}

export default function AdminTopCommunitiesSection({
  sectionId,
  communities,
  formatNumber,
  formatCurrency
}) {
  const numberFormatter = useMemo(() => formatNumber ?? ((value) => DEFAULT_NUMBER_FORMATTER.format(value)), [formatNumber]);
  const currencyFormatter = useMemo(
    () =>
      formatCurrency ??
      ((amount, currency) =>
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency ?? 'USD',
          maximumFractionDigits: 0
        }).format(amount)),
    [formatCurrency]
  );

  const rows = useMemo(
    () =>
      communities.map((community) => ({
        id: community.id,
        name: community.name ?? 'Untitled community',
        revenue: formatCommunityRevenue(community, currencyFormatter),
        subscribers:
          community.subscribers === null || community.subscribers === undefined
            ? '—'
            : numberFormatter(Number(community.subscribers)),
        share: normaliseShare(community.share, numberFormatter)
      })),
    [communities, currencyFormatter, numberFormatter]
  );

  return (
    <section id={sectionId} className="dashboard-section">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Top performing communities</h2>
        <span className="text-xs uppercase tracking-wide text-slate-500">Last 30 days</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600">
          <caption className="sr-only">Communities ranked by revenue and subscriber share</caption>
          <thead>
            <tr>
              <th scope="col" className="py-2 pr-6 font-semibold text-slate-500">
                Community
              </th>
              <th scope="col" className="py-2 pr-6 font-semibold text-slate-500">
                Revenue
              </th>
              <th scope="col" className="py-2 pr-6 font-semibold text-slate-500">
                Subscribers
              </th>
              <th scope="col" className="py-2 font-semibold text-slate-500">
                Share
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-xs text-slate-500">
                  No monetised communities in the selected window.
                </td>
              </tr>
            ) : (
              rows.map((community) => (
                <tr key={community.id}>
                  <th scope="row" className="py-3 pr-6 font-semibold text-slate-900">
                    {community.name}
                  </th>
                  <td className="py-3 pr-6 text-slate-700">{community.revenue}</td>
                  <td className="py-3 pr-6 text-slate-700">{community.subscribers}</td>
                  <td className="py-3 text-slate-700">{community.share}</td>
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
  sectionId: PropTypes.string,
  communities: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string,
      revenue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      currency: PropTypes.string,
      subscribers: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      share: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })
  ).isRequired,
  formatNumber: PropTypes.func,
  formatCurrency: PropTypes.func
};

AdminTopCommunitiesSection.defaultProps = {
  sectionId: undefined,
  formatNumber: undefined,
  formatCurrency: undefined
};
