import { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

import BlockEditor from '../../../../components/creation/BlockEditor.jsx';
import AnalyticsSummaryCard from '../../../../components/dashboard/AnalyticsSummaryCard.jsx';
import DashboardStateMessage from '../../../../components/dashboard/DashboardStateMessage.jsx';

function formatDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function formatCurrencyDisplay(cents, currency = 'USD') {
  if (!Number.isFinite(Number(cents))) {
    return '—';
  }
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(cents) / 100);
}

function toneForCallout(tone) {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'critical':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    default:
      return 'border-sky-200 bg-sky-50 text-sky-800';
  }
}

function ChecklistTask({ task, onToggle, disabled }) {
  const icon = task.completed ? (
    <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
  ) : (
    <InformationCircleIcon className="h-5 w-5 text-slate-400" />
  );

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggle(task.id, !task.completed)}
          className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 transition hover:border-primary/40 hover:bg-primary/10"
          disabled={disabled}
          aria-label={task.completed ? 'Mark task incomplete' : 'Mark task complete'}
        >
          {icon}
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">{task.label}</p>
          {task.description ? <p className="text-xs text-slate-500">{task.description}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {task.milestoneKey ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold uppercase tracking-wide text-slate-600">
                {task.milestoneKey.replace(/_/g, ' ')}
              </span>
            ) : null}
            {task.dueAt ? <span>Due {formatDate(task.dueAt)}</span> : null}
            {task.completedAt ? <span>Completed {formatDate(task.completedAt)}</span> : null}
          </div>
          {task.blockedReason ? (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4" aria-hidden="true" />
              <span>{task.blockedReason}</span>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

ChecklistTask.propTypes = {
  task: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    description: PropTypes.string,
    milestoneKey: PropTypes.string,
    completed: PropTypes.bool,
    completedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    dueAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    blockedReason: PropTypes.string
  }).isRequired,
  onToggle: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

ChecklistTask.defaultProps = {
  disabled: false
};

export default function CreationContentWorkspace({
  project,
  blocks,
  onBlocksChange,
  onSave,
  saving,
  dirty,
  saveError,
  lastSavedAt,
  checklist,
  checklistLoading,
  checklistError,
  onToggleTask,
  checklistPending,
  monetisationGuidance,
  earnings,
  earningsLoading,
  earningsError
}) {
  const heroCallout = useMemo(() => {
    if (!Array.isArray(project?.complianceNotes) || !project.complianceNotes.length) {
      return null;
    }
    const primary = project.complianceNotes[0];
    return {
      tone: 'warning',
      text: primary.message,
      title: primary.type ? primary.type.replace(/_/g, ' ') : 'Compliance note'
    };
  }, [project?.complianceNotes]);

  const derivedTrend = useMemo(() => {
    if (!earnings || !Number.isFinite(Number(earnings.changePercentage))) {
      return null;
    }
    const direction = Number(earnings.changePercentage) >= 0 ? 'up' : 'down';
    const value = Math.abs(Number(earnings.changePercentage)).toFixed(1);
    return {
      direction,
      label: `${direction === 'up' ? '+' : '−'}${value}% vs prior period`
    };
  }, [earnings]);

  const checklistMeta = useMemo(() => {
    if (!Array.isArray(checklist)) {
      return { total: 0, completed: 0 };
    }
    const total = checklist.length;
    const completed = checklist.filter((task) => task.completed).length;
    return { total, completed };
  }, [checklist]);

  return (
    <section className="space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Content workspace</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{project.title ?? 'Draft project'}</h2>
          <p className="mt-2 text-sm text-slate-600">
            Author modules, embed multimedia, and track go-to-market readiness from one workspace. Saves push updates to the
            creation service so collaborators and compliance reviewers stay aligned.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right text-xs text-slate-500">
          {lastSavedAt ? <span>Last saved {formatDate(lastSavedAt)}</span> : <span>No edits saved yet</span>}
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold uppercase tracking-wide text-slate-600">
            Status · {project.status?.replace(/_/g, ' ') ?? 'draft'}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {heroCallout ? (
            <div className={`flex items-start gap-3 rounded-3xl border p-4 text-sm ${toneForCallout(heroCallout.tone)}`}>
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5" aria-hidden="true" />
              <div>
                <p className="font-semibold">{heroCallout.title}</p>
                <p className="text-xs opacity-90">{heroCallout.text}</p>
              </div>
            </div>
          ) : null}

          <BlockEditor value={blocks} onChange={onBlocksChange} readOnly={saving} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            {saveError ? (
              <span className="text-sm font-semibold text-rose-600">{saveError.message}</span>
            ) : (
              <span className="text-xs text-slate-500">Changes autosave when you publish, or save manually below.</span>
            )}
            <button
              type="button"
              onClick={onSave}
              className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              disabled={saving || !dirty}
            >
              <SparklesIcon className="h-4 w-4" />
              Save draft
            </button>
          </div>
        </div>

        <aside className="space-y-6">
          {earningsLoading ? (
            <DashboardStateMessage
              variant="loading"
              title="Loading earnings"
              description="Syncing revenue insights from the monetisation service."
            />
          ) : earningsError ? (
            <DashboardStateMessage
              variant="error"
              title="Earnings unavailable"
              description={earningsError.message}
            />
          ) : earnings ? (
            <AnalyticsSummaryCard
              title="30-day earnings"
              primaryValue={earnings.grossCents}
              netValue={earnings.netCents}
              currency={earnings.currency ?? 'USD'}
              trend={derivedTrend}
              meta={[
                { label: 'Bookings', value: earnings.bookings ?? 0 },
                {
                  label: 'Average price',
                  value:
                    earnings.averageSellingPriceDisplay ??
                    formatCurrencyDisplay(earnings.averageSellingPriceCents, earnings.currency)
                }
              ]}
              footer={earnings.nextPayout
                ? `Next payout ${formatDate(earnings.nextPayout.expectedAt)} · ${earnings.nextPayout.displayAmount}`
                : 'Syncs nightly with the monetisation service.'}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Earnings metrics populate once sales or bookings flow through this project.
            </div>
          )}

          <section className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-600">
              <span>Production checklist</span>
              <span>
                {checklistMeta.completed} / {checklistMeta.total} complete
              </span>
            </div>
            {checklistLoading ? (
              <DashboardStateMessage
                variant="loading"
                title="Loading checklist"
                description="Fetching milestones from the creation service."
              />
            ) : checklistError ? (
              <DashboardStateMessage
                variant="error"
                title="Checklist unavailable"
                description={checklistError.message}
              />
            ) : checklist?.length ? (
              <ul className="space-y-3">
                {checklist.map((task) => (
                  <ChecklistTask
                    key={task.id}
                    task={task}
                    onToggle={onToggleTask}
                    disabled={checklistPending.includes(task.id)}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">
                No milestones defined yet. Add workflow steps from governance settings to guide collaborators.
              </p>
            )}
          </section>

          {monetisationGuidance?.length ? (
            <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Monetisation guidance</p>
              <ul className="space-y-2 text-sm text-slate-600">
                {monetisationGuidance.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <SparklesIcon className="mt-1 h-4 w-4 text-primary" aria-hidden="true" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

CreationContentWorkspace.propTypes = {
  project: PropTypes.shape({
    title: PropTypes.string,
    status: PropTypes.string,
    complianceNotes: PropTypes.array
  }).isRequired,
  blocks: BlockEditor.propTypes.value,
  onBlocksChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  saving: PropTypes.bool,
  dirty: PropTypes.bool,
  saveError: PropTypes.instanceOf(Error),
  lastSavedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  checklist: PropTypes.arrayOf(ChecklistTask.propTypes.task),
  checklistLoading: PropTypes.bool,
  checklistError: PropTypes.instanceOf(Error),
  onToggleTask: PropTypes.func.isRequired,
  checklistPending: PropTypes.arrayOf(PropTypes.string),
  monetisationGuidance: PropTypes.arrayOf(PropTypes.string),
  earnings: PropTypes.shape({
    grossCents: PropTypes.number,
    netCents: PropTypes.number,
    currency: PropTypes.string,
    changePercentage: PropTypes.number,
    bookings: PropTypes.number,
    averageSellingPriceCents: PropTypes.number,
    averageSellingPriceDisplay: PropTypes.string,
    nextPayout: PropTypes.shape({
      expectedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      displayAmount: PropTypes.string
    })
  }),
  earningsLoading: PropTypes.bool,
  earningsError: PropTypes.instanceOf(Error)
};

CreationContentWorkspace.defaultProps = {
  blocks: [],
  saving: false,
  dirty: false,
  saveError: null,
  lastSavedAt: null,
  checklist: [],
  checklistLoading: false,
  checklistError: null,
  checklistPending: [],
  monetisationGuidance: [],
  earnings: null,
  earningsLoading: false,
  earningsError: null
};
