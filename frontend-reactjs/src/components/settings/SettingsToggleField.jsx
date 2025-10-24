import { useId } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

export default function SettingsToggleField({
  id,
  name,
  label,
  description,
  checked,
  onChange,
  disabled,
  meta,
  supportingAction
}) {
  const autoId = useId();
  const controlId = id ?? `${name ?? 'settings-toggle'}-${autoId}`;
  const descriptionId = description ? `${controlId}-description` : undefined;

  return (
    <div
      className={clsx(
        'flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm transition',
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-primary/50'
      )}
    >
      <div className="max-w-xl space-y-2">
        <div className="flex items-start justify-between gap-3">
          <label htmlFor={controlId} className="text-sm font-semibold text-slate-800">
            {label}
          </label>
          {meta ? <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{meta}</span> : null}
        </div>
        {description ? (
          <p id={descriptionId} className="text-xs text-slate-500">
            {description}
          </p>
        ) : null}
        {supportingAction ? <div className="text-xs text-primary">{supportingAction}</div> : null}
      </div>
      <div className="flex items-center gap-3">
        <input
          id={controlId}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
          className="sr-only"
          aria-describedby={descriptionId}
        />
        <button
          type="button"
          className={clsx(
            'relative inline-flex h-6 w-11 items-center rounded-full border transition',
            checked ? 'border-primary bg-primary' : 'border-slate-200 bg-slate-200',
            disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
          )}
          onClick={() => onChange(!checked)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onChange(!checked);
            }
          }}
          role="switch"
          aria-checked={checked}
          aria-pressed={checked}
          aria-label={label}
          aria-controls={controlId}
          aria-describedby={descriptionId}
          disabled={disabled}
        >
          <span
            className={clsx(
              'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
              checked ? 'translate-x-5' : 'translate-x-1'
            )}
          />
        </button>
      </div>
    </div>
  );
}

SettingsToggleField.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.string.isRequired,
  description: PropTypes.node,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  meta: PropTypes.node,
  supportingAction: PropTypes.node
};

SettingsToggleField.defaultProps = {
  id: undefined,
  name: undefined,
  description: undefined,
  disabled: false,
  meta: undefined,
  supportingAction: undefined
};
