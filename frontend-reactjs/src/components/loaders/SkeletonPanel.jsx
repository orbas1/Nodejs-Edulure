import PropTypes from 'prop-types';
import clsx from 'clsx';

const LINE_WIDTHS = [100, 92, 84, 76, 64];

export default function SkeletonPanel({ lines, className, variant, ariaLabel, streaming }) {
  const safeLines = Math.min(Math.max(lines, 1), LINE_WIDTHS.length);
  const baseClass =
    variant === 'inline'
      ? 'animate-pulse space-y-2 rounded-lg border border-slate-200/50 bg-slate-100/80 p-3 shadow-sm'
      : 'animate-pulse space-y-3 rounded-xl border border-slate-200/60 bg-white/70 p-5 shadow-sm shadow-primary/5';

  return (
    <div
      className={clsx('dashboard-skeleton', streaming && 'dashboard-skeleton-streaming', baseClass, className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel ?? 'Loading'}
      data-streaming={streaming ? 'true' : 'false'}
    >
      {LINE_WIDTHS.slice(0, safeLines).map((width, index) => (
        <div
          key={index}
          className="h-3 rounded-full bg-slate-200/80"
          style={{ width: `${width}%` }}
        />
      ))}
      <div className="mt-4 h-2 w-full rounded-full bg-slate-200/60" />
    </div>
  );
}

SkeletonPanel.propTypes = {
  lines: PropTypes.number,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['card', 'inline']),
  ariaLabel: PropTypes.string,
  streaming: PropTypes.bool
};

SkeletonPanel.defaultProps = {
  lines: 4,
  className: '',
  variant: 'card',
  ariaLabel: 'Loading',
  streaming: false
};
