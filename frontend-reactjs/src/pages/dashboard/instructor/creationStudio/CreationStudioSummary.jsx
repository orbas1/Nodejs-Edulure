import PropTypes from 'prop-types';
import { ArrowPathIcon, ChartBarIcon, RocketLaunchIcon, SignalIcon, UsersIcon } from '@heroicons/react/24/outline';

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

export default function CreationStudioSummary({ summary }) {
  const breakdownEntries = formatTypeBreakdown(summary);
  const total = summary.total ?? 0;

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
  })
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
  }
};
