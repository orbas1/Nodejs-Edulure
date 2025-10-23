import PropTypes from 'prop-types';
import clsx from 'clsx';

const VARIANT_STYLES = {
  default: 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
  muted: 'dashboard-card-muted p-5'
};

export default function SkeletonPanel({
  isLoading,
  children,
  className,
  variant,
  lines,
  hasHeading
}) {
  const baseClass = VARIANT_STYLES[variant] ?? VARIANT_STYLES.default;
  if (!isLoading) {
    return <div className={clsx(baseClass, className)}>{children}</div>;
  }

  const lineCount = Math.max(2, lines);
  return (
    <div
      className={clsx(baseClass, 'pointer-events-none select-none', className)}
      aria-busy="true"
      aria-live="polite"
    >
      <div className={clsx('animate-pulse space-y-3 rounded-2xl bg-white/60 p-4 shadow-inner')}>
        {hasHeading ? <div className="h-6 w-3/4 rounded-full bg-slate-200/80" /> : null}
        {Array.from({ length: lineCount }).map((_, index) => (
          <div key={index} className="h-3 w-full rounded-full bg-slate-200/70" />
        ))}
      </div>
    </div>
  );
}

SkeletonPanel.propTypes = {
  isLoading: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'muted']),
  lines: PropTypes.number,
  hasHeading: PropTypes.bool
};

SkeletonPanel.defaultProps = {
  isLoading: false,
  children: null,
  className: '',
  variant: 'default',
  lines: 4,
  hasHeading: false
};
