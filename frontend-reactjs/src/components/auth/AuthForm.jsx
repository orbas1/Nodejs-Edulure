import PropTypes from 'prop-types';
import clsx from 'clsx';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

import AuthCard from '../AuthCard.jsx';
import FormField from '../FormField.jsx';

function PasswordChecklist({ requirements, description }) {
  if (!requirements?.length) {
    return null;
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Password requirements</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <ul className="mt-3 space-y-2">
        {requirements.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            {item.met ? (
              <CheckCircleIcon className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            ) : (
              <ExclamationCircleIcon className="h-4 w-4 text-amber-500" aria-hidden="true" />
            )}
            <span className={clsx('text-xs font-semibold', item.met ? 'text-emerald-700' : 'text-slate-600')}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

PasswordChecklist.propTypes = {
  requirements: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      met: PropTypes.bool
    })
  ),
  description: PropTypes.string
};

PasswordChecklist.defaultProps = {
  requirements: undefined,
  description: undefined
};

function SocialProofList({ entries }) {
  if (!entries?.length) {
    return null;
  }
  return (
    <div className="rounded-3xl border border-slate-100 bg-white/80 p-4 shadow-inner">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Why operators trust Edulure</p>
      <ul className="mt-3 space-y-3 text-sm text-slate-600">
        {entries.map((entry) => (
          <li key={entry.id ?? entry.quote} className="rounded-2xl bg-slate-50/70 p-3">
            <p className="font-semibold text-slate-700">{entry.quote}</p>
            <p className="mt-1 text-xs text-slate-500">{entry.attribution}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

SocialProofList.propTypes = {
  entries: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      quote: PropTypes.string.isRequired,
      attribution: PropTypes.string.isRequired
    })
  )
};

SocialProofList.defaultProps = {
  entries: undefined
};

export default function AuthForm({
  title,
  subtitle,
  highlights,
  badge,
  supportEmail,
  footnote,
  onSubmit,
  submitLabel,
  busy,
  error,
  success,
  children,
  analyticsId,
  passwordChecklist,
  footer,
  progress,
  socialProof,
  actions
}) {
  const progressValue = typeof progress?.progress === 'number' ? Math.min(Math.max(progress.progress, 0), 1) : null;
  const progressLabel = progress?.label ?? null;

  return (
    <AuthCard title={title} subtitle={subtitle} highlights={highlights} badge={badge} supportEmail={supportEmail} footnote={footnote}>
      <div className="space-y-6">
        {progressValue !== null ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wide">Onboarding progress</span>
              <span>{Math.round(progressValue * 100)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.max(4, progressValue * 100)}%` }}
              />
            </div>
            {progressLabel ? <p className="text-xs text-slate-500">{progressLabel}</p> : null}
          </div>
        ) : null}
        <form className="space-y-6" onSubmit={onSubmit} data-analytics-id={analyticsId} noValidate>
          {error ? <p className="form-banner form-banner--error">{error}</p> : null}
          {success ? <p className="form-banner form-banner--success">{success}</p> : null}
          <div className="space-y-6">{children}</div>
          {passwordChecklist ? (
            <PasswordChecklist
              requirements={passwordChecklist.requirements}
              description={passwordChecklist.description}
            />
          ) : null}
          <div className="space-y-4">
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/50"
            >
              {busy ? 'Processing…' : submitLabel}
            </button>
            {actions ? <div className="text-sm text-slate-500">{actions}</div> : null}
          </div>
        </form>
        {socialProof?.length ? <SocialProofList entries={socialProof} /> : null}
        {footer ? <div className="text-xs text-slate-500">{footer}</div> : null}
      </div>
    </AuthCard>
  );
}

AuthForm.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  highlights: PropTypes.arrayOf(PropTypes.string),
  badge: PropTypes.string,
  supportEmail: PropTypes.string,
  footnote: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  submitLabel: PropTypes.string.isRequired,
  busy: PropTypes.bool,
  error: PropTypes.string,
  success: PropTypes.string,
  children: PropTypes.node.isRequired,
  analyticsId: PropTypes.string,
  passwordChecklist: PropTypes.shape({
    description: PropTypes.string,
    requirements: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        met: PropTypes.bool
      })
    )
  }),
  footer: PropTypes.node,
  progress: PropTypes.shape({
    progress: PropTypes.number,
    label: PropTypes.string
  }),
  socialProof: PropTypes.array,
  actions: PropTypes.node
};

AuthForm.defaultProps = {
  highlights: undefined,
  badge: undefined,
  supportEmail: undefined,
  footnote: undefined,
  busy: false,
  error: undefined,
  success: undefined,
  analyticsId: undefined,
  passwordChecklist: undefined,
  footer: undefined,
  progress: undefined,
  socialProof: undefined,
  actions: undefined
};

AuthForm.Field = FormField;
