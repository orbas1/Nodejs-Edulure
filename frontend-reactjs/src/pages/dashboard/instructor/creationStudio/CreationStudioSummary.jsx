import PropTypes from 'prop-types';
import { ArrowPathIcon, ChartBarIcon, RocketLaunchIcon, SignalIcon, UsersIcon } from '@heroicons/react/24/outline';

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

export default function CreationStudioSummary({ summary }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {CARD_CONFIG.map((card) => (
        <SummaryCard key={card.id} card={card} value={summary[card.id] ?? 0} />
      ))}
    </section>
  );
}

CreationStudioSummary.propTypes = {
  summary: PropTypes.shape({
    drafts: PropTypes.number,
    awaitingReview: PropTypes.number,
    launchReady: PropTypes.number,
    collaborators: PropTypes.number,
    liveSessions: PropTypes.number
  })
};

CreationStudioSummary.defaultProps = {
  summary: {
    drafts: 0,
    awaitingReview: 0,
    launchReady: 0,
    collaborators: 0,
    liveSessions: 0
  }
};
