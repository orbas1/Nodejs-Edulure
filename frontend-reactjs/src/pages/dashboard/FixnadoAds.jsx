import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';

const ALLOWED_ROLES = new Set(['instructor', 'admin']);

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1
});

const integerFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

function formatCompactNumber(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || Number.isNaN(numeric) || numeric <= 0) {
    return '0';
  }
  return compactNumberFormatter.format(numeric);
}

function formatInteger(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
    return '0';
  }
  return integerFormatter.format(Math.round(numeric));
}

function formatDateLabel(isoString) {
  if (!isoString) return 'Not yet synced';
  try {
    const parsed = new Date(isoString);
    if (Number.isNaN(parsed.getTime())) {
      return typeof isoString === 'string' ? isoString : 'Not yet synced';
    }
    return dateFormatter.format(parsed);
  } catch (error) {
    console.warn('Failed to format date label', error);
    return 'Not yet synced';
  }
}

function Chip({ children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-dark">
      {children}
    </span>
  );
}

Chip.propTypes = {
  children: PropTypes.node.isRequired
};

export default function FixnadoAds() {
  const { role, dashboard, refresh } = useOutletContext();
  const adsRaw = dashboard?.ads ?? null;
  const ads = useMemo(() => {
    if (!adsRaw || typeof adsRaw !== 'object') return null;
    const asArray = (value) => (Array.isArray(value) ? value : []);
    const asObject = (value) => (value && typeof value === 'object' ? value : {});

    const sanitizeCampaign = (campaign) => {
      const safeCampaign = asObject(campaign);
      const metrics = asObject(safeCampaign.metrics);
      const placement = asObject(safeCampaign.placement);
      const targeting = asObject(safeCampaign.targeting);
      const creative = asObject(safeCampaign.creative);

      return {
        ...safeCampaign,
        metrics: {
          impressions: Number(metrics.impressions ?? 0),
          clicks: Number(metrics.clicks ?? 0),
          conversions: Number(metrics.conversions ?? 0),
          revenueFormatted: metrics.revenueFormatted ?? '—',
          roas: metrics.roas ?? null,
          lastSyncedAt: metrics.lastSyncedAt ?? null
        },
        placement: {
          ...placement,
          tags: asArray(placement.tags)
        },
        targeting: {
          keywords: asArray(targeting.keywords),
          audiences: asArray(targeting.audiences),
          locations: asArray(targeting.locations),
          languages: asArray(targeting.languages)
        },
        creative: {
          headline: creative.headline ?? 'Untitled creative',
          description: creative.description ?? 'Add a compelling description to improve engagement.',
          url: creative.url ?? null
        },
        spend: asObject(safeCampaign.spend),
        dailyBudget: asObject(safeCampaign.dailyBudget)
      };
    };

    return {
      summary: asObject(adsRaw.summary),
      active: asArray(adsRaw.active).map(sanitizeCampaign),
      experiments: asArray(adsRaw.experiments).map(asObject),
      placements: asArray(adsRaw.placements).map((placement) => ({
        ...asObject(placement),
        tags: asArray(placement?.tags)
      })),
      targeting: {
        summary: adsRaw.targeting?.summary ?? '',
        keywords: asArray(adsRaw.targeting?.keywords),
        audiences: asArray(adsRaw.targeting?.audiences),
        locations: asArray(adsRaw.targeting?.locations),
        languages: asArray(adsRaw.targeting?.languages)
      },
      tags: asArray(adsRaw.tags).map(asObject)
    };
  }, [adsRaw]);

  if (role && !ALLOWED_ROLES.has(role)) {
    return (
      <DashboardStateMessage
        title="Restricted access"
        description="Switch to an instructor or admin workspace to manage Fixnado Ads placements and experiments."
        actionLabel="Return"
        onAction={() => window.history.back()}
      />
    );
  }

  if (!ads) {
    return (
      <DashboardStateMessage
        title="Fixnado Ads workspace offline"
        description="Performance data hasn't synced from your ad accounts yet. Refresh after connecting channels."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const hasSignals =
    (ads.active?.length ?? 0) +
      (ads.placements?.length ?? 0) +
      (ads.experiments?.length ?? 0) +
      (ads.tags?.length ?? 0) >
    0;

  if (!hasSignals) {
    return (
      <DashboardStateMessage
        title="No ads telemetry yet"
        description="Launch your first Fixnado Ads placement or import an existing campaign to populate performance analytics."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const summary = ads.summary ?? {};

  const overviewMetrics = [
    {
      title: 'Active campaigns',
      value: summary.activeCampaigns ?? 0,
      hint: 'Connected workspaces'
    },
    {
      title: 'Lifetime spend',
      value: summary.totalSpend?.formatted ?? '—',
      hint: summary.totalSpend?.currency ?? 'Multi-currency'
    },
    {
      title: 'Avg CTR',
      value: summary.averageCtr ?? '—',
      hint: `${formatCompactNumber(summary.totalImpressions ?? 0)} impressions`
    },
    {
      title: 'Avg CPC',
      value: summary.averageCpc ?? '—',
      hint: summary.averageCpc !== '—' ? 'Across active placements' : 'Awaiting click volume'
    },
    {
      title: 'Avg CPA',
      value: summary.averageCpa ?? '—',
      hint: summary.averageCpa !== '—' ? 'Per acquisition' : 'Awaiting conversions'
    },
    {
      title: 'ROAS',
      value: summary.roas ?? '—',
      hint: summary.roas !== '—' ? 'Return on ad spend' : 'Insufficient revenue data'
    }
  ];

  const activeCampaigns = ads.active ?? [];
  const experiments = ads.experiments ?? [];
  const placements = ads.placements ?? [];
  const targeting = ads.targeting ?? { keywords: [], audiences: [], locations: [], languages: [], summary: '' };
  const tags = ads.tags ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Fixnado Ads</h1>
          <p className="mt-2 text-sm text-slate-600">
            Orchestrate placements, fine-tune targeting, and monitor revenue quality in real time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="dashboard-pill px-5 py-2"
            onClick={() => refresh?.()}
          >
            Refresh metrics
          </button>
          <button
            type="button"
            className="dashboard-primary-pill px-5 py-2"
            onClick={() => window.open('/ads/campaigns', '_blank', 'noopener')}
          >
            Launch campaign
          </button>
        </div>
      </div>

      <section className="dashboard-section">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Performance overview</h2>
              <p className="mt-1 text-xs text-slate-500">
                Last synced {formatDateLabel(summary.lastSyncedAt ?? summary.lastSyncedLabel)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <Chip>{formatInteger(summary.totalImpressions ?? 0)} impressions</Chip>
              <Chip>{formatInteger(summary.totalClicks ?? 0)} clicks</Chip>
              <Chip>{formatInteger(summary.totalConversions ?? 0)} conversions</Chip>
            </div>
          </div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {overviewMetrics.map((metric) => (
            <div
              key={metric.title}
              className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-primary/5 p-5 shadow-sm transition hover:border-primary/40"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-dark">{metric.title}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{metric.value}</p>
              <p className="mt-2 text-xs text-slate-500">{metric.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Active placements</h2>
            <p className="mt-1 text-sm text-slate-600">
              Detailed telemetry across surfaces, budgets, and creative packages powering your funnel.
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-6">
          {activeCampaigns.map((campaign) => (
            <article
              key={campaign.id}
              className="rounded-3xl border border-primary/15 bg-white/90 p-6 shadow-sm backdrop-blur transition hover:border-primary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">{campaign.objective ?? 'Campaign objective'}</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">{campaign.name ?? 'Untitled campaign'}</h3>
                  <p className="mt-1 text-xs text-slate-500">{campaign.placement.scheduleLabel ?? 'Schedule syncing'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip>{campaign.status === 'active' ? 'Live' : campaign.status ?? 'Draft'}</Chip>
                  {campaign.metrics.roas ? <Chip>{campaign.metrics.roas} ROAS</Chip> : null}
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lifetime spend</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{campaign.spend.label ?? '—'}</p>
                  <p className="mt-1 text-xs text-slate-500">{campaign.dailyBudget.label ?? 'Budget syncing'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Click health</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{campaign.ctr ?? '—'}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {(campaign.cpc ?? '—')} · {(campaign.cpa ?? '—')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Volume</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatInteger(campaign.metrics.impressions)} impressions
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatInteger(campaign.metrics.clicks)} clicks · {formatInteger(campaign.metrics.conversions)} conversions
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revenue</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{campaign.metrics.revenueFormatted}</p>
                  <p className="mt-1 text-xs text-slate-500">Synced {formatDateLabel(campaign.metrics.lastSyncedAt)}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {campaign.placement.tags.map((tag) => (
                  <Chip key={`${campaign.id}-${tag}`}>{tag}</Chip>
                ))}
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Targeting</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {campaign.targeting.keywords.slice(0, 4).map((keyword) => (
                      <span key={`${campaign.id}-kw-${keyword}`} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                        {keyword}
                      </span>
                    ))}
                    {campaign.targeting.audiences.slice(0, 3).map((audience) => (
                      <span key={`${campaign.id}-aud-${audience}`} className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-600">
                        {audience}
                      </span>
                    ))}
                    {campaign.targeting.locations.slice(0, 3).map((location) => (
                      <span key={`${campaign.id}-loc-${location}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                        {location}
                      </span>
                    ))}
                    {campaign.targeting.languages.slice(0, 2).map((language) => (
                      <span key={`${campaign.id}-lang-${language}`} className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-600">
                        {language}
                      </span>
                    ))}
                    {campaign.targeting.keywords.length +
                      campaign.targeting.audiences.length +
                      campaign.targeting.locations.length +
                      campaign.targeting.languages.length ===
                      0 && <span className="text-xs text-slate-400">No targeting dimensions configured yet.</span>}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Creative</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{campaign.creative.headline}</p>
                  <p className="mt-2 text-xs text-slate-600">{campaign.creative.description}</p>
                  {campaign.creative.url && (
                    <a
                      href={campaign.creative.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary-dark"
                    >
                      Preview creative
                      <span aria-hidden="true">→</span>
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="dashboard-section lg:col-span-3">
          <h2 className="text-lg font-semibold text-slate-900">Experiment lab</h2>
          <p className="mt-1 text-sm text-slate-600">
            Campaign experiments compare creative and placement iterations against prior conversions.
          </p>
          <ul className="mt-4 space-y-4">
            {experiments.map((experiment) => (
              <li key={experiment.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">{experiment.status}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{experiment.name}</p>
                  </div>
                  {experiment.conversionsDeltaLabel && (
                    <Chip>{experiment.conversionsDeltaLabel} conversions</Chip>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-600">{experiment.hypothesis}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Last observed {formatDateLabel(experiment.lastObservedAt ?? experiment.lastObservedLabel)}
                </p>
                {experiment.baselineLabel && (
                  <p className="mt-1 text-xs text-slate-500">Baseline · {experiment.baselineLabel}</p>
                )}
              </li>
            ))}
            {experiments.length === 0 && (
              <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                Launch a creative or placement experiment to surface lift against your previous control sample.
              </li>
            )}
          </ul>
        </section>

        <section className="dashboard-section lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Targeting intelligence</h2>
          <p className="mt-1 text-sm text-slate-600">{targeting.summary}</p>
          <div className="mt-4 space-y-4 text-xs text-slate-600">
            <div>
              <p className="font-semibold text-slate-800">Keywords</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {targeting.keywords.map((keyword) => (
                  <span key={`kw-${keyword}`} className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                    {keyword}
                  </span>
                ))}
                {targeting.keywords.length === 0 && <span className="text-slate-400">No keyword targeting configured</span>}
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Audiences</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {targeting.audiences.map((audience) => (
                  <span key={`aud-${audience}`} className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-600">
                    {audience}
                  </span>
                ))}
                {targeting.audiences.length === 0 && <span className="text-slate-400">No audience cohorts connected</span>}
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Regions &amp; languages</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {targeting.locations.map((location) => (
                  <span key={`loc-${location}`} className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                    {location}
                  </span>
                ))}
                {targeting.languages.map((language) => (
                  <span key={`lang-${language}`} className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-600">
                    {language}
                  </span>
                ))}
                {targeting.locations.length === 0 && targeting.languages.length === 0 && (
                  <span className="text-slate-400">No geo or locale filters applied</span>
                )}
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Operational tags</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={`${tag.category ?? 'tag'}-${tag.label ?? 'label'}`}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600"
                  >
                    {(tag.category ?? 'Tag').trim()}: {(tag.label ?? 'Unspecified').trim()}
                  </span>
                ))}
                {tags.length === 0 && <span className="text-slate-400">No tags available</span>}
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Placement board</h2>
        <p className="mt-1 text-sm text-slate-600">
          Review channel coverage, scheduling, and optimisation focus across every campaign placement.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {placements.map((placement) => (
            <div key={placement.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">{placement.name ?? 'Untitled placement'}</h3>
                <Chip>{placement.status ?? 'Draft'}</Chip>
              </div>
              <p className="mt-1 text-xs text-slate-500">{[placement.surface, placement.slot].filter(Boolean).join(' · ') || 'Surface syncing'}</p>
              <p className="mt-2 text-xs font-semibold text-slate-700">{placement.budgetLabel ?? 'Budget syncing'}</p>
              <p className="mt-1 text-xs text-slate-500">{placement.optimisation ?? 'Optimisation pending'}</p>
              <p className="mt-1 text-xs text-slate-500">{placement.scheduleLabel ?? 'Schedule pending'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {placement.tags.map((tag) => (
                  <span key={`${placement.id}-${tag}`} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
                    {tag}
                  </span>
                ))}
                {placement.tags.length === 0 && (
                  <span className="text-[11px] text-slate-400">No placement tags</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
