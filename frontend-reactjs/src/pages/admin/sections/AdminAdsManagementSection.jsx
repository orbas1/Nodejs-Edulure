import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import AdminCrudResource from '../../../components/dashboard/admin/AdminCrudResource.jsx';
import adminAdsApi from '../../../api/adminAdsApi.js';
import { formatCurrency } from '../../dashboard/admin/adminControlConfig.jsx';

const CAMPAIGN_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' }
];

const CAMPAIGN_OBJECTIVES = [
  { value: 'awareness', label: 'Awareness' },
  { value: 'acquisition', label: 'Acquisition' },
  { value: 'retention', label: 'Retention' },
  { value: 'upsell', label: 'Upsell' },
  { value: 'cross_sell', label: 'Cross-sell' }
];

const campaignFields = [
  { name: 'name', label: 'Campaign name', type: 'text', required: true },
  {
    name: 'objective',
    label: 'Objective',
    type: 'select',
    defaultValue: 'acquisition',
    options: CAMPAIGN_OBJECTIVES
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    defaultValue: 'draft',
    options: CAMPAIGN_STATUSES
  },
  {
    name: 'budgetDaily',
    label: 'Daily budget (USD)',
    type: 'number',
    step: '0.01',
    fromInput: (value) => (value === '' ? undefined : Number(value)),
    toInput: (item) =>
      item?.budgetDailyCents !== undefined && item?.budgetDailyCents !== null
        ? (Number(item.budgetDailyCents) / 100).toFixed(2)
        : ''
  },
  {
    name: 'spendTotal',
    label: 'Total spend to date (USD)',
    type: 'number',
    step: '0.01',
    fromInput: (value) => (value === '' ? undefined : Number(value)),
    toInput: (item) =>
      item?.spendTotalCents !== undefined && item?.spendTotalCents !== null
        ? (Number(item.spendTotalCents) / 100).toFixed(2)
        : ''
  },
  {
    name: 'performanceScore',
    label: 'Performance score',
    type: 'number',
    min: 0,
    max: 100,
    step: '0.1'
  },
  {
    name: 'ctr',
    label: 'CTR (%)',
    type: 'number',
    step: '0.01'
  },
  {
    name: 'cpc',
    label: 'CPC (USD)',
    type: 'number',
    step: '0.01',
    fromInput: (value) => (value === '' ? undefined : Number(value)),
    toInput: (item) => (item?.cpcCents ? (Number(item.cpcCents) / 100).toFixed(2) : '')
  },
  {
    name: 'cpa',
    label: 'CPA (USD)',
    type: 'number',
    step: '0.01',
    fromInput: (value) => (value === '' ? undefined : Number(value)),
    toInput: (item) => (item?.cpaCents ? (Number(item.cpaCents) / 100).toFixed(2) : '')
  },
  { name: 'startAt', label: 'Start date', type: 'datetime', allowEmpty: true },
  { name: 'endAt', label: 'End date', type: 'datetime', allowEmpty: true },
  {
    name: 'targetingKeywords',
    label: 'Keywords',
    type: 'tags',
    placeholder: 'automation, onboarding'
  },
  {
    name: 'targetingAudiences',
    label: 'Audiences',
    type: 'tags',
    placeholder: 'ops-leaders, instructors'
  },
  {
    name: 'targetingLocations',
    label: 'Locations',
    type: 'tags',
    placeholder: 'US, UK, CA'
  },
  {
    name: 'targetingLanguages',
    label: 'Languages',
    type: 'tags',
    placeholder: 'en, es'
  },
  { name: 'creativeHeadline', label: 'Headline', type: 'text' },
  { name: 'creativeDescription', label: 'Description', type: 'textarea', rows: 3 },
  { name: 'creativeUrl', label: 'Landing page URL', type: 'text', placeholder: 'https://...' },
  {
    name: 'metadata',
    label: 'Metadata (JSON)',
    type: 'json',
    rows: 4,
    allowEmpty: true,
    placeholder: '{"utm":"spring_campaign"}'
  }
];

const campaignColumns = [
  {
    key: 'name',
    label: 'Campaign',
    render: (item) => (
      <div>
        <p className="font-semibold text-slate-900">{item.name}</p>
        <p className="text-xs text-slate-500">{item.objective}</p>
      </div>
    )
  },
  {
    key: 'status',
    label: 'Status',
    render: (item) => (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
        {item.status}
      </span>
    )
  },
  {
    key: 'spendTotalCents',
    label: 'Spend',
    render: (item) => formatCurrency(item.spendTotalCents ?? 0, item.spendCurrency ?? 'USD')
  },
  {
    key: 'performanceScore',
    label: 'Performance',
    render: (item) => (
      <div className="text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Score {item.performanceScore ?? '—'}</p>
        <p className="text-xs text-slate-500">CTR {item.ctr ?? 0}%</p>
      </div>
    )
  }
];

function SummaryCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

SummaryCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  helper: PropTypes.string
};

SummaryCard.defaultProps = {
  helper: undefined
};

function normaliseNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export default function AdminAdsManagementSection({ sectionId, token }) {
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const fetchSummary = useCallback(async () => {
    if (!token) {
      setSummary(null);
      return;
    }
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const payload = await adminAdsApi.getAdsSummary({ token });
      setSummary(payload ?? {});
    } catch (error) {
      setSummaryError(error instanceof Error ? error : new Error('Failed to load ad metrics'));
    } finally {
      setLoadingSummary(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const summaryCards = useMemo(() => {
    if (!summary) {
      return [
        { label: 'Active campaigns', value: loadingSummary ? 'Loading…' : 0 },
        { label: 'Impressions (30d)', value: '—' },
        { label: 'Spend (30d)', value: '—' },
        { label: 'ROAS (30d)', value: '—' }
      ];
    }

    const spend = normaliseNumber(summary.metrics30d?.spendCents);
    const revenue = normaliseNumber(summary.metrics30d?.revenueCents);
    const roas = spend === 0 ? '—' : (revenue / spend).toFixed(2);

    return [
      {
        label: 'Active campaigns',
        value: summary.activeCampaigns ?? 0,
        helper: `${summary.totalCampaigns ?? 0} total`
      },
      {
        label: 'Impressions (30d)',
        value: summary.metrics30d?.impressions?.toLocaleString() ?? '0',
        helper: `${summary.metrics30d?.clicks ?? 0} clicks`
      },
      {
        label: 'Spend (30d)',
        value: formatCurrency(spend, 'USD'),
        helper: `Revenue ${formatCurrency(revenue, 'USD')}`
      },
      {
        label: 'ROAS (30d)',
        value: roas,
        helper: `${summary.metrics30d?.conversions ?? 0} conversions`
      }
    ];
  }, [summary, loadingSummary]);

  const topCampaigns = summary?.topCampaigns ?? [];
  const performanceTrend = summary?.performanceTrend ?? [];

  return (
    <section id={sectionId} className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">Ads management</h2>
          <p className="text-sm text-slate-600">
            Optimise paid placements, monitor conversions, and align growth investments with campaign telemetry.
          </p>
          {summaryError ? <p className="text-xs text-rose-600">{summaryError.message}</p> : null}
        </div>
        <button
          type="button"
          onClick={fetchSummary}
          className="self-start rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-sky-400 hover:text-sky-600"
          disabled={loadingSummary}
        >
          {loadingSummary ? 'Refreshing…' : 'Refresh summary'}
        </button>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>
      {topCampaigns.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Top performers (30d)</h3>
          <ul className="mt-3 space-y-3 text-xs text-slate-600">
            {topCampaigns.map((campaign) => (
              <li key={campaign.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{campaign.name}</p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">{campaign.status}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">
                    ROAS {campaign.roas !== null ? campaign.roas : '—'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatCurrency(campaign.revenueCents ?? 0, 'USD')} revenue
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {performanceTrend.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">Daily performance (14d)</h3>
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            {performanceTrend.map((row) => (
              <li key={row.date} className="flex items-center justify-between">
                <span>{new Date(row.date).toLocaleDateString()}</span>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(row.spendCents ?? 0, 'USD')} spend
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatCurrency(row.revenueCents ?? 0, 'USD')} revenue
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <AdminCrudResource
        token={token}
        title="Campaign operations"
        description="Launch and iterate campaigns with clear targeting, creative, and budget controls."
        entityName="campaign"
        listRequest={({ token: authToken, params, signal }) =>
          adminAdsApi.listCampaigns({ token: authToken, params: { ...params, perPage: 50 }, signal })
        }
        createRequest={({ token: authToken, payload }) => adminAdsApi.createCampaign({ token: authToken, payload })}
        updateRequest={({ token: authToken, id, payload }) =>
          adminAdsApi.updateCampaign({ token: authToken, id, payload })
        }
        deleteRequest={({ token: authToken, id }) => adminAdsApi.deleteCampaign({ token: authToken, id })}
        fields={campaignFields}
        columns={campaignColumns}
        searchPlaceholder="Search campaigns"
        statusOptions={CAMPAIGN_STATUSES}
      />
    </section>
  );
}

AdminAdsManagementSection.propTypes = {
  sectionId: PropTypes.string,
  token: PropTypes.string
};

AdminAdsManagementSection.defaultProps = {
  sectionId: 'ads-management',
  token: null
};
