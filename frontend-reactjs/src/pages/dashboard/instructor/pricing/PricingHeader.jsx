import PropTypes from 'prop-types';

export default function PricingHeader({ onExportFinanceReport, onConfigureRules }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Monetisation control centre</h1>
        <p className="mt-2 text-sm text-slate-600">
          Track cohort pricing, subscription tiers, and live session utilisation to keep revenue streams healthy.
        </p>
      </div>
      <div className="flex gap-3">
        <button type="button" className="dashboard-primary-pill" onClick={onExportFinanceReport}>
          Export finance report
        </button>
        <button type="button" className="dashboard-pill" onClick={onConfigureRules}>
          Configure pricing rules
        </button>
      </div>
    </div>
  );
}

PricingHeader.propTypes = {
  onExportFinanceReport: PropTypes.func,
  onConfigureRules: PropTypes.func
};

PricingHeader.defaultProps = {
  onExportFinanceReport: undefined,
  onConfigureRules: undefined
};
