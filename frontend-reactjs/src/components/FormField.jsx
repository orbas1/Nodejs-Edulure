import PropTypes from 'prop-types';

export default function FormField({
  label,
  type = 'text',
  name,
  placeholder,
  required = true,
  children,
  helper,
  ...inputProps
}) {
  const { className: customClassName, ...restProps } = inputProps;
  const inputClassName = `mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
    customClassName ?? ''
  }`.trim();

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      {children ? (
        children
      ) : (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          required={required}
          {...restProps}
          className={inputClassName}
        />
      )}
      {helper ? <p className="mt-2 text-xs text-slate-500">{helper}</p> : null}
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
  helper: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func
};
