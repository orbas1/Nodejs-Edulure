import PropTypes from 'prop-types';
import clsx from 'clsx';

import CourseProgressBar from '../course/CourseProgressBar.jsx';
import SkeletonPanel from '../loaders/SkeletonPanel.jsx';

function formatProgressLabel(value) {
  if (value === null || value === undefined) {
    return '0% complete';
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '0% complete';
  }
  return `${Math.max(0, Math.min(100, Math.round(numeric)))}% complete`;
}

export default function LearnerProgressCard({
  title,
  status,
  instructor,
  progressPercent,
  nextLabel,
  goal,
  primaryAction,
  secondaryAction,
  highlight,
  revenue,
  meta,
  loading,
  className,
  children
}) {
  if (loading) {
    return <SkeletonPanel className={className} />;
  }

  const cardClassName = clsx(
    'dashboard-card-muted group relative flex flex-col gap-4 rounded-xl border border-slate-200/60 bg-white/90 p-5 transition',
    highlight
      ? 'border-primary/60 bg-primary/5 shadow-lg shadow-primary/10'
      : 'hover:border-primary/40 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/10',
    className
  );

  const resolvedNextLabel = nextLabel || goal?.nextStep || null;
  const resolvedGoalStatus = goal?.statusLabel || goal?.status || null;
  const resolvedGoalDue = goal?.dueLabel || goal?.dueDate || null;

  return (
    <article className={cardClassName}>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="dashboard-kicker text-xs font-semibold uppercase tracking-wide text-slate-500">
            {status ?? 'Active program'}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{title}</h3>
          {instructor ? <p className="text-sm text-slate-600">With {instructor}</p> : null}
        </div>
        {resolvedGoalStatus ? (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {resolvedGoalStatus}
          </span>
        ) : null}
      </header>

      <div className="space-y-3">
        <CourseProgressBar
          value={progressPercent}
          tone={progressPercent >= 100 ? 'emerald' : 'primary'}
          srLabel={`${title} progress`}
        />
        <p className="text-sm text-slate-600">{formatProgressLabel(progressPercent)}</p>
        {resolvedNextLabel ? (
          <p className="text-sm font-medium text-slate-700">
            Next up: <span className="font-semibold text-slate-900">{resolvedNextLabel}</span>
          </p>
        ) : null}
        {goal?.focusMinutesPerWeek ? (
          <p className="text-xs text-slate-500">
            Plan for <span className="font-semibold text-slate-700">{goal.focusMinutesPerWeek} minutes</span> of study this week.
          </p>
        ) : null}
        {resolvedGoalDue ? (
          <p className="text-xs text-slate-500">Target completion: {resolvedGoalDue}</p>
        ) : null}
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {primaryAction ? (
            <ActionButton action={primaryAction} variant="primary" />
          ) : null}
          {secondaryAction ? <ActionButton action={secondaryAction} variant="ghost" /> : null}
        </div>
      )}

      {revenue ? (
        <div className="rounded-lg border border-amber-200/60 bg-amber-50 px-3 py-3 text-xs text-amber-800">
          <p className="font-semibold">{revenue.headline}</p>
          {revenue.caption ? <p className="mt-1 text-amber-700">{revenue.caption}</p> : null}
          {revenue.action ? (
            <a
              className="mt-2 inline-flex items-center text-xs font-semibold text-amber-800 underline decoration-amber-400 decoration-2 underline-offset-2 hover:text-amber-900"
              href={revenue.action.href}
            >
              {revenue.action.label}
            </a>
          ) : null}
        </div>
      ) : null}

      {children}

      {meta?.lastUpdatedLabel ? (
        <footer className="text-right text-xs text-slate-400">
          Updated {meta.lastUpdatedLabel}
        </footer>
      ) : null}
    </article>
  );
}

function ActionButton({ action, variant }) {
  if (!action) return null;
  const { label, href, onClick, disabled } = action;
  const baseClass =
    variant === 'primary'
      ? 'dashboard-primary-pill px-3 py-1 text-xs'
      : 'dashboard-pill px-3 py-1 text-xs';

  if (href) {
    return (
      <a className={clsx(baseClass, disabled && 'pointer-events-none opacity-60')} href={href} onClick={onClick}>
        {label}
      </a>
    );
  }

  return (
    <button type="button" className={baseClass} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

LearnerProgressCard.propTypes = {
  title: PropTypes.string.isRequired,
  status: PropTypes.string,
  instructor: PropTypes.string,
  progressPercent: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  nextLabel: PropTypes.string,
  goal: PropTypes.shape({
    statusLabel: PropTypes.string,
    status: PropTypes.string,
    dueLabel: PropTypes.string,
    dueDate: PropTypes.string,
    nextStep: PropTypes.string,
    focusMinutesPerWeek: PropTypes.number
  }),
  primaryAction: PropTypes.shape({
    label: PropTypes.string.isRequired,
    href: PropTypes.string,
    onClick: PropTypes.func,
    disabled: PropTypes.bool
  }),
  secondaryAction: PropTypes.shape({
    label: PropTypes.string.isRequired,
    href: PropTypes.string,
    onClick: PropTypes.func,
    disabled: PropTypes.bool
  }),
  highlight: PropTypes.bool,
  revenue: PropTypes.shape({
    headline: PropTypes.string.isRequired,
    caption: PropTypes.string,
    action: PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired
    })
  }),
  meta: PropTypes.shape({
    lastUpdatedLabel: PropTypes.string
  }),
  loading: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node
};

LearnerProgressCard.defaultProps = {
  status: 'Active program',
  instructor: null,
  progressPercent: 0,
  nextLabel: null,
  goal: null,
  primaryAction: null,
  secondaryAction: null,
  highlight: false,
  revenue: null,
  meta: null,
  loading: false,
  className: '',
  children: null
};

ActionButton.propTypes = {
  action: PropTypes.shape({
    label: PropTypes.string.isRequired,
    href: PropTypes.string,
    onClick: PropTypes.func,
    disabled: PropTypes.bool
  }),
  variant: PropTypes.oneOf(['primary', 'ghost'])
};

ActionButton.defaultProps = {
  action: null,
  variant: 'ghost'
};
