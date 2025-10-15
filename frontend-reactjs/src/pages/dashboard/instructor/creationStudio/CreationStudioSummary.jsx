import PropTypes from 'prop-types';
import {
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
  MinusSmallIcon,
  RocketLaunchIcon,
  SignalIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

import { CREATION_TYPE_LABELS, CREATION_TYPE_ORDER } from './creationStudioUtils.js';

const CARD_CONFIG = [
  {
    id: 'drafts',
    label: 'Active drafts',
    description: 'Projects still in authoring before review handoff.',
    icon: RocketLaunchIcon,
    tone: 'bg-primary/5 text-primary border-primary/30'
  },
  {
    id: 'awaitingReview',
    label: 'Awaiting review',
    description: 'Queued for compliance or peer approval.',
    icon: ArrowPathIcon,
    tone: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  {
    id: 'launchReady',
    label: 'Launch ready',
    description: 'Approved or published deliverables.',
    icon: ChartBarIcon,
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    id: 'collaborators',
    label: 'Collaborators',
    description: 'Active contributors across studio projects.',
    icon: UsersIcon,
    tone: 'bg-slate-50 text-slate-700 border-slate-200'
  },
  {
    id: 'liveSessions',
    label: 'Live collaboration',
    description: 'Real-time co-editing sessions currently online.',
    icon: SignalIcon,
    tone: 'bg-sky-50 text-sky-700 border-sky-200'
  }
];

const PRIORITY_STYLES = {
  high: 'border-rose-200 bg-rose-50 text-rose-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-slate-200 bg-slate-100 text-slate-600'
};

const SIGNAL_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  useGrouping: false
});

function resolveSignalWeight(weight) {
  const numericWeight = Number(weight ?? 0);
  if (!Number.isFinite(numericWeight)) {
    return {
      displayValue: '0',
      tone: 'text-slate-500',
      Icon: MinusSmallIcon
    };
  }

  if (numericWeight > 0) {
    return {
      displayValue: `+${SIGNAL_NUMBER_FORMATTER.format(Math.round(Math.abs(numericWeight)))}`,
      tone: 'text-emerald-600',
      Icon: ArrowUpIcon
    };
  }

  if (numericWeight < 0) {
    return {
      displayValue: `-${SIGNAL_NUMBER_FORMATTER.format(Math.round(Math.abs(numericWeight)))}`,
      tone: 'text-rose-600',
      Icon: ArrowDownIcon
    };
  }

  return {
    displayValue: '0',
    tone: 'text-slate-500',
    Icon: MinusSmallIcon
  };
}

function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return null;
  }
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const diffMs = Date.now() - date.getTime();
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;

  if (diffMs < minute) return 'just now';
  if (diffMs < hour) return `${Math.max(1, Math.round(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.max(1, Math.round(diffMs / hour))}h ago`;
  return `${Math.max(1, Math.round(diffMs / day))}d ago`;
}

