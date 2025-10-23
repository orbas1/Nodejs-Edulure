import PropTypes from 'prop-types';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

function formatCurrency(amount, currency) {
  if (!Number.isFinite(amount)) {
    return '';
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2
    }).format(amount);
  } catch (error) {
    return currencyFormatter.format(amount);
  }
}

export default function CommunityMonetizationBanner({
  plans,
  addons,
  isLoading,
  error,
  totalDisplay,
  canManage,
  onManageClick
}) {
  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600" role="alert">
        {error}
      </div>
    );
  }

  const hasPlans = Array.isArray(plans) && plans.length > 0;
  const hasAddons = Array.isArray(addons) && addons.length > 0;

  if (!isLoading && !hasPlans && !hasAddons) {
    return null;
  }

  return (
    <div className="rounded-4xl border border-primary/30 bg-primary/5 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Monetisation insight</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">
            {isLoading ? 'Calculating pricing architecture…' : 'Members see subscription highlights in this hub.'}
          </h3>
          {totalDisplay ? (
            <p className="text-xs text-slate-500">Live selection total: {totalDisplay}</p>
          ) : null}
        </div>
        {typeof onManageClick === 'function' ? (
          <button
            type="button"
            onClick={onManageClick}
            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition ${
              canManage
                ? 'bg-primary text-white shadow-card hover:bg-primary-dark'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary'
            }`}
            disabled={!canManage}
          >
            {canManage ? 'Open monetisation console' : 'View only'}
          </button>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {isLoading ? (
          <div className="rounded-3xl border border-dashed border-primary/30 bg-white/80 px-4 py-3 text-xs text-primary">
            Loading live pricing intelligence…
          </div>
        ) : null}
        {hasPlans
          ? plans.slice(0, 3).map((plan) => {
              const price = formatCurrency((plan.priceCents ?? 0) / 100, plan.currency ?? 'USD');
              return (
                <div
                  key={plan.id}
                  className="rounded-3xl border border-primary/40 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">{plan.name}</span>
                    <span className="text-xs font-semibold text-primary">{price}</span>
                  </div>
                  {plan.intervalLabel ? (
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{plan.intervalLabel}</p>
                  ) : null}
                  {plan.benefits?.length ? (
                    <ul className="mt-2 space-y-1 text-xs text-slate-500">
                      {plan.benefits.slice(0, 3).map((benefit) => (
                        <li key={benefit} className="flex items-center gap-2">
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                            ✓
                          </span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                      {plan.benefits.length > 3 ? (
                        <li className="text-[11px] font-semibold text-primary">+{plan.benefits.length - 3} more benefits</li>
                      ) : null}
                    </ul>
                  ) : null}
                </div>
              );
            })
          : null}
        {hasAddons ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Add-ons</p>
            <ul className="mt-2 space-y-2">
              {addons.slice(0, 3).map((addon) => (
                <li key={addon.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-amber-800">{addon.name}</span>
                  <span className="text-xs font-semibold">
                    +{formatCurrency((addon.priceCents ?? 0) / 100, addon.currency ?? 'USD')}
                  </span>
                </li>
              ))}
              {addons.length > 3 ? (
                <li className="text-[11px] font-semibold text-amber-700">+{addons.length - 3} additional add-ons</li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

CommunityMonetizationBanner.propTypes = {
  plans: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      priceCents: PropTypes.number,
      currency: PropTypes.string,
      intervalLabel: PropTypes.string,
      benefits: PropTypes.arrayOf(PropTypes.string)
    })
  ),
  addons: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      priceCents: PropTypes.number,
      currency: PropTypes.string
    })
  ),
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  totalDisplay: PropTypes.string,
  canManage: PropTypes.bool,
  onManageClick: PropTypes.func
};

CommunityMonetizationBanner.defaultProps = {
  plans: undefined,
  addons: undefined,
  isLoading: false,
  error: null,
  totalDisplay: null,
  canManage: false,
  onManageClick: undefined
};
