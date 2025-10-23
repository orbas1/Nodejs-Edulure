import PropTypes from 'prop-types';
import clsx from 'clsx';

function clampProgress(progress) {
  const numeric = Number(progress);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric < 0) return 0;
  if (numeric > 100) return 100;
  return Math.round(numeric);
}

function formatLabel(value, fallback) {
  if (!value) return fallback;
  return value;
}

function formatDate(value) {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  } catch (_error) {
    return value;
  }
}

export default function LearnerProgressCard({
  course,
  className,
  accent,
  onResume,
  onViewDetails,
  compact
}) {
  const progress = clampProgress(course?.progress);
  const nextLesson = formatLabel(course?.nextLesson, 'Next lesson ready');
  const status = formatLabel(course?.status, 'In progress');
  const dueDate = formatDate(course?.dueDate ?? course?.targetDate);
  const goalStatus = formatLabel(course?.goalStatus, null);
  const accentColor = accent ?? course?.accentColor ?? 'bg-primary';

  return (
    <div className={clsx('flex min-h-[176px] flex-col gap-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="dashboard-kicker">{status}</p>
          <h3 className="text-lg font-semibold text-slate-900">{course?.title ?? 'Active program'}</h3>
          <p className="text-xs text-slate-500">{formatLabel(course?.instructor, 'Instructor team')}</p>
          {goalStatus ? (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              Goal · {goalStatus}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1 text-right text-xs text-slate-600">
          <span className="text-sm font-semibold text-slate-700">{progress}% complete</span>
          <span>{nextLesson}</span>
          {dueDate ? <span className="text-[11px] text-slate-500">Target · {dueDate}</span> : null}
        </div>
      </div>

      <div className="h-2 rounded-full bg-slate-200">
        <div
          className={clsx('h-2 rounded-full transition-all duration-300 ease-out', accentColor)}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
        <button
          type="button"
          onClick={onResume}
          className="dashboard-primary-pill px-4 py-2 text-xs"
          disabled={!onResume}
        >
          {compact ? 'Resume' : 'Resume learning'}
        </button>
        <button
          type="button"
          onClick={onViewDetails}
          className="dashboard-pill px-4 py-2 text-xs"
          disabled={!onViewDetails}
        >
          View details
        </button>
      </div>
    </div>
  );
}

LearnerProgressCard.propTypes = {
  course: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    instructor: PropTypes.string,
    status: PropTypes.string,
    goalStatus: PropTypes.string,
    nextLesson: PropTypes.string,
    progress: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    dueDate: PropTypes.string,
    targetDate: PropTypes.string,
    accentColor: PropTypes.string
  }),
  className: PropTypes.string,
  accent: PropTypes.string,
  onResume: PropTypes.func,
  onViewDetails: PropTypes.func,
  compact: PropTypes.bool
};

LearnerProgressCard.defaultProps = {
  course: null,
  className: '',
  accent: null,
  onResume: undefined,
  onViewDetails: undefined,
  compact: false
};
