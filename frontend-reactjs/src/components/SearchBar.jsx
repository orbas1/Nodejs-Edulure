import PropTypes from 'prop-types';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function SearchBar({
  value,
  defaultValue,
  onChange,
  onSubmit,
  placeholder = 'Search across courses, communities, lessons...',
  loading = false,
  ariaLabel = 'Search the catalogue',
  allowClear = false,
  onClear,
  onKeyDown,
  onFocus
}) {
  const handleSubmit = (event) => {
    if (typeof onSubmit !== 'function') return;
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const submittedValue = formData.get('search');
    onSubmit(
      event,
      typeof submittedValue === 'string' ? submittedValue : ''
    );
  };

  const inputProps = {
    type: 'search',
    placeholder,
    'aria-label': ariaLabel,
    className:
      'w-full rounded-full border border-slate-200 bg-white px-12 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
    autoComplete: 'off',
    name: 'search'
  };

  if (value !== undefined) {
    inputProps.value = value;
  } else if (defaultValue !== undefined) {
    inputProps.defaultValue = defaultValue;
  }

  if (onChange) {
    inputProps.onChange = (event) => onChange(event.target.value, event);
  }

  if (onKeyDown) {
    inputProps.onKeyDown = onKeyDown;
  }

  if (onFocus) {
    inputProps.onFocus = onFocus;
  }

  const inputField = (
    <>
      <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input {...inputProps} />
      {loading && (
        <div
          className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-200 border-t-primary"
          aria-hidden="true"
        />
      )}
      {allowClear && (value?.length || defaultValue?.length) && (
        <button
          type="button"
          onClick={() => {
            onChange?.('', null);
            onClear?.();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 transition hover:bg-slate-200"
        >
          Clear
        </button>
      )}
    </>
  );

  if (typeof onSubmit === 'function') {
    return (
      <form className="relative" onSubmit={handleSubmit} role="search">
        {inputField}
      </form>
    );
  }

  return <div className="relative" role="search">{inputField}</div>;
}

SearchBar.propTypes = {
  value: PropTypes.string,
  defaultValue: PropTypes.string,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  placeholder: PropTypes.string,
  loading: PropTypes.bool,
  ariaLabel: PropTypes.string,
  allowClear: PropTypes.bool,
  onClear: PropTypes.func,
  onKeyDown: PropTypes.func,
  onFocus: PropTypes.func
};

SearchBar.defaultProps = {
  value: undefined,
  defaultValue: undefined,
  onChange: undefined,
  onSubmit: undefined,
  placeholder: 'Search across courses, communities, lessons...',
  loading: false,
  ariaLabel: 'Search the catalogue',
  allowClear: false,
  onClear: undefined,
  onKeyDown: undefined,
  onFocus: undefined
};
