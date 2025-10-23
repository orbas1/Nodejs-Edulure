import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { trapFocus } from '../../../../utils/a11y.js';

const DEFAULT_FORM = {
  name: '',
  price: '',
  currency: 'USD',
  billingInterval: 'monthly',
  trialPeriodDays: 0,
  description: '',
  benefits: '',
  stripePriceId: '',
  paypalPlanId: '',
  isActive: true
};

const FORM_LABEL_CLASS = 'text-sm font-semibold text-slate-700';
const FORM_INPUT_CLASS =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

const BILLING_INTERVALS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'lifetime', label: 'Lifetime' }
];

const CURRENCIES = ['USD', 'GBP', 'EUR', 'AUD', 'CAD'];

function normaliseBenefits(value) {
  if (Array.isArray(value)) {
    return value.join('\n');
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
}

export default function PricingTierDialog({
  isOpen,
  mode,
  tier,
  onSubmit,
  onClose,
  submitting,
  onDelete,
  deleting
}) {
  const containerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setConfirmingDelete(false);
    const initial = tier
      ? {
          name: tier.name ?? '',
          price: tier.priceCents != null ? (tier.priceCents / 100).toFixed(2) : '',
          currency: tier.currency ?? 'USD',
          billingInterval: tier.billingInterval ?? 'monthly',
          trialPeriodDays: tier.trialPeriodDays ?? 0,
          description: tier.description ?? '',
          benefits: normaliseBenefits(tier.benefits),
          stripePriceId: tier.stripePriceId ?? '',
          paypalPlanId: tier.paypalPlanId ?? '',
          isActive: tier.isActive ?? true
        }
      : DEFAULT_FORM;
    setForm(initial);
    setErrors({});
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    });
  }, [isOpen, tier]);

  useEffect(() => {
    if (!isOpen) {
      return () => {};
    }

    return trapFocus(containerRef.current, {
      initialFocus: closeButtonRef.current
    });
  }, [isOpen]);

  const dialogTitle = useMemo(
    () => (mode === 'edit' ? 'Update subscription tier' : 'Create subscription tier'),
    [mode]
  );

  if (!isOpen) {
    return null;
  }

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim()) {
      nextErrors.name = 'Tier name is required.';
    }
    const priceNumber = Number.parseFloat(form.price);
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      nextErrors.price = 'Enter a valid price above zero.';
    }
    if (!CURRENCIES.includes(form.currency)) {
      nextErrors.currency = 'Select a supported currency.';
    }
    if (!BILLING_INTERVALS.some((interval) => interval.value === form.billingInterval)) {
      nextErrors.billingInterval = 'Select a billing interval.';
    }
    if (form.trialPeriodDays < 0 || form.trialPeriodDays > 90) {
      nextErrors.trialPeriodDays = 'Trial period must be between 0 and 90 days.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    const priceNumber = Number.parseFloat(form.price);
    const benefits = form.benefits
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      id: tier?.id ?? null,
      name: form.name.trim(),
      priceCents: Math.round(priceNumber * 100),
      currency: form.currency,
      billingInterval: form.billingInterval,
      trialPeriodDays: Number.parseInt(form.trialPeriodDays, 10) || 0,
      description: form.description?.trim() || null,
      benefits,
      stripePriceId: form.stripePriceId?.trim() || undefined,
      paypalPlanId: form.paypalPlanId?.trim() || undefined,
      isActive: Boolean(form.isActive)
    };
    onSubmit?.(payload);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tier-dialog-title"
    >
      <form
        className="w-full max-w-3xl rounded-3xl bg-white p-8 shadow-2xl"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="tier-dialog-title" className="text-xl font-semibold text-slate-900">
              {dialogTitle}
            </h2>
            <p className="text-sm text-slate-500">
              Define pricing, benefits, and billing cadence for your gated community experiences.
            </p>
          </div>
          <button
            type="button"
            className="dashboard-pill"
            onClick={onClose}
            ref={closeButtonRef}
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={FORM_LABEL_CLASS} htmlFor="tier-name">
              Tier name
            </label>
            <input
              id="tier-name"
              className={FORM_INPUT_CLASS}
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="e.g. Operator Guild Pro"
              required
            />
            {errors.name ? <p className="mt-1 text-xs text-rose-600">{errors.name}</p> : null}
          </div>

          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="tier-price">
              Price
            </label>
            <input
              id="tier-price"
              className={FORM_INPUT_CLASS}
              value={form.price}
              onChange={(event) => updateField('price', event.target.value)}
              placeholder="199.00"
              required
            />
            {errors.price ? <p className="mt-1 text-xs text-rose-600">{errors.price}</p> : null}
          </div>

          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="tier-currency">
              Currency
            </label>
            <select
              id="tier-currency"
              className={FORM_INPUT_CLASS}
              value={form.currency}
              onChange={(event) => updateField('currency', event.target.value)}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            {errors.currency ? <p className="mt-1 text-xs text-rose-600">{errors.currency}</p> : null}
          </div>

          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="tier-interval">
              Billing interval
            </label>
            <select
              id="tier-interval"
              className={FORM_INPUT_CLASS}
              value={form.billingInterval}
              onChange={(event) => updateField('billingInterval', event.target.value)}
            >
              {BILLING_INTERVALS.map((interval) => (
                <option key={interval.value} value={interval.value}>
                  {interval.label}
                </option>
              ))}
            </select>
            {errors.billingInterval ? (
              <p className="mt-1 text-xs text-rose-600">{errors.billingInterval}</p>
            ) : null}
          </div>

          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="tier-trial">
              Trial period (days)
            </label>
            <input
              id="tier-trial"
              type="number"
              min="0"
              max="90"
              className={FORM_INPUT_CLASS}
              value={form.trialPeriodDays}
              onChange={(event) => updateField('trialPeriodDays', Number(event.target.value))}
            />
            {errors.trialPeriodDays ? (
              <p className="mt-1 text-xs text-rose-600">{errors.trialPeriodDays}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Offer an optional free trial to reduce friction.</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className={FORM_LABEL_CLASS} htmlFor="tier-description">
              Description
            </label>
            <textarea
              id="tier-description"
              className={`${FORM_INPUT_CLASS} min-h-[120px]`}
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="Outline who this tier serves and what outcomes they unlock."
            />
          </div>

          <div className="md:col-span-2">
            <label className={FORM_LABEL_CLASS} htmlFor="tier-benefits">
              Benefits (one per line)
            </label>
            <textarea
              id="tier-benefits"
              className={`${FORM_INPUT_CLASS} min-h-[100px]`}
              value={form.benefits}
              onChange={(event) => updateField('benefits', event.target.value)}
              placeholder={`Live cohort access\nPrivate deal flow channel\nWeekly operator office hours`}
            />
          </div>

          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="tier-stripe">
              Stripe price ID (optional)
            </label>
            <input
              id="tier-stripe"
              className={FORM_INPUT_CLASS}
              value={form.stripePriceId}
              onChange={(event) => updateField('stripePriceId', event.target.value)}
              placeholder="price_12345"
            />
          </div>

          <div>
            <label className={FORM_LABEL_CLASS} htmlFor="tier-paypal">
              PayPal plan ID (optional)
            </label>
            <input
              id="tier-paypal"
              className={FORM_INPUT_CLASS}
              value={form.paypalPlanId}
              onChange={(event) => updateField('paypalPlanId', event.target.value)}
              placeholder="P-12345"
            />
          </div>

          {mode === 'edit' ? (
            <label className={`${FORM_LABEL_CLASS} flex items-center gap-2`} htmlFor="tier-active">
              <input
                id="tier-active"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                checked={Boolean(form.isActive)}
                onChange={(event) => updateField('isActive', event.target.checked)}
              />
              Tier is active and available for checkout
            </label>
            ) : null}
        </div>

        {mode === 'edit' && onDelete ? (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50/60 p-5">
            {confirmingDelete ? (
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-rose-700">Confirm deletion</h3>
                  <p className="text-sm text-rose-600">
                    Removing this tier immediately disconnects it from checkout providers and hides it from prospective
                    members. Existing subscribers remain active until you manage them individually.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="dashboard-pill"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                  >
                    Keep tier
                  </button>
                  <button
                    type="button"
                    className="dashboard-pill border-rose-300 bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => onDelete?.()}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting…' : 'Delete tier'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-rose-700">Need to remove this tier?</h3>
                  <p className="text-sm text-rose-600">
                    Delete tiers that are no longer relevant or when migrating members to a new pricing structure.
                  </p>
                </div>
                <button
                  type="button"
                  className="dashboard-pill border-rose-200 text-rose-600 hover:bg-white"
                  onClick={() => setConfirmingDelete(true)}
                >
                  Start delete flow
                </button>
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Map this tier to your checkout provider to activate automatic billing and revenue recognition.
          </p>
          <div className="flex gap-3">
            <button type="button" className="dashboard-pill" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="dashboard-primary-pill" disabled={submitting}>
              {submitting ? 'Saving…' : mode === 'edit' ? 'Save tier' : 'Create tier'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

PricingTierDialog.propTypes = {
  isOpen: PropTypes.bool,
  mode: PropTypes.oneOf(['create', 'edit']),
  tier: PropTypes.object,
  onSubmit: PropTypes.func,
  onClose: PropTypes.func,
  submitting: PropTypes.bool,
  onDelete: PropTypes.func,
  deleting: PropTypes.bool
};

PricingTierDialog.defaultProps = {
  isOpen: false,
  mode: 'create',
  tier: null,
  onSubmit: undefined,
  onClose: undefined,
  submitting: false,
  onDelete: undefined,
  deleting: false
};
