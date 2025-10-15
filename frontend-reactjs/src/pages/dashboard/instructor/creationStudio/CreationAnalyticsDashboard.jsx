import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChartBarIcon,
  SparklesIcon,
  ShieldExclamationIcon,
  SignalIcon
} from '@heroicons/react/24/outline';

import DashboardStateMessage from '../../../../components/dashboard/DashboardStateMessage.jsx';
import { creationStudioApi } from '../../../../api/creationStudioApi.js';

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last quarter' },
  { value: '365d', label: 'Last 12 months' }
];

const SCAM_TONE = {
  clear: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  watch: 'border-sky-200 bg-sky-50 text-sky-900',
  elevated: 'border-amber-200 bg-amber-50 text-amber-900',
  critical: 'border-rose-200 bg-rose-50 text-rose-900'
};

function formatNumber(value) {
  if (!Number.isFinite(Number(value))) return '0';
  return new Intl.NumberFormat().format(Number(value));
}

function formatPercentage(value) {
  if (!Number.isFinite(Number(value))) return '0%';
  return `${(Number(value)).toFixed(1)}%`;
}

function formatCurrencyFromCents(cents, currency = 'USD') {
  if (!Number.isFinite(Number(cents))) return '$0.00';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(cents) / 100);
}

function downloadFile(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function MetricCard({ title, value, description = '', icon: Icon = null, accent = 'bg-white' }) {
  return (
    <div className={`dashboard-card flex h-full flex-col justify-between gap-2 border border-slate-200 p-6 ${accent}`}>
      <div className="flex items-center gap-3">
        {Icon ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
      </div>
      {description ? <p className="text-sm text-slate-600">{description}</p> : null}
    </div>
  );
}

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  description: PropTypes.string,
  icon: PropTypes.elementType,
  accent: PropTypes.string
};

const DEFAULT_SCAM_ALERT = {
  state: 'watch',
  openReports: 0,
  highRiskCount: 0,
  lastReportAt: null,
  topReasons: [],
  guidance: 'No active scam alerts.'
};

function ScamAlertBanner({ alert = DEFAULT_SCAM_ALERT }) {
  const tone = SCAM_TONE[alert?.state] ?? SCAM_TONE.watch;
  return (
    <div className={`flex flex-col gap-3 rounded-3xl border p-6 shadow-sm ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70">
            <ShieldExclamationIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide">Scam monitoring</p>
            <p className="text-base font-semibold">
              {alert.state === 'critical'
                ? 'Critical scam investigations underway'
                : alert.state === 'elevated'
                ? 'Elevated scam risk – review flagged assets'
                : alert.state === 'watch'
                ? 'Monitor scam reports closely'
                : 'No active scam threats detected'}
            </p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{formatNumber(alert.openReports)} open cases</p>
          <p className="text-xs opacity-80">
            High risk: {formatNumber(alert.highRiskCount)}
            {alert.lastReportAt ? ` • Last report ${new Date(alert.lastReportAt).toLocaleString()}` : ''}
          </p>
        </div>
      </div>
      <p className="text-sm font-medium">{alert.guidance}</p>
      {alert.topReasons?.length ? (
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
          {alert.topReasons.map((reason) => (
            <span key={reason.reason} className="rounded-full border border-white/40 bg-white/50 px-3 py-1 text-slate-700">
              {reason.reason} · {reason.count}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

ScamAlertBanner.propTypes = {
  alert: PropTypes.shape({
    state: PropTypes.string,
    openReports: PropTypes.number,
    highRiskCount: PropTypes.number,
    lastReportAt: PropTypes.string,
    topReasons: PropTypes.arrayOf(
      PropTypes.shape({
        reason: PropTypes.string.isRequired,
        count: PropTypes.number.isRequired
      })
    ),
    guidance: PropTypes.string
  })
};

export default function CreationAnalyticsDashboard({ token = null }) {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = useCallback(
    (abortSignal) => {
      if (!token) return;
      setError(null);
      setRefreshing(true);
      creationStudioApi
        .fetchAnalyticsSummary({ token, range, signal: abortSignal })
        .then((payload) => setData(payload))
        .catch((err) => {
          if (abortSignal?.aborted) return;
          setError(err instanceof Error ? err : new Error('Failed to load analytics'));
        })
        .finally(() => {
          if (!abortSignal?.aborted) {
            setLoading(false);
            setRefreshing(false);
          }
        });
    },
    [range, token]
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    loadAnalytics(controller.signal);
    return () => controller.abort();
  }, [loadAnalytics]);

  const projectMetrics = data?.projectMetrics ?? null;
  const engagement = data?.engagement ?? null;
  const adsPerformance = data?.adsPerformance ?? null;
  const rankingInsights = data?.rankingInsights ?? [];
  const scamAlert = data?.scamAlert ?? undefined;

  const handleRangeChange = useCallback(
    (nextRange) => {
      if (nextRange === range) return;
      setRange(nextRange);
      setLoading(true);
    },
    [range]
  );

  const handleRefresh = useCallback(() => {
    const controller = new AbortController();
    loadAnalytics(controller.signal);
    return () => controller.abort();
  }, [loadAnalytics]);

  const handleExport = useCallback(
    (format) => {
      if (!data) return;
      const exportPayload = {
        timeframe: data.timeframe,
        projectMetrics: data.projectMetrics,
        engagement: data.engagement,
        adsPerformance: data.adsPerformance,
        rankingInsights: data.rankingInsights,
        scamAlert: data.scamAlert,
        generatedAt: data.exportMeta?.generatedAt
      };
      if (format === 'json') {
        downloadFile('creation-analytics-summary.json', JSON.stringify(exportPayload, null, 2), 'application/json');
        return;
      }
      const rows = [
        ['Metric group', 'Metric', 'Value'],
        ['Projects', 'Total projects', exportPayload.projectMetrics?.totals?.total ?? 0],
        ['Projects', 'Published', exportPayload.projectMetrics?.totals?.published ?? 0],
        ['Projects', 'Awaiting review', exportPayload.projectMetrics?.reviewBacklog?.awaitingReview ?? 0],
        ['Projects', 'Average review hours', exportPayload.projectMetrics?.velocity?.averageReviewHours ?? 0],
        ['Engagement', 'Total views', exportPayload.engagement?.totals?.views ?? 0],
        ['Engagement', 'Total completions', exportPayload.engagement?.totals?.completions ?? 0],
        ['Engagement', 'Average completion rate %', exportPayload.engagement?.rates?.completionRate ?? 0],
        ['Ads', 'Active campaigns', exportPayload.adsPerformance?.totals?.activeCampaigns ?? 0],
        ['Ads', 'Total spend cents', exportPayload.adsPerformance?.totals?.spendCents ?? 0],
        ['Risk', 'Open scam reports', exportPayload.scamAlert?.openReports ?? 0],
        ['Risk', 'High-risk reports', exportPayload.scamAlert?.highRiskCount ?? 0]
      ];
      const csv = rows
        .map((row) =>
          row
            .map((cell) => {
              const stringValue = cell === null || cell === undefined ? '' : String(cell);
              const escaped = stringValue.replace(/"/g, '""');
              return `"${escaped}"`;
            })
            .join(',')
        )
        .join('\n');
      downloadFile('creation-analytics-summary.csv', csv, 'text/csv');
    },
    [data]
  );

  const backlogBadge = useMemo(() => {
    if (!projectMetrics) return null;
    const total = projectMetrics.reviewBacklog?.total ?? 0;
    const tone = total > 4 ? 'bg-amber-100 text-amber-800' : total > 0 ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800';
    return (
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
        Review backlog: {formatNumber(total)}
      </span>
    );
  }, [projectMetrics]);

  if (!token) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Authentication required"
        description="Log in again to review studio analytics."
      />
    );
  }

  if (loading && !data) {
    return (
      <DashboardStateMessage
        variant="loading"
        title="Loading analytics"
        description="Aggregating project, engagement, and campaign insights."
      />
    );
  }

  if (error) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Unable to load analytics"
        description={error.message}
        actionLabel="Retry"
        onAction={() => handleRefresh()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Studio analytics</p>
          <h2 className="text-xl font-semibold text-slate-900">Creation performance overview</h2>
          <p className="text-sm text-slate-600">
            Monitor production velocity, engagement traction, ads effectiveness, and scam risk to steer launch decisions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleRangeChange(option.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  option.value === range ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => handleRefresh()}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary"
            disabled={refreshing}
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary"
            >
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport('json')}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary"
            >
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {backlogBadge}

      <ScamAlertBanner alert={scamAlert} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard
            title="Total projects"
            value={formatNumber(projectMetrics?.totals?.total ?? 0)}
            description="Includes drafts, review items, and published assets across all creation types."
            icon={ChartBarIcon}
          />
          <MetricCard
            title="Published"
            value={formatNumber(projectMetrics?.totals?.published ?? 0)}
            description="Live catalogue entries available to learners, communities, or campaign teams."
            icon={SparklesIcon}
          />
          <MetricCard
            title="Average review time"
            value={`${projectMetrics?.velocity?.averageReviewHours?.toFixed?.(1) ?? '0'}h`}
            description="Measured from review request to approval to spotlight governance throughput."
            icon={SignalIcon}
          />
          <MetricCard
            title="Average session length"
            value={`${projectMetrics?.collaboration?.averageSessionMinutes?.toFixed?.(1) ?? '0'}m`}
            description="Mean duration of active collaboration sessions over the selected window."
            icon={ArrowPathIcon}
          />
        </div>
        <div className="dashboard-card flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Engagement snapshot</p>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Completion {formatPercentage(engagement?.rates?.completionRate ?? 0)}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm text-slate-700">
            <div>
              <dt className="font-semibold">Total views</dt>
              <dd className="text-lg font-semibold">{formatNumber(engagement?.totals?.views ?? 0)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Conversions</dt>
              <dd className="text-lg font-semibold">{formatNumber(engagement?.totals?.conversions ?? 0)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Watch time</dt>
              <dd className="text-lg font-semibold">
                {formatNumber(engagement?.totals?.watchTimeMinutes ?? 0)} minutes
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Revenue</dt>
              <dd className="text-lg font-semibold">
                {formatCurrencyFromCents(engagement?.totals?.revenueCents ?? 0)}
              </dd>
            </div>
          </dl>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Targeted audiences</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
              {(engagement?.audienceTargets?.audiences ?? []).slice(0, 6).map((audience) => (
                <span key={audience} className="rounded-full bg-slate-100 px-3 py-1">
                  {audience}
                </span>
              ))}
              {!(engagement?.audienceTargets?.audiences ?? []).length ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-500">No audiences configured</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="dashboard-card rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ranking insights</p>
              <h3 className="text-lg font-semibold text-slate-900">Top performing creations</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {rankingInsights.length} surfaced
            </span>
          </div>
          {rankingInsights.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Rank</th>
                    <th className="px-3 py-2">Creation</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Completion</th>
                    <th className="px-3 py-2">Conversion</th>
                    <th className="px-3 py-2">Key driver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {rankingInsights.map((insight) => (
                    <tr key={insight.entityId} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-semibold">#{insight.rank}</td>
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-900">{insight.entityName}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-500">{insight.context}</p>
                      </td>
                      <td className="px-3 py-2 font-mono text-sm">{insight.score.toFixed(3)}</td>
                      <td className="px-3 py-2">{formatPercentage(insight.completionRate)}</td>
                      <td className="px-3 py-2">{formatPercentage(insight.conversionRate)}</td>
                      <td className="px-3 py-2 text-sm text-slate-600">{insight.driver}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No ranking insights available yet. Publish creations and capture engagement to populate performance trends.
            </p>
          )}
        </div>

        <div className="dashboard-card flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ads performance</p>
              <h3 className="text-lg font-semibold text-slate-900">Campaign finance snapshot</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {formatNumber(adsPerformance?.totals?.campaigns ?? 0)} campaigns
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm text-slate-700">
            <div>
              <dt className="font-semibold">Active</dt>
              <dd className="text-lg font-semibold text-slate-900">
                {formatNumber(adsPerformance?.totals?.activeCampaigns ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Spend (window)</dt>
              <dd className="text-lg font-semibold text-slate-900">
                {formatCurrencyFromCents(adsPerformance?.totals?.spendCents ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Avg. CTR</dt>
              <dd className="text-lg font-semibold text-slate-900">
                {formatPercentage((adsPerformance?.totals?.averageCtr ?? 0) * 100)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Avg. CPA</dt>
              <dd className="text-lg font-semibold text-slate-900">
                {formatCurrencyFromCents(adsPerformance?.totals?.averageCpaCents ?? 0)}
              </dd>
            </div>
          </dl>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top campaigns</p>
            {adsPerformance?.topCampaigns?.length ? (
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {adsPerformance.topCampaigns.map((campaign) => (
                  <li key={campaign.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{campaign.name}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-500">{campaign.status}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary">
                        Score {campaign.performanceScore?.toFixed?.(3) ?? '0.000'}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-3 text-xs text-slate-600">
                      <span>CTR {formatPercentage((campaign.ctr ?? 0) * 100)}</span>
                      <span>CPC {formatCurrencyFromCents(campaign.cpcCents ?? 0)}</span>
                      <span>CPA {formatCurrencyFromCents(campaign.cpaCents ?? 0)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No campaign insights available. Promote a creation to start capturing ads analytics.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

CreationAnalyticsDashboard.propTypes = {
  token: PropTypes.string
};
