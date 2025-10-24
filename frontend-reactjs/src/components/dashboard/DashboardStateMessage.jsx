import PropTypes from 'prop-types';
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InboxStackIcon
} from '@heroicons/react/24/outline';

const iconByVariant = {
  loading: ArrowPathIcon,
  error: ExclamationTriangleIcon,
  empty: InboxStackIcon
};

const iconClassByVariant = {
  loading: 'text-primary',
  error: 'text-rose-400',
  empty: 'text-slate-500'
};

const badgeToneClass = {
  info: 'bg-sky-100 text-sky-700',
  notice: 'bg-slate-100 text-slate-600',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700'
};

function normaliseAction(action) {
  if (!action) {
    return null;
  }
  if (typeof action === 'function') {
    return { label: 'Take action', onClick: action, variant: 'primary' };
  }
  if (typeof action === 'string') {
    return { label: action, variant: 'primary' };
  }
  return {
    label: action.label ?? 'Take action',
    onClick: action.onClick ?? null,
    href: action.href ?? null,
    variant: action.variant ?? 'primary',
    disabled: action.disabled ?? false
  };
}

function renderAction(action) {
  const resolved = normaliseAction(action);
  if (!resolved) {
    return null;
  }
  const baseClass =
    resolved.variant === 'secondary'
      ? 'dashboard-pill'
      : resolved.variant === 'link'
        ? 'text-sm font-semibold text-primary hover:underline'
        : 'dashboard-primary-pill';

  if (resolved.href) {
    return (
      <a
        key={resolved.label}
        className={baseClass}
        href={resolved.href}
        onClick={resolved.onClick}
      >
        {resolved.label}
      </a>
    );
  }

  if (resolved.variant === 'link') {
    return (
      <button
        key={resolved.label}
        type="button"
        onClick={resolved.onClick}
        disabled={resolved.disabled}
        className={baseClass}
      >
        {resolved.label}
      </button>
    );
  }

  return (
    <button
      key={resolved.label}
      type="button"
      onClick={resolved.onClick}
      disabled={resolved.disabled}
      className={`${baseClass}${resolved.disabled ? ' opacity-60' : ''}`}
    >
      {resolved.label}
    </button>
  );
}

export default function DashboardStateMessage({
  variant = 'empty',
  title,
  description,
  actionLabel,
  onAction,
  primaryAction,
  secondaryAction,
  badge,
  meta,
  className = ''
}) {
  const Icon = iconByVariant[variant] ?? iconByVariant.empty;
  const iconClass = iconClassByVariant[variant] ?? iconClassByVariant.empty;

  const resolvedPrimaryAction = primaryAction ?? (actionLabel ? { label: actionLabel, onClick: onAction } : null);
  const actions = [resolvedPrimaryAction, secondaryAction].map(normaliseAction).filter(Boolean);

  const resolvedBadge = badge
    ? typeof badge === 'string'
      ? { label: badge, tone: 'info' }
      : { label: badge.label ?? null, tone: badge.tone ?? 'info' }
    : null;

  const assistiveText = meta?.assistiveText ?? null;
  const timestamp = meta?.timestampLabel ?? null;

  return (
    <div
      className={`dashboard-card flex flex-col items-center justify-center gap-4 px-8 py-12 text-center ${className}`.trim()}
    >
      <Icon
        className={`h-10 w-10 ${iconClass} ${variant === 'loading' ? 'animate-spin [animation-duration:1.1s]' : ''}`}
        aria-hidden="true"
      />
      <div className="space-y-3">
        {resolvedBadge?.label ? (
          <span
            className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
              badgeToneClass[resolvedBadge.tone] ?? badgeToneClass.info
            }`}
          >
            {resolvedBadge.label}
          </span>
        ) : null}
        <div className="space-y-2">
          {title ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : null}
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </div>
        {assistiveText ? <p className="text-xs text-slate-500">{assistiveText}</p> : null}
        {timestamp ? <p className="text-[11px] uppercase tracking-wide text-slate-400">{timestamp}</p> : null}
      </div>
      {actions.length ? (
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">{actions.map((action) => renderAction(action))}</div>
      ) : null}
    </div>
  );
}

DashboardStateMessage.propTypes = {
  variant: PropTypes.oneOf(['loading', 'error', 'empty']),
  title: PropTypes.string,
  description: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  primaryAction: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.string,
    PropTypes.shape({
      label: PropTypes.string,
      onClick: PropTypes.func,
      href: PropTypes.string,
      variant: PropTypes.oneOf(['primary', 'secondary', 'link']),
      disabled: PropTypes.bool
    })
  ]),
  secondaryAction: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.string,
    PropTypes.shape({
      label: PropTypes.string,
      onClick: PropTypes.func,
      href: PropTypes.string,
      variant: PropTypes.oneOf(['primary', 'secondary', 'link']),
      disabled: PropTypes.bool
    })
  ]),
  badge: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      label: PropTypes.node,
      tone: PropTypes.oneOf(['info', 'notice', 'success', 'warning', 'danger'])
    })
  ]),
  meta: PropTypes.shape({
    assistiveText: PropTypes.node,
    timestampLabel: PropTypes.string
  }),
  className: PropTypes.string
};

DashboardStateMessage.defaultProps = {
  primaryAction: null,
  secondaryAction: null,
  badge: null,
  meta: null
};
