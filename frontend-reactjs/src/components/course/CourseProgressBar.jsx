import PropTypes from 'prop-types';

const toneStyles = {
  primary: 'from-primary to-primary-dark',
  emerald: 'from-emerald-500 to-emerald-600',
  amber: 'from-amber-500 to-amber-600',
  slate: 'from-slate-500 to-slate-700'
};

export default function CourseProgressBar({
  value,
  label,
  srLabel,
  tone,
  backgroundClassName,
  target,
  className
}) {
  const safeValue = Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : 0;
  const safeTarget = Number.isFinite(Number(target)) ? Math.max(0, Math.min(100, Number(target))) : null;
  const gradient = toneStyles[tone] ?? toneStyles.primary;
  const containerClass = ['w-full', className].filter(Boolean).join(' ');
  return (
    <div className={containerClass}>
      {label ? <p className="text-xs font-semibold text-slate-500">{label}</p> : null}
      <div className={`relative mt-2 h-2 rounded-full bg-slate-200 ${backgroundClassName}`}>
        <div
          className={`h-2 rounded-full bg-gradient-to-r transition-all duration-500 ease-out ${gradient}`}
          style={{ width: `${safeValue}%` }}
          aria-label={srLabel ?? label}
          role="progressbar"
          aria-valuenow={Math.round(safeValue)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
        {safeTarget !== null ? (
          <div
            className="absolute inset-y-0 w-px bg-slate-400"
            style={{ left: `${safeTarget}%` }}
            role="presentation"
          >
            <span className="sr-only">Target {safeTarget}%</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

CourseProgressBar.propTypes = {
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  label: PropTypes.string,
  srLabel: PropTypes.string,
  tone: PropTypes.oneOf(['primary', 'emerald', 'amber', 'slate']),
  backgroundClassName: PropTypes.string,
  target: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  className: PropTypes.string
};

CourseProgressBar.defaultProps = {
  value: 0,
  label: undefined,
  srLabel: undefined,
  tone: 'primary',
  backgroundClassName: '',
  target: undefined,
  className: ''
};
