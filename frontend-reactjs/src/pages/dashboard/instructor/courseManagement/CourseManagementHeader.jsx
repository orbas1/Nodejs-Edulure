import PropTypes from 'prop-types';
import { CalendarDaysIcon, UserPlusIcon } from '@heroicons/react/24/outline';

const SUMMARY_KEYS = [
  { id: 'activeCohorts', label: 'Active cohorts' },
  { id: 'inProduction', label: 'In production' },
  { id: 'awaitingLaunch', label: 'Awaiting launch' },
  { id: 'atRisk', label: 'At risk' }
];

function SummaryStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

SummaryStat.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default function CourseManagementHeader({ onCreateBrief, onPlanCalendar, onInviteCollaborator, summary }) {
  const canCreate = typeof onCreateBrief === 'function';
  const canPlan = typeof onPlanCalendar === 'function';
  const canInvite = typeof onInviteCollaborator === 'function';
  const normalisedSummary = SUMMARY_KEYS.map((entry) => ({
    ...entry,
    value: summary[entry.id] ?? 0
  }));
  const lastUpdatedLabel = summary.lastUpdated
    ? `Synced ${summary.lastUpdated}`
    : 'Auto-refreshing every hour';
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Course portfolio</h1>
          <p className="mt-2 text-sm text-slate-600">
            Oversee cohort status, production sprints, and staffing needs. {lastUpdatedLabel}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="dashboard-primary-pill inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onCreateBrief}
            disabled={!canCreate}
          >
            Create launch brief
          </button>
          <button
            type="button"
            className="dashboard-pill inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold"
            onClick={onPlanCalendar}
            disabled={!canPlan}
          >
            <CalendarDaysIcon className="h-4 w-4" /> Plan calendar
          </button>
          <button
            type="button"
            className="dashboard-pill inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold"
            onClick={onInviteCollaborator}
            disabled={!canInvite}
          >
            <UserPlusIcon className="h-4 w-4" /> Invite collaborator
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {normalisedSummary.map((entry) => (
          <SummaryStat key={entry.id} label={entry.label} value={entry.value} />
        ))}
      </div>
    </div>
  );
}

CourseManagementHeader.propTypes = {
  onCreateBrief: PropTypes.func,
  onPlanCalendar: PropTypes.func,
  onInviteCollaborator: PropTypes.func,
  summary: PropTypes.shape({
    activeCohorts: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    inProduction: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    awaitingLaunch: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    atRisk: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    lastUpdated: PropTypes.string
  })
};

CourseManagementHeader.defaultProps = {
  onCreateBrief: undefined,
  onPlanCalendar: undefined,
  onInviteCollaborator: undefined,
  summary: {
    activeCohorts: 0,
    inProduction: 0,
    awaitingLaunch: 0,
    atRisk: 0,
    lastUpdated: null
  }
};