function SummaryCard({ card, value }) {
  const Icon = card.icon;
  return (
    <div
      className={`flex flex-col justify-between rounded-3xl border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${card.tone}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{card.label}</p>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/60">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm opacity-75">{card.description}</p>
    </div>
  );
}

SummaryCard.propTypes = {
  card: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    tone: PropTypes.string.isRequired
  }).isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

function formatTypeBreakdown(summary) {
  const breakdown = summary?.typeBreakdown ?? {};
  const ordered = CREATION_TYPE_ORDER.map((type) => [type, breakdown[type] ?? 0]);
  const extras = Object.entries(breakdown).filter(([type]) => !CREATION_TYPE_ORDER.includes(type));
  return [...ordered, ...extras].filter(([, count]) => count > 0);
}

export default function CreationStudioSummary({
  summary,
  recommendations,
  recommendationsMeta,
  recommendationsEvaluation,
  recommendationsLoading,
  recommendationsError
}) {
  const breakdownEntries = formatTypeBreakdown(summary);
  const total = summary.total ?? 0;
  const flagDisabled = recommendationsEvaluation ? recommendationsEvaluation.enabled === false : false;
  const latestRun = recommendationsMeta?.generatedAt ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        {CARD_CONFIG.map((card) => (
          <SummaryCard key={card.id} card={card} value={summary[card.id] ?? 0} />
        ))}
      </section>

      <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Creation mix</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">Active production catalogue</h3>
        <p className="mt-2 text-sm text-slate-600">
          Track how creation capacity is distributed across courses, e-books, communities, and campaign-ready ad assets. Use
          this mix to steer staffing and go-to-market campaigns.
        </p>

        {breakdownEntries.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No creations have been published yet. Start a draft to populate catalogue trends.
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {breakdownEntries.map(([type, count]) => {
              const percent = total > 0 ? Math.round((count / total) * 100) : 0;
              const barWidth = total > 0 ? Math.min(100, Math.max(percent, count > 0 ? 4 : 0)) : 0;
              const label = CREATION_TYPE_LABELS[type] ?? type.replace(/_/g, ' ');
              return (
                <li key={type}>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span className="capitalize">{label}</span>
                    <span>
                      {count} · {percent}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <section className="mt-8 border-t border-slate-200 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Recommended next steps</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Focus the production pipeline</h3>
          <p className="mt-2 text-sm text-slate-600">
            Intelligent scoring prioritises reviews, launch tasks, and campaign optimisation so the team can act on the highest
            impact work first.
          </p>

          {recommendationsError ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {recommendationsError.message}
            </div>
          ) : recommendationsLoading ? (
            <ul className="mt-4 space-y-3" aria-busy="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <li
                  key={`recommendation-skeleton-${index}`}
                  className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="h-4 w-1/2 rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-full rounded bg-slate-200" />
                  <div className="mt-1 h-3 w-2/3 rounded bg-slate-200" />
                </li>
              ))}
            </ul>
          ) : flagDisabled ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              Personalised recommendations are disabled for this tenant.{' '}
              {recommendationsEvaluation?.reason ?? 'Contact an administrator to enable the feature flag.'}
            </div>
          ) : recommendations.length > 0 ? (
            <ul className="mt-4 space-y-4">
              {recommendations.map((recommendation) => {
                const priorityTone = PRIORITY_STYLES[recommendation.priority] ?? PRIORITY_STYLES.low;
                const relativeTime = formatRelativeTime(recommendation.recommendedAt);
                return (
                  <li
                    key={recommendation.projectPublicId ?? recommendation.projectId}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{recommendation.action.label}</p>
                        <p className="mt-1 text-xs text-slate-600">{recommendation.action.instructions}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${priorityTone}`}>
                        {recommendation.priority === 'high'
                          ? 'High priority'
                          : recommendation.priority === 'medium'
                          ? 'Medium priority'
                          : 'Low priority'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700">
                        Score {Number(recommendation.score ?? 0).toFixed(1)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1">{recommendation.projectTitle}</span>
                      {relativeTime ? (
                        <span className="text-slate-500">Generated {relativeTime}</span>
                      ) : null}
                    </div>
                    {recommendation.signals.length > 0 ? (
                      <ul className="mt-3 space-y-1 text-xs text-slate-600">
                        {recommendation.signals.slice(0, 3).map((signal) => (
                          <li
                            key={`${recommendation.projectPublicId ?? recommendation.projectId}:${signal.code}`}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="capitalize">{signal.code.replace(/_/g, ' ')}</span>
                            {(() => {
                              const { displayValue, tone, Icon } = resolveSignalWeight(signal.weight);
                              return (
                                <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-semibold ${tone}`}>
                                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                  {displayValue}
                                </span>
                              );
                            })()}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No personalised actions yet. Publish projects or request reviews to generate prioritised insights.
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            {latestRun ? `Last generated ${formatRelativeTime(latestRun)}.` : 'Recommendations refresh automatically as your pipeline evolves.'}
            {recommendationsMeta?.history?.length
              ? ` Historical runs recorded: ${recommendationsMeta.history.length}.`
              : ''}
          </p>
        </section>
      </aside>
    </div>
  );
}

CreationStudioSummary.propTypes = {
  summary: PropTypes.shape({
    drafts: PropTypes.number,
    awaitingReview: PropTypes.number,
    launchReady: PropTypes.number,
    collaborators: PropTypes.number,
    liveSessions: PropTypes.number,
    total: PropTypes.number,
    typeBreakdown: PropTypes.objectOf(PropTypes.number)
  }),
  recommendations: PropTypes.arrayOf(
    PropTypes.shape({
      projectPublicId: PropTypes.string,
      projectTitle: PropTypes.string,
      priority: PropTypes.string,
      action: PropTypes.shape({
        code: PropTypes.string,
        label: PropTypes.string,
        instructions: PropTypes.string
      }),
      score: PropTypes.number,
      recommendedAt: PropTypes.string,
      signals: PropTypes.arrayOf(
        PropTypes.shape({
          code: PropTypes.string,
          weight: PropTypes.number,
          detail: PropTypes.object
        })
      )
    })
  ),
  recommendationsMeta: PropTypes.shape({
    algorithmVersion: PropTypes.string,
    generatedAt: PropTypes.string,
    tenantId: PropTypes.string,
    totalProjectsEvaluated: PropTypes.number,
    history: PropTypes.array
  }),
  recommendationsEvaluation: PropTypes.shape({
    enabled: PropTypes.bool,
    reason: PropTypes.string
  }),
  recommendationsLoading: PropTypes.bool,
  recommendationsError: PropTypes.instanceOf(Error)
};

CreationStudioSummary.defaultProps = {
  summary: {
    drafts: 0,
    awaitingReview: 0,
    launchReady: 0,
    collaborators: 0,
    liveSessions: 0,
    total: 0,
    typeBreakdown: {}
  },
  recommendations: [],
  recommendationsMeta: null,
  recommendationsEvaluation: null,
  recommendationsLoading: false,
  recommendationsError: null
};
