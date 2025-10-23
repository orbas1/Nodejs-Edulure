import PropTypes from 'prop-types';
import clsx from 'clsx';

export default function ToggleField({ label, description, checked, onChange, disabled = false, id }) {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const controlId = id ?? `${label.replace(/\s+/g, '-').toLowerCase()}-toggle`;

  return (
    <div className={clsx('flex items-start justify-between gap-3 rounded-2xl border p-4', disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-primary/50')}>
      <div>
        <p className="text-sm font-semibold text-slate-800" id={`${controlId}-label`}>
          {label}
        </p>
        {description ? (
          <p className="mt-1 text-xs text-slate-500" id={`${controlId}-description`}>
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className={clsx(
          'relative inline-flex h-6 w-11 items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/80',
          checked ? 'bg-primary' : 'bg-slate-200'
        )}
        onClick={handleToggle}
        disabled={disabled}
        aria-pressed={checked}
        aria-labelledby={`${controlId}-label`}
        aria-describedby={description ? `${controlId}-description` : undefined}
      >
        <span
          className={clsx(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition',
            checked ? 'translate-x-5' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}

ToggleField.propTypes = {
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  id: PropTypes.string
};

ToggleField.defaultProps = {
  description: undefined,
  disabled: false,
  id: undefined
};
