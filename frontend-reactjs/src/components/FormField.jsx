import { useId } from 'react';
import PropTypes from 'prop-types';

export default function FormField({
  label,
  type = 'text',
  name,
  placeholder,
  required = true,
  children,
  helper,
  error,
  ...inputProps
}) {
  const generatedId = useId();
  const { className: customClassName, id: providedId, ...restProps } = inputProps;
  const inputId = providedId ?? name ?? generatedId;
  const helperId = helper ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;
  const inputClassName = `form-input mt-2 ${customClassName ?? ''}`.trim();

  return (
    <label className="block" htmlFor={inputId}>
      <span className="form-label">{label}</span>
      {children ? (
        children
      ) : (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          required={required}
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : 'false'}
          {...restProps}
          className={inputClassName}
        />
      )}
      {helper ? (
        <p id={helperId} className="form-helper">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 text-xs font-semibold text-rose-600">
          {error}
        </p>
      ) : null}
    </label>
  );
}

FormField.propTypes = {
  label: PropTypes.string.isRequired,
  type: PropTypes.string,
  name: PropTypes.string,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  children: PropTypes.node,
  helper: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func
};
