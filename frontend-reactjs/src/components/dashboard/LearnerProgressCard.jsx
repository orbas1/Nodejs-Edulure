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

const statusToneClass = {
  info: 'bg-sky-100 text-sky-700',
  notice: 'bg-slate-100 text-slate-600',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700'
};

function normaliseStatus(status) {
  if (!status) {
    return null;
  }
  if (typeof status === 'string') {
    return { label: status, tone: 'info' };
  }
  return {
    label: status.label ?? null,
    tone: status.tone ?? 'info'
  };
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
  streaming,
  children
}) {
  if (loading) {
    return <SkeletonPanel className={className} streaming />;
  }

  const cardClassName = clsx(
    'dashboard-card-muted group relative flex flex-col gap-4 rounded-xl border border-slate-200/60 bg-white/90 p-5 transition',
    highlight
      ? 'border-primary/60 bg-primary/5 shadow-lg shadow-primary/10'
      : 'hover:border-primary/40 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/10',
    className
  );

  const resolvedNextLabel = nextLabel || goal?.nextStep || null;
  const resolvedGoalStatus = normaliseStatus(goal?.status ?? goal?.statusLabel ?? null);
  const resolvedGoalDue = goal?.dueLabel || goal?.dueDate || null;
  const resolvedStatus = normaliseStatus(status);
  const assistiveText = meta?.assistiveText ?? null;
  const timestampLabel = meta?.timestampLabel ?? null;

  return (
    <article className={cardClassName}>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {resolvedStatus?.label ? (
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
                  statusToneClass[resolvedStatus.tone] ?? statusToneClass.info
                }`}
              >
                {streaming ? <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current" aria-hidden="true" /> : null}
                {resolvedStatus.label}
              </span>
            ) : (
              <p className="dashboard-kicker text-xs font-semibold uppercase tracking-wide text-slate-500">Active program</p>
            )}
            {resolvedGoalStatus?.label ? (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                  statusToneClass[resolvedGoalStatus.tone] ?? statusToneClass.success
                }`}
              >
                {resolvedGoalStatus.label}
              </span>
            ) : null}
          </div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {instructor ? <p className="text-sm text-slate-600">With {instructor}</p> : null}
        </div>
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
          {primaryAction ? <ActionButton action={primaryAction} variant="primary" /> : null}
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

      {(assistiveText || meta?.lastUpdatedLabel || timestampLabel) ? (
        <footer className="mt-1 space-y-1 text-right text-xs text-slate-400">
          {assistiveText ? <p className="text-left text-[11px] uppercase tracking-wide text-slate-400">{assistiveText}</p> : null}
          {meta?.lastUpdatedLabel ? <p>Updated {meta.lastUpdatedLabel}</p> : null}
          {timestampLabel ? <p>{timestampLabel}</p> : null}
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
  status: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      label: PropTypes.node,
      tone: PropTypes.oneOf(['info', 'notice', 'success', 'warning', 'danger'])
    })
  ]),
  instructor: PropTypes.string,
  progressPercent: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  nextLabel: PropTypes.string,
  goal: PropTypes.shape({
    statusLabel: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        label: PropTypes.node,
        tone: PropTypes.oneOf(['info', 'notice', 'success', 'warning', 'danger'])
      })
    ]),
    status: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        label: PropTypes.node,
        tone: PropTypes.oneOf(['info', 'notice', 'success', 'warning', 'danger'])
      })
    ]),
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
    lastUpdatedLabel: PropTypes.string,
    assistiveText: PropTypes.node,
    timestampLabel: PropTypes.string
  }),
  loading: PropTypes.bool,
  className: PropTypes.string,
  streaming: PropTypes.bool,
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
  streaming: false,
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
