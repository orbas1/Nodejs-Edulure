import clsx from 'clsx';

function formatCurrency(amountCents, currency = 'USD') {
  const amount = Number.isFinite(Number(amountCents)) ? Number(amountCents) / 100 : 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (_error) {
    return `${currency} ${(amount ?? 0).toFixed(2)}`;
  }
}

export default function CheckoutPriceSummary({
  currency = 'USD',
  lineItems = [],
  discount,
  tax,
  totalCents,
  footer,
  note
}) {
  const subtotal = lineItems.reduce((sum, item) => sum + Number(item.amountCents ?? 0), 0);
  const discountCents = Number(discount?.amountCents ?? 0);
  const taxCents = Number(tax?.amountCents ?? 0);
  const computedTotal = totalCents ?? Math.max(0, subtotal - discountCents + taxCents);

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
      <div className="space-y-3 text-sm text-slate-700">
        {lineItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between">
            <span>{item.label ?? 'Line item'}</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(item.amountCents ?? 0, item.currency ?? currency)}
            </span>
          </div>
        ))}

        <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs uppercase tracking-wide text-slate-500">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-700">{formatCurrency(subtotal, currency)}</span>
        </div>

        {discountCents > 0 ? (
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-600">
            <span>{discount?.label ?? 'Discount'}</span>
            <span>-{formatCurrency(discountCents, discount?.currency ?? currency)}</span>
          </div>
        ) : null}

        {taxCents > 0 ? (
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>{tax?.label ?? 'Estimated tax'}</span>
            <span>{formatCurrency(taxCents, tax?.currency ?? currency)}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-inner">
          <span>Total due</span>
          <span>{formatCurrency(computedTotal, currency)}</span>
        </div>

        {note ? <p className="text-xs text-slate-500">{note}</p> : null}
      </div>

      {footer ? <div className={clsx('mt-3 text-xs text-slate-500')}>{footer}</div> : null}
    </div>
  );
}
