import PropTypes from 'prop-types';
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const toneConfig = {
  success: {
    icon: CheckCircleIcon,
    wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    accent: 'text-emerald-600'
  },
  error: {
    icon: ExclamationCircleIcon,
    wrapper: 'border-rose-200 bg-rose-50 text-rose-700',
    accent: 'text-rose-600'
  },
  warning: {
    icon: ExclamationCircleIcon,
    wrapper: 'border-amber-200 bg-amber-50 text-amber-700',
    accent: 'text-amber-600'
  },
  info: {
    icon: InformationCircleIcon,
    wrapper: 'border-sky-200 bg-sky-50 text-sky-700',
    accent: 'text-sky-600'
  }
};

export default function DashboardActionFeedback({ feedback = null, onDismiss }) {
  if (!feedback) {
    return null;
  }
  const tone = toneConfig[feedback.tone] ?? toneConfig.info;
  const Icon = tone.icon;
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${tone.wrapper}`}
      role="status"
      aria-live="polite"
    >
      <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${tone.accent}`} />
      <div className="flex-1">
        <p className="font-semibold">{feedback.message}</p>
        {feedback.detail ? <p className="mt-1 text-xs opacity-80">{feedback.detail}</p> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          className="ml-3 text-xs font-semibold underline"
          onClick={onDismiss}
          aria-label="Dismiss feedback"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}

DashboardActionFeedback.propTypes = {
  feedback: PropTypes.shape({
    tone: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
    message: PropTypes.string,
    detail: PropTypes.string
  }),
  onDismiss: PropTypes.func
};
