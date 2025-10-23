import PropTypes from 'prop-types';
import clsx from 'clsx';
import {
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function formatDateDisplay(date) {
  if (!date || Number.isNaN(date.getTime())) {
    return 'Date pending';
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatRelativeDisplay(date) {
  if (!date || Number.isNaN(date.getTime())) {
    return 'Pending';
  }
  const now = new Date();
  const diffDays = Math.round((date.getTime() - now.getTime()) / DAY_IN_MS);
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === 0) return 'Today';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  return 'Pending';
}

function determineDueTone(date) {
  if (!date || Number.isNaN(date.getTime())) {
    return 'text-slate-400';
  }
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs < 0) return 'text-rose-600';
  if (diffMs <= 2 * DAY_IN_MS) return 'text-amber-500';
  return 'text-emerald-600';
}

export default function AssessmentQuickView({ assessment, onAction, actionLabel, href }) {
  const dueDate = assessment.dueDate instanceof Date ? assessment.dueDate : assessment.dueDate ? new Date(assessment.dueDate) : null;
  const dueTone = determineDueTone(dueDate);
  const dueLabel = assessment.dueLabel ?? formatDateDisplay(dueDate);
  const relativeLabel = assessment.relativeDueLabel ?? formatRelativeDisplay(dueDate);
  const statusLabel = assessment.statusLabel ?? (assessment.completed ? 'Completed' : assessment.required === false ? 'Optional' : 'Required');
  const typeLabel = assessment.typeLabel ?? assessment.type ?? 'Assessment';
  const attemptsLabel =
    typeof assessment.attempts === 'number' && assessment.attempts > 0
      ? `${assessment.attempts} attempt${assessment.attempts === 1 ? '' : 's'}`
      : null;
  const scoreLabel =
    typeof assessment.score === 'number' && Number.isFinite(assessment.score)
      ? `Score ${Math.round(assessment.score)}%`
      : null;

  const ActionTag = href ? 'a' : 'button';
  const actionProps = href
    ? {
        href,
        target: '_blank',
        rel: 'noopener noreferrer'
      }
    : {
        type: 'button',
        onClick: onAction
      };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{assessment.title}</p>
          {assessment.moduleTitle ? (
            <p className="text-xs text-slate-500">{assessment.moduleTitle}</p>
          ) : null}
        </div>
        <div className="text-right text-xs">
          <p className={clsx('text-sm font-semibold', dueTone)}>{dueLabel}</p>
          <p className={clsx('font-semibold', dueTone)}>{relativeLabel}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary">
          <ClipboardDocumentCheckIcon className="h-3.5 w-3.5" /> {typeLabel}
        </span>
        <span className="rounded-full bg-white px-2 py-1 text-slate-600">{statusLabel}</span>
        {attemptsLabel ? (
          <span className="rounded-full bg-white px-2 py-1 text-slate-600">{attemptsLabel}</span>
        ) : null}
        {scoreLabel ? (
          <span className="rounded-full bg-white px-2 py-1 text-slate-600">{scoreLabel}</span>
        ) : null}
        {assessment.durationMinutes ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-slate-600">
            <CalendarDaysIcon className="h-3.5 w-3.5" /> {assessment.durationMinutes} mins
          </span>
        ) : null}
      </div>
      {(href || onAction) && actionLabel ? (
        <ActionTag
          {...actionProps}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-primary hover:text-primary"
        >
          {actionLabel}
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        </ActionTag>
      ) : null}
    </div>
  );
}

AssessmentQuickView.propTypes = {
  assessment: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    title: PropTypes.string.isRequired,
    moduleTitle: PropTypes.string,
    type: PropTypes.string,
    typeLabel: PropTypes.string,
    dueDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    dueLabel: PropTypes.string,
    relativeDueLabel: PropTypes.string,
    statusLabel: PropTypes.string,
    required: PropTypes.bool,
    completed: PropTypes.bool,
    attempts: PropTypes.number,
    score: PropTypes.number,
    durationMinutes: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
  }).isRequired,
  onAction: PropTypes.func,
  actionLabel: PropTypes.string,
  href: PropTypes.string
};

AssessmentQuickView.defaultProps = {
  onAction: undefined,
  actionLabel: undefined,
  href: undefined
};
