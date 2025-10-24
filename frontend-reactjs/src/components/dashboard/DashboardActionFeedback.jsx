import { useEffect, useMemo, useState } from 'react';
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

function loadPersistedState(persistKey) {
  if (!persistKey || typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(persistKey);
    return stored ? JSON.parse(stored) : null;
  } catch (_error) {
    return null;
  }
}

export default function DashboardActionFeedback({ feedback = null, onDismiss, persistKey, autoDismiss, actions }) {
  const [dismissed, setDismissed] = useState(() => {
    const persisted = loadPersistedState(persistKey);
    if (!persisted) return false;
    if (feedback?.id && persisted.id !== feedback.id) {
      return false;
    }
    return persisted.dismissed === true;
  });

  useEffect(() => {
    if (!persistKey || !feedback) return;
    try {
      window.localStorage.setItem(
        persistKey,
        JSON.stringify({ id: feedback.id ?? feedback.message, dismissed })
      );
    } catch (_error) {
      // ignore
    }
  }, [persistKey, feedback, dismissed]);

  useEffect(() => {
    if (!feedback || !autoDismiss || dismissed) return;
    const timeout = setTimeout(() => {
      setDismissed(true);
      onDismiss?.();
    }, typeof autoDismiss === 'number' ? autoDismiss : 5000);
    return () => clearTimeout(timeout);
  }, [autoDismiss, feedback, dismissed, onDismiss]);

  const tone = useMemo(() => toneConfig[feedback?.tone] ?? toneConfig.info, [feedback?.tone]);
  const Icon = tone.icon;

  if (!feedback || dismissed) {
    return null;
  }

  return (
    <div
      className={`flex flex-wrap items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${tone.wrapper}`}
      role="status"
      aria-live="polite"
    >
      <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${tone.accent}`} />
      <div className="flex-1 space-y-1">
        <p className="font-semibold">{feedback.message}</p>
        {feedback.detail ? <p className="text-xs opacity-80">{feedback.detail}</p> : null}
        {Array.isArray(actions) && actions.length ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {actions.map((action) => (
              <button
                key={action.id ?? action.label}
                type="button"
                onClick={() => {
                  action.onSelect?.();
                  if (action.dismissOnSelect) {
                    setDismissed(true);
                    onDismiss?.();
                  }
                }}
                className="rounded-full border border-current px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          className="ml-3 text-xs font-semibold underline"
          onClick={() => {
            setDismissed(true);
            onDismiss();
          }}
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
    detail: PropTypes.string,
    id: PropTypes.string
  }),
  onDismiss: PropTypes.func,
  persistKey: PropTypes.string,
  autoDismiss: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]),
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      label: PropTypes.string.isRequired,
      onSelect: PropTypes.func,
      dismissOnSelect: PropTypes.bool
    })
  )
};

DashboardActionFeedback.defaultProps = {
  onDismiss: null,
  persistKey: null,
  autoDismiss: false,
  actions: []
};
