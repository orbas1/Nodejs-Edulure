import PropTypes from 'prop-types';

export default function PricingHeader({ onExportFinanceReport, onConfigureRules, isExporting }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Monetisation control centre</h1>
        <p className="mt-2 text-sm text-slate-600">
          Track cohort pricing, subscription tiers, and live session utilisation to keep revenue streams healthy.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          className="dashboard-primary-pill disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onExportFinanceReport}
          disabled={isExporting}
          aria-busy={isExporting}
        >
          {isExporting ? 'Exporting…' : 'Export finance report'}
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
  onConfigureRules: PropTypes.func,
  isExporting: PropTypes.bool
};

PricingHeader.defaultProps = {
  onExportFinanceReport: undefined,
  onConfigureRules: undefined,
  isExporting: false
};
