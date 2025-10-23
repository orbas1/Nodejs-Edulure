import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { CheckCircleIcon, CreditCardIcon, XMarkIcon } from '@heroicons/react/24/outline';

import PriceSummary from './PriceSummary.jsx';

function formatProviderLabel(provider) {
  switch (provider) {
    case 'paypal':
      return 'PayPal';
    case 'escrow':
      return 'Escrow';
    default:
      return 'Stripe';
  }
}

function formatCurrency(amountCents, currency) {
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return formatter.format((amountCents ?? 0) / 100);
}

export default function CheckoutDialog({
  open,
  entity,
  form,
  onFormChange,
  onSubmit,
  onClose,
  status,
  pending,
  providerOptions,
  summary,
  couponInsight,
  onCouponChange
}) {
  const providers = providerOptions?.length ? providerOptions : ['stripe', 'paypal'];

  const badgeLabel = entity?.badge ?? entity?.type ?? 'Checkout';
  const heading = entity?.title ?? 'Secure checkout';
  const summaryCurrency = summary?.currency ?? 'USD';

  const couponMessage = useMemo(() => {
    if (!couponInsight) {
      return null;
    }
    if (couponInsight.status === 'valid') {
      const coupon = couponInsight.coupon;
      if (!coupon) return 'Coupon applied.';
      if (coupon.discountType === 'percentage') {
        const percentage = Math.round(Number(coupon.discountValue ?? 0) / 100);
        return `${coupon.code} applied · ${percentage}% off eligible items.`;
      }
      return `${coupon.code} applied · ${formatCurrency(
        Number(coupon.discountValue ?? 0),
        coupon.currency ?? summaryCurrency
      )} off.`;
    }
    if (couponInsight.status === 'invalid') {
      return couponInsight.message ?? 'Coupon not valid for this checkout.';
    }
    if (couponInsight.status === 'checking') {
      return 'Checking coupon…';
    }
    return null;
  }, [couponInsight, summaryCurrency]);

  if (!open) {
    return null;
  }

  const handleChange = (partial) => {
    if (typeof onFormChange === 'function') {
      onFormChange({
        ...form,
        ...partial
      });
    }
  };

  const handleCouponInput = (event) => {
    const value = event.target.value;
    const nextValue = value.toUpperCase();
    handleChange({ couponCode: nextValue });
    if (typeof onCouponChange === 'function') {
      onCouponChange(nextValue);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-end bg-slate-900/40 px-4 py-6">
      <div className="relative w-full max-w-xl rounded-4xl border border-slate-200 bg-white/95 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:text-rose-500"
        >
          <XMarkIcon className="h-5 w-5" />
          <span className="sr-only">Close checkout</span>
        </button>
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <CreditCardIcon className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">{badgeLabel}</p>
            <h3 className="text-xl font-semibold text-slate-900">{heading}</h3>
            {entity?.subtitle ? <p className="text-xs text-slate-500">{entity.subtitle}</p> : null}
          </div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Provider</span>
            <div className="grid grid-cols-2 gap-2">
              {providers.map((provider) => {
                const active = form.provider === provider;
                return (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => handleChange({ provider })}
                    className={`rounded-3xl border px-4 py-3 text-sm font-semibold capitalize transition ${
                      active
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {formatProviderLabel(provider)}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Seats</span>
            <input
              type="number"
              min="1"
              max="500"
              value={form.quantity}
              onChange={(event) => handleChange({ quantity: Number(event.target.value) || 1 })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Receipt email</span>
            <input
              type="email"
              value={form.receiptEmail}
              onChange={(event) => handleChange({ receiptEmail: event.target.value })}
              placeholder="finance@company.com"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coupon code</span>
            <input
              type="text"
              value={form.couponCode}
              onChange={handleCouponInput}
              placeholder="GROWTH50"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {couponMessage ? (
              <p
                className={`text-xs font-semibold ${
                  couponInsight?.status === 'valid'
                    ? 'text-emerald-600'
                    : couponInsight?.status === 'invalid'
                      ? 'text-rose-600'
                      : 'text-slate-500'
                }`}
              >
                {couponMessage}
              </p>
            ) : null}
          </label>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tax country</span>
              <input
                type="text"
                maxLength={2}
                value={form.taxCountry}
                onChange={(event) => handleChange({ taxCountry: event.target.value.toUpperCase() })}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="US"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Region</span>
              <input
                type="text"
                maxLength={3}
                value={form.taxRegion}
                onChange={(event) => handleChange({ taxRegion: event.target.value.toUpperCase() })}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="CA"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Postal code</span>
              <input
                type="text"
                maxLength={12}
                value={form.taxPostalCode}
                onChange={(event) => handleChange({ taxPostalCode: event.target.value })}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="10001"
              />
            </label>
          </div>

          {summary ? (
            <PriceSummary
              currency={summary.currency}
              unitAmount={summary.unitAmount}
              quantity={summary.quantity}
              subtotal={summary.subtotal}
              discount={summary.discount}
              total={summary.total}
              footnote={form.provider ? `${formatProviderLabel(form.provider)} handles secure payment processing.` : null}
            />
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Creating payment intent…' : 'Generate payment intent'}
          </button>
        </form>

        {status ? (
          <div
            className={`mt-4 rounded-3xl border px-4 py-3 text-sm ${
              status.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : status.type === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-primary/30 bg-primary/10 text-primary'
            }`}
          >
            {status.type === 'success' ? <CheckCircleIcon className="mr-2 inline h-4 w-4" /> : null}
            {status.message}
          </div>
        ) : null}
      </div>
    </div>
  );
}

CheckoutDialog.propTypes = {
  open: PropTypes.bool,
  entity: PropTypes.shape({
    badge: PropTypes.string,
    type: PropTypes.string,
    title: PropTypes.string,
    subtitle: PropTypes.string
  }),
  form: PropTypes.shape({
    provider: PropTypes.string,
    quantity: PropTypes.number,
    receiptEmail: PropTypes.string,
    couponCode: PropTypes.string,
    taxCountry: PropTypes.string,
    taxRegion: PropTypes.string,
    taxPostalCode: PropTypes.string
  }).isRequired,
  onFormChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  status: PropTypes.shape({
    type: PropTypes.oneOf(['pending', 'success', 'error']),
    message: PropTypes.string
  }),
  pending: PropTypes.bool,
  providerOptions: PropTypes.arrayOf(PropTypes.string),
  summary: PropTypes.shape({
    currency: PropTypes.string,
    unitAmount: PropTypes.number,
    quantity: PropTypes.number,
    subtotal: PropTypes.number,
    discount: PropTypes.number,
    total: PropTypes.number
  }),
  couponInsight: PropTypes.shape({
    status: PropTypes.oneOf(['idle', 'checking', 'valid', 'invalid']),
    coupon: PropTypes.object,
    message: PropTypes.string
  }),
  onCouponChange: PropTypes.func
};

CheckoutDialog.defaultProps = {
  open: false,
  entity: null,
  status: null,
  pending: false,
  providerOptions: ['stripe', 'paypal'],
  summary: null,
  couponInsight: null,
  onCouponChange: undefined
};
