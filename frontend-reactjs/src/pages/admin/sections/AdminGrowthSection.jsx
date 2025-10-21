import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import AdminCrudResource from '../../../components/dashboard/admin/AdminCrudResource.jsx';
import adminGrowthApi from '../../../api/adminGrowthApi.js';

const EXPERIMENT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'running', label: 'Running' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' }
];

const experimentFields = [
  { name: 'name', label: 'Experiment name', type: 'text', required: true },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    defaultValue: 'draft',
    options: EXPERIMENT_STATUSES
  },
  { name: 'ownerId', label: 'Owner user ID', type: 'number', allowEmpty: true },
  { name: 'ownerEmail', label: 'Owner email', type: 'text', placeholder: 'growth@edulure.com' },
  {
    name: 'hypothesis',
    label: 'Hypothesis',
    type: 'textarea',
    rows: 3,
    fullWidth: true,
    placeholder: 'If we introduce cohort pathways, completion rate will increase by 15%.'
  },
  { name: 'primaryMetric', label: 'Primary metric', type: 'text', placeholder: 'Course completion rate' },
  {
    name: 'baselineValue',
    label: 'Baseline value',
    type: 'number',
    step: '0.01'
  },
  {
    name: 'targetValue',
    label: 'Target value',
    type: 'number',
    step: '0.01'
  },
  { name: 'startAt', label: 'Start date', type: 'datetime', allowEmpty: true },
  { name: 'endAt', label: 'End date', type: 'datetime', allowEmpty: true },
  {
    name: 'segments',
    label: 'Audience segments',
    type: 'tags',
    placeholder: 'New learners, Enterprise'
  },
  {
    name: 'metadata',
    label: 'Metadata (JSON)',
    type: 'json',
    rows: 4,
    allowEmpty: true,
    placeholder: '{"successCriteria":"Increase retention by 10%"}'
  }
];

const experimentColumns = [
  {
    key: 'name',
    label: 'Experiment',
    render: (item) => (
      <div>
        <p className="font-semibold text-slate-900">{item.name}</p>
        {item.hypothesis ? <p className="text-xs text-slate-500">{item.hypothesis}</p> : null}
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
    key: 'primaryMetric',
    label: 'Metric',
    render: (item) => (
      <div className="text-sm text-slate-600">
        <p>{item.primaryMetric ?? 'N/A'}</p>
        <p className="text-xs text-slate-400">
          Baseline {item.baselineValue ?? '—'} → Target {item.targetValue ?? '—'}
        </p>
      </div>
    )
  },
  {
    key: 'owner',
    label: 'Owner',
    render: (item) => item.ownerEmail ?? `User #${item.ownerId ?? 'TBD'}`
  }
];

function SummaryCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-600">{label}</p>
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

export default function AdminGrowthSection({ sectionId, token }) {
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState(null);

  const fetchMetrics = useCallback(
    async ({ signal, showLoading = true } = {}) => {
      if (!token) {
        setMetrics(null);
        setLoadingMetrics(false);
        setMetricsError(null);
        return;
      }

      if (showLoading) {
        setLoadingMetrics(true);
      }
      setMetricsError(null);

      try {
        const request = signal ? { token, signal } : { token };
        const payload = await adminGrowthApi.getGrowthMetrics(request);
        if (signal?.aborted) {
          return;
        }
        setMetrics(payload ?? {});
      } catch (error) {
        if (signal?.aborted || isAbortError(error)) {
          return;
        }
        setMetricsError(error instanceof Error ? error : new Error('Failed to load growth metrics'));
      } finally {
        if (!signal?.aborted) {
          setLoadingMetrics(false);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchMetrics({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [fetchMetrics]);

  const summaryCards = useMemo(() => {
    if (!metrics) {
      return [
        { label: 'Active experiments', value: loadingMetrics ? 'Loading…' : 0 },
        { label: 'Enrolments (30d)', value: '—' },
        { label: 'Conversion rate', value: '—' },
        { label: 'Retention', value: '—' }
      ];
    }
    return [
      {
        label: 'Active experiments',
        value: metrics.activeExperiments ?? 0,
        helper: `${metrics.totalExperiments ?? 0} total programmes`
      },
      {
        label: 'Enrolments (30d)',
        value: metrics.learningVelocity?.enrollmentsCurrent ?? 0,
        helper: metrics.learningVelocity?.growthRate
          ? `${metrics.learningVelocity.growthRate}% vs prior`
          : undefined
      },
      {
        label: 'Conversion rate',
        value:
          metrics.conversionRate !== undefined ? `${Number(metrics.conversionRate).toFixed(1)}%` : '—'
      },
      {
        label: 'Retention',
        value: metrics.retentionRate !== undefined ? `${Number(metrics.retentionRate).toFixed(1)}%` : '—',
        helper: `${metrics.newUsersLast30d ?? 0} new learners`
      }
    ];
  }, [metrics, loadingMetrics]);

  return (
    <section id={sectionId} className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-slate-900">Growth experiments</h2>
          <p className="text-sm text-slate-600">
            Design, launch, and monitor multi-channel experiments that accelerate learner acquisition and retention.
          </p>
          {metricsError ? (
            <p className="text-xs text-rose-600">{metricsError.message}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={fetchMetrics}
          className="self-start rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-fuchsia-400 hover:text-fuchsia-600"
          disabled={loadingMetrics}
        >
          {loadingMetrics ? 'Refreshing…' : 'Refresh metrics'}
        </button>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>
      <AdminCrudResource
        token={token}
        title="Experiment backlog"
        description="Track hypotheses, success metrics, and execution windows for your growth portfolio."
        entityName="experiment"
        listRequest={({ token: authToken, params, signal }) =>
          adminGrowthApi.listExperiments({ token: authToken, params: { ...params, perPage: 50 }, signal })
        }
        createRequest={({ token: authToken, payload }) => adminGrowthApi.createExperiment({ token: authToken, payload })}
        updateRequest={({ token: authToken, id, payload }) =>
          adminGrowthApi.updateExperiment({ token: authToken, id, payload })
        }
        deleteRequest={({ token: authToken, id }) => adminGrowthApi.deleteExperiment({ token: authToken, id })}
        fields={experimentFields}
        columns={experimentColumns}
        searchPlaceholder="Search experiments"
        statusOptions={EXPERIMENT_STATUSES}
      />
    </section>
  );
}

AdminGrowthSection.propTypes = {
  sectionId: PropTypes.string,
  token: PropTypes.string
};

AdminGrowthSection.defaultProps = {
  sectionId: 'growth',
  token: null
};
