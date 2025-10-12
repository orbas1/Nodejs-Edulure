import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { fetchExplorerAlerts, fetchExplorerSummary } from '../api/analyticsApi.js';
import { useAuth } from '../context/AuthContext.jsx';

const RANGE_OPTIONS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 14 days', value: '14d' },
  { label: 'Last 30 days', value: '30d' }
];

const ALERT_STYLES = {
  critical: 'bg-rose-500/20 text-rose-100 border border-rose-400/40',
  warning: 'bg-amber-500/20 text-amber-100 border border-amber-400/40',
  info: 'bg-sky-500/20 text-sky-100 border border-sky-400/40'
};

function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '0%';
  }
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Math.round(Number(value ?? 0)));
}

function formatDateLabel(value) {
  if (!value) return '—';
  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimestamp(value) {
  if (!value) return '—';
  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function SummaryTile({ title, value, description }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-white shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{description}</p>
    </div>
  );
}

SummaryTile.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  description: PropTypes.string.isRequired
};

export default function Analytics() {
  const { session, isAuthenticated } = useAuth();
  const authToken = session?.tokens?.accessToken;
  const [range, setRange] = useState('7d');
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    if (!isAuthenticated) {
      setSummary(null);
      setAlerts([]);
      setLoading(false);
      setError(null);
      setLastUpdatedAt(null);
      return () => {
        isMounted = false;
        controller.abort();
      };
    }

    setLoading(true);
    setError(null);

    fetchExplorerSummary({ range, token: authToken, signal: controller.signal })
      .then((data) => {
        if (!isMounted) return;
        setSummary(data ?? null);
        setLastUpdatedAt(new Date());
      })
      .catch((err) => {
        if (!isMounted || controller.signal.aborted) return;
        const message =
          err?.status === 401
            ? 'Your session no longer has access to explorer analytics. Please sign in again.'
            : err?.message ?? 'Unable to load analytics summary';
        setError(message);
        setSummary(null);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    fetchExplorerAlerts({ token: authToken, signal: controller.signal, includeResolved: false })
      .then((data) => {
        if (!isMounted) return;
        setAlerts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!isMounted || controller.signal.aborted) return;
        if (err?.status === 401) {
          setAlerts([]);
          return;
        }
        setAlerts([]);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [range, authToken, isAuthenticated, refreshCounter]);

  const summaryTiles = useMemo(
    () => [
      {
        key: 'searchVolume',
        title: 'Search volume',
        value: summary ? formatNumber(summary?.totals?.searches ?? 0) : '—',
        description: 'Explorer searches captured in the selected window'
      },
      {
        key: 'uniqueSearchers',
        title: 'Unique searchers',
        value: summary ? formatNumber(summary?.totals?.uniqueUsers ?? 0) : '—',
        description: 'Distinct signed-in users performing explorer searches'
      },
      {
        key: 'zeroResultRate',
        title: 'Zero-result rate',
        value: summary ? formatPercent(summary?.totals?.zeroResultRate ?? 0, 1) : '—',
        description: 'Percentage of searches that returned no results'
      },
      {
        key: 'ctr',
        title: 'Click-through rate',
        value: summary ? formatPercent(summary?.totals?.clickThroughRate ?? 0, 1) : '—',
        description: 'Average click-through rate across visible results'
      }
    ],
    [summary]
  );

  const sanitizedTimeseries = useMemo(() => {
    if (!summary?.timeseries) return [];
    return summary.timeseries.map((point) => ({
      date: point.date,
      searches: Number(point.searches ?? 0),
      clickThroughRate: Number(point.clickThroughRate ?? 0),
      zeroResultRate: Number(point.zeroResultRate ?? 0),
      averageLatencyMs: Number(point.averageLatencyMs ?? 0)
    }));
  }, [summary]);

  const ctrSeries = useMemo(
    () =>
      sanitizedTimeseries.map((point) => ({
        date: point.date,
        clickThroughRate: point.clickThroughRate,
        zeroResultRate: point.zeroResultRate
      })),
    [sanitizedTimeseries]
  );

  const entityBreakdown = useMemo(() => {
    if (!summary?.entityBreakdown) return [];
    return summary.entityBreakdown.map((entity) => ({
      entityType: entity.entityType ?? 'unknown',
      searches: Number(entity.searches ?? 0),
      clickThroughRate: Number(entity.clickThroughRate ?? 0),
      zeroResultRate: Number(entity.zeroResultRate ?? 0),
      displayedResults: Number(entity.displayedResults ?? 0),
      clicks: Number(entity.clicks ?? 0),
      averageLatencyMs: Math.round(Number(entity.averageLatencyMs ?? 0))
    }));
  }, [summary]);

  const topQueries = summary?.topQueries ?? [];
  const zeroResultQueries = summary?.zeroResultQueries ?? [];
  const searchForecast = summary?.forecasts?.searchVolume ?? [];
  const ctrForecast = summary?.forecasts?.clickThroughRate ?? [];

  const handleRefresh = () => {
    setRefreshCounter((value) => value + 1);
  };

  const averageLatency = summary?.totals?.averageLatencyMs ?? null;
  const hasEntityBreakdown = entityBreakdown.length > 0;

  return (
    <section className="bg-slate-950 text-white">
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_rgba(15,23,42,1))]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-400">Explorer Intelligence</p>
              <h1 className="mt-3 text-4xl font-semibold text-white">Search & engagement performance</h1>
              <p className="mt-4 max-w-2xl text-sm text-slate-300">
                Track explorer demand, zero-result hotspots, and campaign effectiveness across the Edulure discovery funnel.
                Metrics update in near real time so revenue, product, and operations teams can steer experiments with confidence.
              </p>
            </div>
            {isAuthenticated ? (
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  {RANGE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRange(option.value)}
                      aria-pressed={range === option.value}
                      disabled={loading && range === option.value}
                      className={clsx(
                        'rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
                        range === option.value
                          ? 'border-sky-400 bg-sky-500/20 text-white'
                          : 'border-slate-700 text-slate-300 hover:border-sky-500 hover:text-white disabled:opacity-70'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Refresh data
                </button>
              </div>
            ) : (
              <div className="rounded-full border border-slate-700/70 px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Sign in required
              </div>
            )}
          </div>

          {isAuthenticated && lastUpdatedAt && (
            <p className="mt-4 text-xs text-slate-400">Last refreshed {formatTimestamp(lastUpdatedAt)}.</p>
          )}

          {isAuthenticated && error && (
            <div className="mt-8 rounded-3xl border border-red-400/40 bg-red-500/10 px-5 py-4 text-sm text-red-200" role="alert">
              {error}
            </div>
          )}

          {isAuthenticated && (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {summaryTiles.map((tile) => (
                <SummaryTile key={tile.key} title={tile.title} value={tile.value} description={tile.description} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-14">
        {!isAuthenticated && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-200">
            <h2 className="text-lg font-semibold text-white">Authenticate to unlock analytics</h2>
            <p className="mt-2 text-slate-400">
              Explorer analytics includes live CTR, zero-result, and campaign attribution data. Sign in with a provider or
              operations account that has analytics permissions to review the dashboards.
            </p>
          </div>
        )}

        {isAuthenticated && loading && (
          <div className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 md:grid-cols-2">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-800/70" />
            ))}
            <div className="h-64 animate-pulse rounded-2xl bg-slate-800/70 md:col-span-2" />
          </div>
        )}

        {isAuthenticated && !loading && !error && !summary && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 px-5 py-4 text-sm text-slate-300">
            Explorer analytics will appear once the first searches have been recorded in this environment.
          </div>
        )}

        {isAuthenticated && summary && (
          <div className="space-y-12">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-inner">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Explorer activity</h2>
                  <p className="text-xs text-slate-400">
                    {summary.range?.start ? formatDateLabel(summary.range.start) : ''} –{' '}
                    {summary.range?.end ? formatDateLabel(summary.range.end) : ''}
                  </p>
                </div>
                {averageLatency !== null && (
                  <div className="rounded-full border border-slate-800 bg-slate-900/70 px-4 py-2 text-xs font-semibold text-slate-300">
                    Avg latency {Math.round(Number(averageLatency ?? 0))} ms
                  </div>
                )}
              </div>
              <div className="mt-6 grid gap-8 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <h3 className="text-sm font-semibold text-slate-200">Search volume</h3>
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sanitizedTimeseries}>
                        <defs>
                          <linearGradient id="searchGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.6} />
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                        <Area type="monotone" dataKey="searches" stroke="#38bdf8" fill="url(#searchGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <h3 className="text-sm font-semibold text-slate-200">Quality signals</h3>
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={ctrSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#94a3b8" />
                        <YAxis
                          yAxisId="left"
                          stroke="#94a3b8"
                          tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#94a3b8"
                          tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                          formatter={(value) => `${(value * 100).toFixed(2)}%`}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="clickThroughRate"
                          stroke="#34d399"
                          strokeWidth={2}
                          dot={false}
                          name="CTR"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="zeroResultRate"
                          stroke="#f97316"
                          strokeWidth={2}
                          dot={false}
                          name="Zero result rate"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-inner">
              <h2 className="text-lg font-semibold text-white">Entity breakdown</h2>
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-sm">
                  <thead className="bg-slate-900/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Entity</th>
                      <th className="px-4 py-3">Searches</th>
                      <th className="px-4 py-3">CTR</th>
                      <th className="px-4 py-3">Zero result</th>
                      <th className="px-4 py-3">Displayed results</th>
                      <th className="px-4 py-3">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {hasEntityBreakdown ? (
                      entityBreakdown.map((entity) => (
                        <tr key={entity.entityType}>
                          <td className="px-4 py-3 font-semibold capitalize">{entity.entityType}</td>
                          <td className="px-4 py-3">{formatNumber(entity.searches)}</td>
                          <td className="px-4 py-3">{formatPercent(entity.clickThroughRate ?? 0)}</td>
                          <td className="px-4 py-3">{formatPercent(entity.zeroResultRate ?? 0)}</td>
                          <td className="px-4 py-3">{formatNumber(entity.displayedResults)}</td>
                          <td className="px-4 py-3">{entity.averageLatencyMs ?? 0} ms</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-xs uppercase tracking-[0.2em] text-slate-500">
                          No entity-level analytics captured in this window.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-inner">
              <div className="grid gap-8 lg:grid-cols-2">
                <div>
                  <h2 className="text-lg font-semibold text-white">Ads performance</h2>
                  <p className="mt-2 text-xs text-slate-400">Aggregated metrics across all active campaigns.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Impressions</p>
                      <p className="mt-2 text-xl font-semibold">{formatNumber(summary?.ads?.impressions ?? 0)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Clicks</p>
                      <p className="mt-2 text-xl font-semibold">{formatNumber(summary?.ads?.clicks ?? 0)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Conversions</p>
                      <p className="mt-2 text-xl font-semibold">{formatNumber(summary?.ads?.conversions ?? 0)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">ROAS</p>
                      <p className="mt-2 text-xl font-semibold">{(summary?.ads?.roas ?? 0).toFixed(2)}x</p>
                    </div>
                  </div>
                  <div className="mt-6 h-64 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={entityBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="entityType" stroke="#94a3b8" tickFormatter={(value) => value.slice(0, 8)} />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                        <Bar dataKey="clicks" fill="#38bdf8" name="Clicks" />
                        <Bar dataKey="displayedResults" fill="#6366f1" name="Displayed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Active experiments</h2>
                    <div className="mt-4 space-y-3">
                      {(summary?.experiments ?? []).length === 0 && (
                        <p className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs text-slate-400">
                          No analytics experiments are currently active for this range.
                        </p>
                      )}
                      {summary?.experiments?.map((experiment) => (
                        <div
                          key={experiment.key}
                          className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-200"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-white">{experiment.name}</p>
                            <span
                              className={clsx(
                                'rounded-full px-3 py-1 text-xs font-semibold',
                                experiment.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                              )}
                            >
                              {experiment.enabled ? 'Active' : 'Paused'}
                            </span>
                          </div>
                          {experiment.description && (
                            <p className="mt-2 text-xs text-slate-400">{experiment.description}</p>
                          )}
                          {experiment.rolloutPercentage !== null && experiment.rolloutPercentage !== undefined && (
                            <p className="mt-3 text-xs text-slate-400">Rollout: {experiment.rolloutPercentage}%</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-white">Forecast outlook</h2>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Search volume</p>
                        <ul className="mt-3 space-y-2 text-xs text-slate-300">
                          {searchForecast.slice(0, 4).map((forecast) => (
                            <li key={`${forecast.targetDate}-${forecast.metricValue}`} className="flex justify-between gap-4">
                              <span>{formatDateLabel(forecast.targetDate)}</span>
                              <span>{formatNumber(forecast.metricValue)}</span>
                            </li>
                          ))}
                          {searchForecast.length === 0 && (
                            <li className="text-slate-500">No forecast data available.</li>
                          )}
                        </ul>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">CTR</p>
                        <ul className="mt-3 space-y-2 text-xs text-slate-300">
                          {ctrForecast.slice(0, 4).map((forecast) => (
                            <li key={`${forecast.targetDate}-${forecast.metricValue}`} className="flex justify-between gap-4">
                              <span>{formatDateLabel(forecast.targetDate)}</span>
                              <span>{formatPercent(forecast.metricValue ?? 0, 2)}</span>
                            </li>
                          ))}
                          {ctrForecast.length === 0 && (
                            <li className="text-slate-500">No forecast data available.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-inner">
              <h2 className="text-lg font-semibold text-white">Search query spotlight</h2>
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <h3 className="text-sm font-semibold text-slate-200">Most engaged queries</h3>
                  <ul className="mt-4 space-y-3 text-sm text-slate-300">
                    {topQueries.length === 0 && <li className="text-xs text-slate-500">No query volume recorded.</li>}
                    {topQueries.map((query) => (
                      <li key={query.query} className="flex items-center justify-between gap-4">
                        <span className="truncate text-slate-200">{query.query}</span>
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                          {formatNumber(query.searches)} searches
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <h3 className="text-sm font-semibold text-slate-200">Zero-result hotspots</h3>
                  <ul className="mt-4 space-y-3 text-sm text-slate-300">
                    {zeroResultQueries.length === 0 && (
                      <li className="text-xs text-slate-500">No zero-result queries detected for this range.</li>
                    )}
                    {zeroResultQueries.map((query) => (
                      <li key={query.query} className="flex items-center justify-between gap-4">
                        <span className="truncate text-slate-200">{query.query}</span>
                        <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-200">
                          {formatNumber(query.searches)} searches
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-inner">
              <h2 className="text-lg font-semibold text-white">Alerts</h2>
              <p className="mt-2 text-xs text-slate-400">
                Operational alerts highlight zero-result spikes, degraded CTR, or experiment anomalies.
              </p>
              <div className="mt-4 space-y-3">
                {alerts.length === 0 && (
                  <p className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs text-slate-400">
                    No open alerts for this period. Keep monitoring experiment performance.
                  </p>
                )}
                {alerts.map((alert) => (
                  <div
                    key={`${alert.alertCode}-${alert.detectedAt}`}
                    className={clsx(
                      'rounded-2xl px-4 py-3 text-sm text-slate-200',
                      ALERT_STYLES[alert.severity?.toLowerCase()] ?? 'border border-slate-800 bg-slate-900/70'
                    )}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold text-white">{alert.message}</p>
                      <span className="rounded-full bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                        {alert.severity ?? 'info'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      Detected {alert.detectedAt ? formatTimestamp(alert.detectedAt) : 'unknown'}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
