import PropTypes from 'prop-types';

const toneStyles = {
  info: 'border-slate-200 bg-slate-50 text-slate-600',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700'
};

const toneIcon = {
  info: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm.75-11.5a.75.75 0 1 0-1.5 0v.5a.75.75 0 1 0 1.5 0v-.5Zm0 3a.75.75 0 1 0-1.5 0v4a.75.75 0 0 0 1.5 0v-4Z" />
    </svg>
  ),
  success: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm3.53-9.78a.75.75 0 0 0-1.06-1.06l-3.47 3.47-1.47-1.47a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4-4Z" />
    </svg>
  ),
  warning: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M9.05 2.93a1.5 1.5 0 0 1 1.9 0l7.45 6.36c.98.84.35 2.41-.95 2.41h-14.9c-1.3 0-1.93-1.57-.95-2.41l7.45-6.36ZM10.75 7a.75.75 0 1 0-1.5 0v3.5a.75.75 0 1 0 1.5 0V7Zm0 6.5a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
    </svg>
  ),
  danger: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M9.05 2.93a1.5 1.5 0 0 1 1.9 0l7.45 6.36c.98.84.35 2.41-.95 2.41h-14.9c-1.3 0-1.93-1.57-.95-2.41l7.45-6.36ZM10 13.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm.75-5.5a.75.75 0 1 0-1.5 0v2.5a.75.75 0 1 0 1.5 0V8Z" />
    </svg>
  )
};

export default function InviteStatusBanner({ tone, message }) {
  if (!message) {
    return null;
  }

  const styles = toneStyles[tone] ?? toneStyles.info;
  const icon = toneIcon[tone] ?? toneIcon.info;

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs font-medium ${styles}`}>
      <span className="mt-0.5 text-current">{icon}</span>
      <p>{message}</p>
    </div>
  );
}

InviteStatusBanner.propTypes = {
  tone: PropTypes.oneOf(['info', 'success', 'warning', 'danger']),
  message: PropTypes.string
};

InviteStatusBanner.defaultProps = {
  tone: 'info',
  message: null
};
