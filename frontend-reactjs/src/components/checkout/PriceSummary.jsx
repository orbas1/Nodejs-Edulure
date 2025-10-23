import PropTypes from 'prop-types';

function formatAmount(amountCents, currency) {
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return formatter.format((amountCents ?? 0) / 100);
}

export default function PriceSummary({
  currency,
  unitAmount,
  quantity,
  subtotal,
  discount,
  total,
  footnote
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600">
      <div className="flex items-center justify-between font-semibold text-slate-900">
        <span>Subtotal</span>
        <span>{formatAmount(subtotal, currency)}</span>
      </div>
      <dl className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Unit price</dt>
          <dd className="font-medium text-slate-700">{formatAmount(unitAmount, currency)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Seats</dt>
          <dd className="font-medium text-slate-700">× {quantity}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Discount</dt>
          <dd className="font-medium text-emerald-600">{discount ? `− ${formatAmount(discount, currency)}` : '—'}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Estimated tax</dt>
          <dd className="font-medium text-slate-500">Calculated at payment</dd>
        </div>
      </dl>
      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
        <span>Total due</span>
        <span>{formatAmount(total, currency)}</span>
      </div>
      {footnote ? <p className="mt-3 text-xs text-slate-400">{footnote}</p> : null}
    </section>
  );
}

PriceSummary.propTypes = {
  currency: PropTypes.string.isRequired,
  unitAmount: PropTypes.number.isRequired,
  quantity: PropTypes.number.isRequired,
  subtotal: PropTypes.number.isRequired,
  discount: PropTypes.number,
  total: PropTypes.number.isRequired,
  footnote: PropTypes.string
};

PriceSummary.defaultProps = {
  discount: 0,
  footnote: null
};
