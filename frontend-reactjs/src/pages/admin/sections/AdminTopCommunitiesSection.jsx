import { useMemo } from 'react';
import PropTypes from 'prop-types';

import {
  buildCommunityLeaderboard,
  formatCurrency as defaultFormatCurrency,
  formatNumber as defaultFormatNumber,
  formatPercent as defaultFormatPercent
} from '../utils.js';

function SummaryStat({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 shadow-sm">
      <p className="font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-[11px] text-slate-500">{helper}</p> : null}
    </div>
  );
}

SummaryStat.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  helper: PropTypes.string
};

SummaryStat.defaultProps = {
  helper: undefined
};

function TrendBadge({ trend }) {
  if (!trend || trend === '—') return null;

  const numeric = Number(String(trend).replace(/[^0-9+.-]/g, ''));
  const tone = Number.isFinite(numeric)
    ? numeric > 0
      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
      : numeric < 0
        ? 'text-rose-700 bg-rose-50 border border-rose-200'
        : 'text-slate-600 bg-slate-100 border border-slate-200'
    : 'text-slate-600 bg-slate-100 border border-slate-200';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      <span aria-hidden className="text-base leading-none">
        {numeric > 0 ? '↑' : numeric < 0 ? '↓' : '•'}
      </span>
      {trend}
    </span>
  );
}

TrendBadge.propTypes = {
  trend: PropTypes.string
};

TrendBadge.defaultProps = {
  trend: undefined
};

export default function AdminTopCommunitiesSection({
  sectionId,
  communities,
  formatNumber,
  formatCurrency
}) {
  const numberFormatter = useMemo(
    () =>
      typeof formatNumber === 'function'
        ? (value, options) => formatNumber(value, options)
        : (value, options) => defaultFormatNumber(value, options),
    [formatNumber]
  );

  const currencyFormatter = useMemo(
    () =>
      typeof formatCurrency === 'function'
        ? (value, currency, options) => formatCurrency(value, currency, options)
        : (value, currency, options) => defaultFormatCurrency(value, currency, options),
    [formatCurrency]
  );

  const { rows, summary } = useMemo(
    () =>
      buildCommunityLeaderboard(communities, {
        numberFormatter,
        currencyFormatter,
        percentFormatter: (value, options) => defaultFormatPercent(value, options)
      }),
    [communities, numberFormatter, currencyFormatter]
  );

  return (
    <section id={sectionId} className="dashboard-section">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Top performing communities</h2>
          <p className="text-xs uppercase tracking-wide text-slate-500">Last 30 days · Ranked by gross revenue</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <SummaryStat label="Total revenue" value={summary.totalRevenue} helper="Cumulative across tracked communities" />
          <SummaryStat label="Average share" value={summary.averageShare} helper="Share of marketplace revenue" />
          <SummaryStat label="Top momentum" value={summary.topTrend} helper="Highest growth in period" />
        </div>
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
                <tr key={community.id} className="align-middle">
                  <th scope="row" className="py-4 pr-6 text-sm font-semibold text-slate-900">
                    <div className="flex flex-col gap-1">
                      <span>{community.name}</span>
                      <span className="text-xs uppercase tracking-wide text-slate-400">{community.cohort}</span>
                    </div>
                  </th>
                  <td className="py-4 pr-6 text-slate-700">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-slate-900">{community.revenueDisplay}</span>
                      <TrendBadge trend={community.trendDisplay} />
                    </div>
                  </td>
                  <td className="py-4 pr-6 text-slate-700">
                    <span className="font-semibold text-slate-900">{community.subscribersDisplay}</span>
                  </td>
                  <td className="py-4 text-slate-700">
                    <div className="flex flex-col gap-2">
                      <span className="font-semibold text-slate-900">{community.shareDisplay}</span>
                      <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-primary/70"
                          style={{ width: `${community.shareProgress}%` }}
                          aria-hidden
                        />
                      </div>
                    </div>
                  </td>
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
