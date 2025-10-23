import PropTypes from 'prop-types';

function formatPrice(amountCents, currency = 'USD', interval = 'month') {
  if (amountCents === null || amountCents === undefined) {
    return 'Contact us';
  }
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency
  });
  const formatted = formatter.format(Math.max(0, Number(amountCents) / 100));
  const cadence = interval === 'one_time' ? '' : `/${interval.replace('_', ' ')}`;
  return `${formatted}${cadence}`.trim();
}

export default function PlanComparison({ title, description, plans, addons }) {
  if ((!plans || plans.length === 0) && (!addons || addons.length === 0)) {
    return null;
  }

  return (
    <section className="rounded-4xl border border-slate-200 bg-white/90 p-8 shadow-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Plans</p>
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
        </div>
      </div>

      {plans?.length ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`flex h-full flex-col gap-4 rounded-3xl border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                plan.bestValue
                  ? 'border-primary/60 bg-primary/5'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{plan.name}</p>
                  {plan.badge ? (
                    <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {plan.badge}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm font-semibold text-primary">{formatPrice(plan.amountCents, plan.currency, plan.interval)}</p>
              </div>
              {plan.description ? <p className="text-sm text-slate-600">{plan.description}</p> : null}
              {Array.isArray(plan.features) && plan.features.length ? (
                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {addons?.length ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-6">
          <p className="text-sm font-semibold text-slate-800">Optional add-ons</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {addons.map((addon) => (
              <div key={addon.id} className="rounded-2xl border border-slate-200 bg-white/90 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-slate-900">{addon.name}</p>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {addon.optional ? 'Optional' : 'Included'}
                  </span>
                </div>
                {addon.description ? <p className="mt-1 text-sm text-slate-600">{addon.description}</p> : null}
                <div className="mt-2 text-sm font-semibold text-primary">
                  {formatPrice(addon.amountCents, addon.currency, addon.interval)}
                </div>
                {addon.upsellDescriptor ? (
                  <p className="mt-2 text-xs text-slate-500">{addon.upsellDescriptor}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

PlanComparison.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  plans: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      amountCents: PropTypes.number,
      currency: PropTypes.string,
      interval: PropTypes.string,
      description: PropTypes.string,
      features: PropTypes.arrayOf(PropTypes.string),
      badge: PropTypes.string,
      bestValue: PropTypes.bool
    })
  ),
  addons: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      amountCents: PropTypes.number,
      currency: PropTypes.string,
      interval: PropTypes.string,
      description: PropTypes.string,
      optional: PropTypes.bool,
      upsellDescriptor: PropTypes.string
    })
  )
};

PlanComparison.defaultProps = {
  description: null,
  plans: [],
  addons: []
};
