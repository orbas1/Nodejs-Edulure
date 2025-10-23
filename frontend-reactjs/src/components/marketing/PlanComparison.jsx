import PropTypes from 'prop-types';
import clsx from 'clsx';

import { trackEvent } from '../../lib/analytics.js';

function formatMonthly(amountCents, currency) {
  const amount = Number.isFinite(amountCents) ? amountCents / 100 : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency
    }).format(amount);
  } catch (error) {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function PlanComparison({ plans, currency, onSelectPlan }) {
  const entries = Array.isArray(plans) ? plans.filter(Boolean) : [];
  if (!entries.length) {
    return null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {entries.map((plan) => {
        const priceLabel = formatMonthly(plan.priceCents ?? 0, currency);
        const handleSelect = () => {
          trackEvent('plan_select', {
            plan_id: plan.id,
            plan_name: plan.name,
            recommended: Boolean(plan.recommended)
          });
          onSelectPlan?.(plan);
        };
        return (
          <article
            key={plan.id}
            className={clsx(
              'relative flex flex-col gap-5 rounded-4xl border bg-white/90 p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl',
              plan.recommended
                ? 'border-primary/40 bg-gradient-to-br from-primary/10 via-white to-primary/5'
                : 'border-slate-200'
            )}
          >
            {plan.recommended ? (
              <span className="absolute right-6 top-6 inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-600">
                Best value
              </span>
            ) : null}
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">{plan.tierLabel ?? 'Plan'}</p>
              <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
              <p className="text-sm text-slate-600">{plan.description}</p>
            </div>
            <div className="flex items-baseline gap-1 text-slate-900">
              <span className="text-3xl font-semibold">{priceLabel}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">/ month</span>
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              {plan.features?.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleSelect}
              className={clsx(
                'mt-auto inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                plan.recommended
                  ? 'bg-primary text-white shadow-lg hover:bg-primary-dark'
                  : 'border border-slate-300 text-slate-700 hover:border-primary hover:text-primary'
              )}
            >
              {plan.ctaLabel ?? 'Select plan'}
            </button>
            {plan.disclaimer ? (
              <p className="text-xs text-slate-400">{plan.disclaimer}</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

PlanComparison.propTypes = {
  plans: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string,
      priceCents: PropTypes.number,
      tierLabel: PropTypes.string,
      features: PropTypes.arrayOf(PropTypes.string),
      recommended: PropTypes.bool,
      ctaLabel: PropTypes.string,
      disclaimer: PropTypes.string
    })
  ),
  currency: PropTypes.string,
  onSelectPlan: PropTypes.func
};

PlanComparison.defaultProps = {
  plans: undefined,
  currency: 'USD',
  onSelectPlan: undefined
};
