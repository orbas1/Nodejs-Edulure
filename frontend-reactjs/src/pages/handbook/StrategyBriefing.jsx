import { useEffect, useMemo, useState } from 'react';

import strategyBriefingApi from '../../api/strategyBriefingApi.js';

function formatCurrency(value, currency) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
      maximumFractionDigits: 0
    }).format(value);
  } catch (error) {
    return `${currency ?? 'GBP'} ${value.toLocaleString()}`;
  }
}

function PillarCard({ pillar }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{pillar.pillar}</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {(pillar.narratives ?? []).map((narrative, index) => (
              <li key={`${pillar.pillar}-${index}`}>{narrative}</li>
            ))}
          </ul>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
          Pillar
        </span>
      </header>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {(pillar.metrics ?? []).map((metric) => (
          <li key={metric.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/80 p-3">
            <span className="font-semibold text-slate-900">{metric.label}</span>
            <span className="text-xs uppercase tracking-wide text-slate-400">
              {metric.baseline ?? '—'} → {metric.target ?? '—'} {metric.unit}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function StakeholderCard({ stakeholder }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{stakeholder.title}</h3>
      <p className="mt-2 text-sm text-slate-600">{stakeholder.summary}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(stakeholder.channels ?? []).map((channel) => (
          <span key={`${stakeholder.id}-channel-${channel}`} className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            {channel}
          </span>
        ))}
      </div>
      <div className="mt-3 space-y-1 text-xs text-slate-500">
        <p className="font-semibold uppercase tracking-wide text-slate-400">Evidence</p>
        <ul className="space-y-1">
          {(stakeholder.evidence ?? []).map((item) => (
            <li key={`${stakeholder.id}-evidence-${item}`}>{item}</li>
          ))}
        </ul>
      </div>
      {stakeholder.callToAction ? (
        <p className="mt-3 rounded-xl bg-primary/5 p-3 text-xs font-semibold text-primary">
          {stakeholder.callToAction}
        </p>
      ) : null}
    </article>
  );
}

function MessagingCard({ message, metricIndex }) {
  const supportingMetrics = (message.evidence ?? []).map((metricKey) => metricIndex.get(metricKey)).filter(Boolean);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{message.pillar}</p>
          <h3 className="text-base font-semibold text-slate-900">{message.summary}</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Narrative
        </span>
      </header>
      <div className="mt-4 space-y-2 text-sm text-slate-600">
        {supportingMetrics.map((metric) => (
          <div key={`metric-${metric.id}`} className="rounded-2xl border border-slate-100 bg-white/80 p-3">
            <p className="font-semibold text-slate-900">{metric.label}</p>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Baseline {metric.baseline ?? '—'} → Target {metric.target ?? '—'} {metric.unit}
            </p>
          </div>
        ))}
      </div>
      {message.nextSteps ? (
        <p className="mt-4 text-sm text-slate-600">Next steps: {message.nextSteps}</p>
      ) : null}
    </article>
  );
}

export default function StrategyBriefing() {
  const [state, setState] = useState({ status: 'idle', data: null, error: null });
  const [pillarFilter, setPillarFilter] = useState('all');

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    strategyBriefingApi
      .fetchBriefing({ signal: controller.signal })
      .then((data) => {
        setState({ status: 'loaded', data, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        setState({ status: 'error', data: null, error });
      });
    return () => controller.abort();
  }, []);

  const briefing = state.data ?? {
    metadata: {},
    valuation: {},
    stakeholders: [],
    messaging: [],
    cadences: [],
    strategyPillars: []
  };

  const valuation = briefing.valuation ?? {};
  const filteredPillars = useMemo(() => {
    if (pillarFilter === 'all') {
      return briefing.strategyPillars ?? [];
    }
    return (briefing.strategyPillars ?? []).filter((pillar) => pillar.pillar === pillarFilter);
  }, [briefing.strategyPillars, pillarFilter]);

  const metricIndex = useMemo(() => {
    const index = new Map();
    (briefing.strategyPillars ?? []).forEach((pillar) => {
      (pillar.metrics ?? []).forEach((metric) => {
        if (metric?.id) {
          index.set(metric.id, metric);
        }
      });
    });
    return index;
  }, [briefing.strategyPillars]);

  const currencyFormatter = useMemo(() => {
    const currency = briefing.metadata?.currency ?? valuation.currency;
    return (value) => formatCurrency(value, currency);
  }, [briefing.metadata?.currency, valuation.currency]);

  const valuationMidpoint = currencyFormatter(valuation.midpoint);
  const valuationLow = currencyFormatter(Array.isArray(valuation.range) ? valuation.range[0] : undefined);
  const valuationHigh = currencyFormatter(Array.isArray(valuation.range) ? valuation.range[1] : undefined);

  const pillarOptions = useMemo(() => {
    const options = new Set((briefing.strategyPillars ?? []).map((pillar) => pillar.pillar));
    return ['all', ...Array.from(options)];
  }, [briefing.strategyPillars]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <header className="space-y-3 text-slate-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Annex A56</p>
        <h1 className="text-3xl font-semibold text-slate-900">Strategy & valuation briefing</h1>
        <p className="text-sm text-slate-600">
          Align valuation narratives, stakeholder messaging, and Annex metrics before executive or investor communications.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          {briefing.metadata?.updatedAt ? <span>Updated {new Date(briefing.metadata.updatedAt).toLocaleString()}</span> : null}
          {valuationMidpoint ? <span>Midpoint {valuationMidpoint}</span> : null}
          {valuationLow && valuationHigh ? <span>Range {valuationLow} – {valuationHigh}</span> : null}
        </div>
      </header>

      {state.status === 'loading' ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
          Loading strategy briefing…
        </div>
      ) : null}
      {state.status === 'error' ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6 text-sm text-rose-600">
          Unable to load the strategy briefing. Refresh to try again.
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
        <header className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Stakeholder messaging</h2>
            <p className="text-sm text-slate-600">
              Tailor narratives for executives, operations, and investors using Annex-backed evidence.
            </p>
          </div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Filter by pillar
            <select
              className="mt-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
              value={pillarFilter}
              onChange={(event) => setPillarFilter(event.target.value)}
            >
              {pillarOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All pillars' : option}
                </option>
              ))}
            </select>
          </label>
        </header>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(briefing.stakeholders ?? []).map((stakeholder) => (
            <StakeholderCard key={stakeholder.id} stakeholder={stakeholder} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
        <header className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Pillar narratives</h2>
            <p className="text-sm text-slate-600">
              Annex strategy pillars paired with seeded metrics and narrative summaries.
            </p>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {(filteredPillars ?? []).length} pillars
          </span>
        </header>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filteredPillars.map((pillar) => (
            <PillarCard key={pillar.pillar} pillar={pillar} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Briefing cadences</h2>
        <p className="text-sm text-slate-600">
          Track how frequently each Annex metric is reviewed with stakeholders.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3 text-left">Cadence</th>
                <th scope="col" className="px-4 py-3 text-left">Metric</th>
                <th scope="col" className="px-4 py-3 text-left">Owner</th>
                <th scope="col" className="px-4 py-3 text-left">Baseline → Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(briefing.cadences ?? []).map((cadence) => {
                const metric = cadence.metric ?? metricIndex.get(cadence.metricKey);
                return (
                  <tr key={cadence.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{cadence.cadence}</td>
                    <td className="px-4 py-3">{metric?.label ?? cadence.label}</td>
                    <td className="px-4 py-3">{cadence.owner ?? '—'}</td>
                    <td className="px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
                      {metric?.baseline ?? '—'} → {metric?.target ?? '—'} {metric?.unit}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Narrative highlights</h2>
        <p className="text-sm text-slate-600">
          Use these summaries when communicating with leadership, operations, or investors.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(briefing.messaging ?? []).map((message) => (
            <MessagingCard key={message.id} message={message} metricIndex={metricIndex} />
          ))}
        </div>
      </section>
    </div>
  );
}
