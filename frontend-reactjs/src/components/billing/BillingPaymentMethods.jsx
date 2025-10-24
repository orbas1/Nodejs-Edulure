import PropTypes from 'prop-types';

function formatExpiry(month, year) {
  if (!month || !year) return '—';
  const paddedMonth = String(month).padStart(2, '0');
  return `${paddedMonth}/${String(year).slice(-2)}`;
}

export default function BillingPaymentMethods({ paymentMethods, loading, onManageBilling }) {
  const hasMethods = Array.isArray(paymentMethods) && paymentMethods.length > 0;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Payment methods</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Cards & bank accounts</h3>
          <p className="mt-2 text-xs text-slate-500">Primary funding sources for subscription renewals and usage charges.</p>
        </div>
        <button
          type="button"
          onClick={onManageBilling}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
          disabled={loading}
        >
          Update
        </button>
      </header>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">Loading payment methods…</div>
        ) : null}

        {!loading && !hasMethods ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            No payment method on file. Add a card or bank account to avoid service interruptions.
          </div>
        ) : null}

        {hasMethods
          ? paymentMethods.map((method) => (
              <article
                key={method.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900">{method.displayLabel}</span>
                  <span className="text-xs text-slate-500">{method.brand ?? method.type}</span>
                </div>
                <div className="text-xs text-slate-500">
                  <p>Ending {method.last4 ? `•••• ${method.last4}` : '—'}</p>
                  <p>Expires {formatExpiry(method.expMonth, method.expYear)}</p>
                </div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {method.default ? 'Default' : method.statusLabel ?? 'Backup'}
                </div>
              </article>
            ))
          : null}
      </div>
    </section>
  );
}

BillingPaymentMethods.propTypes = {
  paymentMethods: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      brand: PropTypes.string,
      type: PropTypes.string,
      last4: PropTypes.string,
      expMonth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      expYear: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      default: PropTypes.bool,
      statusLabel: PropTypes.string,
      displayLabel: PropTypes.string
    })
  ),
  loading: PropTypes.bool,
  onManageBilling: PropTypes.func.isRequired
};

BillingPaymentMethods.defaultProps = {
  paymentMethods: [],
  loading: false
};
