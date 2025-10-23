import { useId } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

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
  const inputClassName = clsx('form-field__input', customClassName);

  return (
    <label className="form-field" htmlFor={inputId}>
      <span className="form-field__label">{label}</span>
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
        <p id={helperId} className="form-field__helper">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="form-field__error">
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
