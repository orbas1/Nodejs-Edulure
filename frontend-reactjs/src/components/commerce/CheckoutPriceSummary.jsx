import PropTypes from 'prop-types';
import clsx from 'clsx';

import { formatCurrencyFromCents } from '../../utils/commerceFormatting.js';

export default function CheckoutPriceSummary({
  currency = 'USD',
  lineItems = [],
  discount,
  tax,
  totalCents,
  footer,
  note,
  adjustments = []
}) {
  const subtotal = lineItems.reduce((sum, item) => sum + Number(item.amountCents ?? 0), 0);
  const discountCents = Number(discount?.amountCents ?? 0);
  const taxCents = Number(tax?.amountCents ?? 0);
  const computedTotal = totalCents ?? Math.max(0, subtotal - discountCents + taxCents);

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
      <div className="space-y-3 text-sm text-slate-700">
        {lineItems.map((item) => {
          const itemCurrency = item.currency ?? currency;
          const amount = formatCurrencyFromCents(item.amountCents ?? 0, {
            currency: itemCurrency
          });
          return (
            <div
              key={item.id ?? item.label}
              className={clsx('rounded-2xl px-3 py-2', {
                'bg-white shadow-inner': item.emphasis === 'highlight',
                'bg-emerald-50': item.type === 'credit'
              })}
            >
              <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                <span>{item.label ?? 'Line item'}</span>
                <span className={clsx({ 'text-emerald-600': item.type === 'credit' })}>{amount}</span>
              </div>
              {item.description ? <p className="mt-1 text-xs text-slate-500">{item.description}</p> : null}
              {item.badge ? (
                <span className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {item.badge}
                </span>
              ) : null}
            </div>
          );
        })}

        <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs uppercase tracking-wide text-slate-500">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-700">{formatCurrencyFromCents(subtotal, { currency })}</span>
        </div>

        {discountCents > 0 ? (
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-600">
            <span>{discount?.label ?? 'Discount'}</span>
            <span>-{formatCurrencyFromCents(discountCents, { currency: discount?.currency ?? currency })}</span>
          </div>
        ) : null}

        {taxCents > 0 ? (
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>{tax?.label ?? 'Estimated tax'}</span>
            <span>{formatCurrencyFromCents(taxCents, { currency: tax?.currency ?? currency })}</span>
          </div>
        ) : null}

        {adjustments.map((adjustment) => (
          <div
            key={adjustment.id ?? adjustment.label}
            className={clsx('flex items-center justify-between rounded-2xl px-3 py-2 text-xs font-semibold', {
              'bg-amber-50 text-amber-700': adjustment.type === 'warning',
              'bg-emerald-50 text-emerald-700': adjustment.type === 'success',
              'bg-slate-100 text-slate-700': !adjustment.type
            })}
          >
            <span>{adjustment.label}</span>
            <span>{adjustment.value}</span>
          </div>
        ))}

        <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-inner">
          <span>Total due</span>
          <span>{formatCurrencyFromCents(computedTotal, { currency })}</span>
        </div>

        {note ? <p className="text-xs text-slate-500">{note}</p> : null}
      </div>

      {footer ? <div className={clsx('mt-3 text-xs text-slate-500')}>{footer}</div> : null}
    </div>
  );
}

CheckoutPriceSummary.propTypes = {
  currency: PropTypes.string,
  lineItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.string,
      amountCents: PropTypes.number,
      currency: PropTypes.string,
      description: PropTypes.string,
      badge: PropTypes.string,
      emphasis: PropTypes.oneOf(['highlight']),
      type: PropTypes.oneOf(['charge', 'credit'])
    })
  ),
  discount: PropTypes.shape({
    label: PropTypes.string,
    amountCents: PropTypes.number,
    currency: PropTypes.string
  }),
  tax: PropTypes.shape({
    label: PropTypes.string,
    amountCents: PropTypes.number,
    currency: PropTypes.string
  }),
  totalCents: PropTypes.number,
  footer: PropTypes.node,
  note: PropTypes.node,
  adjustments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.string.isRequired,
      value: PropTypes.node,
      type: PropTypes.oneOf(['warning', 'success'])
    })
  )
};
