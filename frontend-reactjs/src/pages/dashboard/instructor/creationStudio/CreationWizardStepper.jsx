import PropTypes from 'prop-types';
import {
  BoltIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  PauseCircleIcon,
  PlayCircleIcon
} from '@heroicons/react/24/outline';

const STATE_STYLES = {
  complete: {
    icon: CheckCircleIcon,
    tone: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    label: 'Complete'
  },
  'in-progress': {
    icon: InformationCircleIcon,
    tone: 'bg-sky-50 border-sky-200 text-sky-700',
    label: 'In progress'
  },
  todo: {
    icon: PauseCircleIcon,
    tone: 'bg-slate-100 border-slate-200 text-slate-600',
    label: 'To do'
  },
  warning: {
    icon: ExclamationCircleIcon,
    tone: 'bg-amber-50 border-amber-200 text-amber-700',
    label: 'Requires attention'
  },
  blocked: {
    icon: ExclamationCircleIcon,
    tone: 'bg-rose-50 border-rose-200 text-rose-700',
    label: 'Blocked'
  }
};

function StepCard({ step }) {
  const state = STATE_STYLES[step.state] ?? STATE_STYLES.todo;
  const Icon = state.icon;
  return (
    <div className={`flex flex-col gap-3 rounded-3xl border p-6 shadow-sm ${state.tone}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">{step.label}</p>
          <p className="mt-2 text-sm text-slate-600">{step.description}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-current">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      </div>
      {step.metrics && (
        <dl className="grid gap-2 text-xs">
          {Object.entries(step.metrics)
            .filter(([, value]) => value !== null && value !== undefined)
            .map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <dt className="capitalize text-slate-500">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</dt>
                <dd className="font-semibold text-slate-700">{value}</dd>
              </div>
            ))}
        </dl>
      )}
      <span className="mt-auto inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Icon className="h-4 w-4" aria-hidden="true" />
          {state.label}
        </span>
      </span>
    </div>
  );
}

StepCard.propTypes = {
  step: PropTypes.shape({
    label: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    state: PropTypes.string.isRequired,
    metrics: PropTypes.object
  }).isRequired
};

export default function CreationWizardStepper({
  project,
  steps,
  activeSession,
  sessionLoading,
  sessionError,
  onStartSession,
  onEndSession
}) {
  const hasComplianceNotes = (project.complianceNotes ?? []).length > 0;

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Creation wizard</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{project.title}</h2>
          <p className="mt-2 text-sm text-slate-600">
            Track production readiness across the creation workflow. Each stage reflects the latest data synced from the studio
            service so reviewers can see where support is needed.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <div className="rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold text-slate-600">
            Status · {project.status.replace(/_/g, ' ')}
          </div>
          {project.latestVersion && (
            <div className="text-xs text-slate-500">
              Last version v{project.latestVersion.versionNumber} ·{' '}
              {project.latestVersion.createdAt ? new Date(project.latestVersion.createdAt).toLocaleString() : 'n/a'}
            </div>
          )}
        </div>
      </div>

      {hasComplianceNotes && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <ExclamationCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Compliance follow-ups</p>
            <ul className="mt-2 space-y-1 text-xs">
              {project.complianceNotes.map((note, index) => (
                <li key={`${note.type}-${index}`}>{note.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {steps.map((step) => (
          <StepCard key={step.id} step={step} />
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <BoltIcon className="h-5 w-5 text-primary" />
          {activeSession ? (
            <span>
              You are collaborating live. Session started {activeSession.joinedAt ? new Date(activeSession.joinedAt).toLocaleString() : 'recently'}.
            </span>
          ) : (
            <span>Start a real-time editing session to broadcast your presence to collaborators.</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {sessionError && <span className="text-xs font-semibold text-rose-600">{sessionError.message}</span>}
          {activeSession ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-400 hover:bg-rose-50"
              onClick={onEndSession}
              disabled={sessionLoading}
            >
              <PauseCircleIcon className="h-4 w-4" /> End session
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary/20"
              onClick={onStartSession}
              disabled={sessionLoading}
            >
              <PlayCircleIcon className="h-4 w-4" /> Start collaborating
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

CreationWizardStepper.propTypes = {
  project: PropTypes.shape({
    title: PropTypes.string,
    status: PropTypes.string,
    latestVersion: PropTypes.shape({ versionNumber: PropTypes.number, createdAt: PropTypes.string }),
    complianceNotes: PropTypes.array
  }).isRequired,
  steps: PropTypes.arrayOf(StepCard.propTypes.step).isRequired,
  activeSession: PropTypes.shape({
    joinedAt: PropTypes.string
  }),
  sessionLoading: PropTypes.bool,
  sessionError: PropTypes.instanceOf(Error),
  onStartSession: PropTypes.func,
  onEndSession: PropTypes.func
};

CreationWizardStepper.defaultProps = {
  activeSession: null,
  sessionLoading: false,
  sessionError: null,
  onStartSession: () => {},
  onEndSession: () => {}
};
