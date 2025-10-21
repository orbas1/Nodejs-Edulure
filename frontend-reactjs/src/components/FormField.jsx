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
  const inputClassName = `mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
    customClassName ?? ''
  }`.trim();

  return (
    <label className="block" htmlFor={inputId}>
      <span className="text-sm font-semibold text-slate-600">{label}</span>
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
        <p id={helperId} className="mt-2 text-xs text-slate-500">
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
