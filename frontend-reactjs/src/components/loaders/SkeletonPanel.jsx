import PropTypes from 'prop-types';
import clsx from 'clsx';

const LINE_WIDTHS = [100, 92, 84, 76, 64];

export default function SkeletonPanel({ lines, className }) {
  const safeLines = Math.min(Math.max(lines, 1), LINE_WIDTHS.length);
  return (
    <div
      className={clsx(
        'dashboard-card-muted animate-pulse space-y-3 rounded-xl border border-slate-200/60 bg-white/70 p-5 shadow-sm shadow-primary/5',
        className
      )}
      aria-hidden="true"
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
  className: PropTypes.string
};

SkeletonPanel.defaultProps = {
  lines: 4,
  className: ''
};
