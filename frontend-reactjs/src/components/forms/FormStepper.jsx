import PropTypes from 'prop-types';
import { CheckIcon } from '@heroicons/react/24/outline';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function FormStepper({ steps, currentStep, onSelect }) {
  return (
    <ol className="flex flex-wrap gap-3" role="list">
      {steps.map((step, index) => {
        const position = index + 1;
        const isActive = step.id === currentStep;
        const activeIndex = steps.findIndex((item) => item.id === currentStep);
        const isCompleted = activeIndex !== -1 && index < activeIndex;
        const isDisabled = Boolean(step.disabled);
        const status = isCompleted ? 'completed' : isActive ? 'current' : 'upcoming';
        return (
          <li key={step.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!isDisabled) {
                  onSelect(step.id);
                }
              }}
              disabled={isDisabled}
              className={classNames(
                'flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition',
                isCompleted
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                  : isActive
                  ? 'border-primary bg-primary text-white shadow-lg'
                  : isDisabled
                  ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-primary hover:text-primary'
              )}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`${step.title} step ${position}`}
              aria-disabled={isDisabled}
              data-step-status={status}
            >
              {isCompleted ? <CheckIcon className="h-4 w-4" /> : position}
            </button>
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{step.title}</p>
              {step.description ? (
                <p className="text-[11px] text-slate-400">{step.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

FormStepper.propTypes = {
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
      disabled: PropTypes.bool
    })
  ).isRequired,
  currentStep: PropTypes.string.isRequired,
  onSelect: PropTypes.func
};

FormStepper.defaultProps = {
  onSelect: () => {}
};
