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

export default function DashboardStateMessage({
  variant = 'empty',
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}) {
  const Icon = iconByVariant[variant] ?? iconByVariant.empty;
  const iconClass = iconClassByVariant[variant] ?? iconClassByVariant.empty;

  return (
    <div
      className={`dashboard-surface flex flex-col items-center justify-center gap-4 px-8 py-12 text-center ${className}`.trim()}
    >
      <Icon
        className={`h-10 w-10 ${iconClass} ${variant === 'loading' ? 'animate-spin [animation-duration:1.1s]' : ''}`}
        aria-hidden="true"
      />
      <div className="space-y-2">
        {title ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : null}
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="dashboard-action"
        >
          {actionLabel}
        </button>
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
  className: PropTypes.string
};
