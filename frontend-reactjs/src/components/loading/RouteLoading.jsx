import PropTypes from 'prop-types';

export default function RouteLoading({ label }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center px-6 py-16" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4 text-center text-slate-600">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-600">{label}</p>
      </div>
    </div>
  );
}

RouteLoading.propTypes = {
  label: PropTypes.string
};

RouteLoading.defaultProps = {
  label: 'Loading the experience…'
};
