import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import AdminCrudResource from '../../../components/dashboard/admin/AdminCrudResource.jsx';
import adminRevenueApi from '../../../api/adminRevenueApi.js';
import { formatCurrency } from '../../dashboard/admin/adminControlConfig.jsx';

const ADJUSTMENT_STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'approved', label: 'Approved' },
  { value: 'settled', label: 'Settled' },
  { value: 'cancelled', label: 'Cancelled' }
];

const adjustmentFields = [
  { name: 'reference', label: 'Reference', type: 'text', required: true },
  { name: 'category', label: 'Category', type: 'text', defaultValue: 'general' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    defaultValue: 'scheduled',
    options: ADJUSTMENT_STATUSES
  },
  { name: 'currency', label: 'Currency', type: 'text', defaultValue: 'USD' },
  {
    name: 'amount',
    label: 'Amount',
    type: 'number',
    step: '0.01',
    fromInput: (value) => (value === '' ? undefined : Number(value)),
    toInput: (item) =>
      item?.amountCents !== undefined && item?.amountCents !== null
        ? (Number(item.amountCents) / 100).toFixed(2)
        : ''
  },
  { name: 'effectiveAt', label: 'Effective date', type: 'datetime', required: true },
  {
    name: 'notes',
    label: 'Notes',
    type: 'textarea',
    rows: 3,
    allowEmpty: true,
    placeholder: 'Reason for adjustment, payout reference, partner programme'
  },
  {
    name: 'metadata',
    label: 'Metadata (JSON)',
    type: 'json',
    rows: 4,
    allowEmpty: true,
    placeholder: '{"payoutId":"pay_123"}'
  }
];

const adjustmentColumns = [
  {
    key: 'reference',
    label: 'Reference',
    render: (item) => (
      <div>
        <p className="font-semibold text-slate-900">{item.reference}</p>
        {item.notes ? <p className="text-xs text-slate-500">{item.notes}</p> : null}
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
    key: 'amountCents',
    label: 'Amount',
    render: (item) => formatCurrency(item.amountCents ?? 0, item.currency ?? 'USD')
  },
  {
    key: 'effectiveAt',
    label: 'Effective',
    render: (item) => {
      if (!item.effectiveAt) return 'TBC';
      const date = new Date(item.effectiveAt);
      if (Number.isNaN(date.getTime())) return 'TBC';
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
    }
  }
];

function SummaryCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">{label}</p>
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

const isAbortError = (error) => error?.name === 'AbortError' || error?.code === 'ERR_CANCELED';

function normaliseAmount(value) {
  if (value === null || value === undefined) return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export default function AdminRevenueManagementSection({ sectionId, token }) {
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const fetchSummary = useCallback(
    async ({ signal, showLoading = true } = {}) => {
      if (!token) {
        setSummary(null);
        setSummaryError(null);
        setLoadingSummary(false);
        return;
      }

      if (showLoading) {
        setLoadingSummary(true);
      }
      setSummaryError(null);

      try {
        const request = signal ? { token, signal } : { token };
        const payload = await adminRevenueApi.getRevenueSummary(request);
        if (signal?.aborted) {
          return;
        }
        setSummary(payload ?? {});
      } catch (error) {
        if (signal?.aborted || isAbortError(error)) {
          return;
        }
        setSummaryError(error instanceof Error ? error : new Error('Failed to load revenue summary'));
      } finally {
        if (!signal?.aborted) {
          setLoadingSummary(false);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchSummary({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [fetchSummary]);

  const summaryCards = useMemo(() => {
    if (!summary) {
      return [
        { label: 'Captured', value: loadingSummary ? 'Loading…' : formatCurrency(0, 'USD') },
        { label: 'Pending', value: '—' },
        { label: 'Refunded', value: '—' },
        { label: 'Recognised', value: '—' }
      ];
    }

    return [
      {
        label: 'Captured revenue',
        value: formatCurrency(normaliseAmount(summary.payments?.capturedCents), 'USD'),
        helper: `Avg. order ${formatCurrency(summary.payments?.averageOrderCents ?? 0, 'USD')}`
      },
      {
        label: 'Pending settlements',
        value: formatCurrency(normaliseAmount(summary.payments?.pendingCents), 'USD'),
        helper: formatCurrency(normaliseAmount(summary.revenueSchedules?.inFlightCents), 'USD') + ' in schedules'
      },
      {
        label: 'Refunded',
        value: formatCurrency(normaliseAmount(summary.payments?.refundedCents), 'USD')
      },
      {
        label: 'Recognised',
        value: formatCurrency(normaliseAmount(summary.revenueSchedules?.recognisedCents), 'USD'),
        helper: `${summary.revenueSchedules?.totalSchedules ?? 0} schedules`
      }
    ];
  }, [summary, loadingSummary]);

  const trendRows = useMemo(() => {
    if (!Array.isArray(summary?.revenueTrend)) {
      return [];
    }
    return summary.revenueTrend.slice(-14);
  }, [summary]);

  return (
    <section id={sectionId} className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">Revenue management</h2>
          <p className="text-sm text-slate-600">
            Monitor captured revenue, deferred schedules, and adjustments to keep finance operations audit ready.
          </p>
          {summaryError ? <p className="text-xs text-rose-600">{summaryError.message}</p> : null}
        </div>
        <button
          type="button"
          onClick={fetchSummary}
          className="self-start rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-amber-400 hover:text-amber-600"
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
      {trendRows.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700">14-day revenue trend</h3>
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            {trendRows.map((row) => (
              <li key={row.date} className="flex items-center justify-between">
                <span>{new Date(row.date).toLocaleDateString()}</span>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(normaliseAmount(row.grossCents), 'USD')}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Recognised {formatCurrency(normaliseAmount(row.recognisedCents), 'USD')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <AdminCrudResource
        token={token}
        title="Revenue adjustments"
        description="Apply manual adjustments, partner rev-share true-ups, and deferred revenue releases."
        entityName="adjustment"
        listRequest={({ token: authToken, params, signal }) =>
          adminRevenueApi.listAdjustments({ token: authToken, params: { ...params, perPage: 50 }, signal })
        }
        createRequest={({ token: authToken, payload }) =>
          adminRevenueApi.createAdjustment({ token: authToken, payload })
        }
        updateRequest={({ token: authToken, id, payload }) =>
          adminRevenueApi.updateAdjustment({ token: authToken, id, payload })
        }
        deleteRequest={({ token: authToken, id }) => adminRevenueApi.deleteAdjustment({ token: authToken, id })}
        fields={adjustmentFields}
        columns={adjustmentColumns}
        searchPlaceholder="Search adjustments"
        statusOptions={ADJUSTMENT_STATUSES}
      />
    </section>
  );
}

AdminRevenueManagementSection.propTypes = {
  sectionId: PropTypes.string,
  token: PropTypes.string
};

AdminRevenueManagementSection.defaultProps = {
  sectionId: 'revenue-management',
  token: null
};
