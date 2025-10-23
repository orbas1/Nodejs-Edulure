import PropTypes from 'prop-types';

const toneClasses = {
  critical: 'bg-rose-100 text-rose-700 border border-rose-200',
  high: 'bg-amber-100 text-amber-700 border border-amber-200',
  medium: 'bg-sky-100 text-sky-700 border border-sky-200',
  low: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  default: 'bg-slate-100 text-slate-600 border border-slate-200'
};

function normaliseSeverity(value) {
  if (!value) return 'default';
  const normalised = String(value).toLowerCase();
  if (toneClasses[normalised]) {
    return normalised;
  }
  return 'default';
}

export default function SeverityBadge({ severity, children }) {
  const tone = normaliseSeverity(severity);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
      {children ?? tone.toUpperCase()}
    </span>
  );
}

SeverityBadge.propTypes = {
  severity: PropTypes.string,
  children: PropTypes.node
};

SeverityBadge.defaultProps = {
  severity: 'default',
  children: null
};
