import PropTypes from 'prop-types';
import { ArrowRightIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

function formatInterval(interval) {
  if (!interval) return 'monthly';
  const value = String(interval).toLowerCase();
  if (value === 'yearly' || value === 'annual') {
    return 'yearly';
  }
  if (value === 'quarterly') {
    return 'quarterly';
  }
  return 'monthly';
}

function resolveCurrencyFormatter(currency) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency?.toUpperCase?.() || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  } catch (_error) {
    return currencyFormatter;
  }
}

export default function CommunityMonetizationBanner({
  plans,
  onSelectPlan,
  hasActiveSubscription,
  membershipStatus,
  className
}) {
  if (!Array.isArray(plans) || plans.length === 0) {
    return null;
  }

  const sortedPlans = [...plans].sort((a, b) => Number(a.priceCents ?? Infinity) - Number(b.priceCents ?? Infinity));
  const highlightedPlan = sortedPlans[0];
  const formatter = resolveCurrencyFormatter(highlightedPlan.currency);
  const priceDisplay = formatter.format(Number(highlightedPlan.priceCents ?? 0) / 100 || 0);
  const intervalLabel = formatInterval(highlightedPlan.interval);
  const benefitList = Array.isArray(highlightedPlan.benefits) ? highlightedPlan.benefits.slice(0, 3) : [];
  const isMember = membershipStatus === 'active';
  const statusLabel = hasActiveSubscription
    ? 'Subscription active'
    : isMember
      ? 'Member'
      : 'Non-member';
  const badgeTone = hasActiveSubscription ? 'bg-emerald-100 text-emerald-700' : isMember ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600';
  const ctaLabel = hasActiveSubscription
    ? 'Manage subscription'
    : isMember
      ? 'Upgrade membership'
      : 'Review pricing options';

  return (
    <aside
      className={`${
        className ?? ''
      } poll-preview border-primary/20 bg-gradient-to-br from-primary/5 via-white to-white p-5 shadow-md transition hover:shadow-lg`}
      role="status"
      aria-label="Community monetisation overview"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <span className={`badge-layer inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeTone}`}>
            <SparklesIcon className="h-4 w-4" /> {statusLabel}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Featured plan</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{highlightedPlan.name}</h3>
            <p className="mt-2 text-sm text-slate-600">
              {highlightedPlan.description || 'Unlock live classrooms, async labs, and operator concierge support with tiered pricing.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
              <BanknotesIcon className="h-4 w-4 text-primary" /> {priceDisplay}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
              Billing {intervalLabel}
            </span>
            {highlightedPlan.trialPeriodDays ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-600">
                {highlightedPlan.trialPeriodDays}-day trial
              </span>
            ) : null}
          </div>
          {benefitList.length ? (
            <ul className="space-y-2 text-sm text-slate-600" aria-label="Included benefits">
              {benefitList.map((benefit, index) => (
                <li key={benefit || index} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary/60" aria-hidden="true" />
                  <span>{benefit || 'Premium community perk'}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <p className="text-xs text-slate-500">
            Plans align with Edulure paywall tiers. Select a tier to continue checkout in the billing workspace.
          </p>
          <button
            type="button"
            onClick={() => onSelectPlan?.(highlightedPlan.id)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
          >
            {ctaLabel} <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

CommunityMonetizationBanner.propTypes = {
  plans: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      name: PropTypes.string,
      description: PropTypes.string,
      priceCents: PropTypes.number,
      currency: PropTypes.string,
      interval: PropTypes.string,
      benefits: PropTypes.arrayOf(PropTypes.string),
      trialPeriodDays: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    })
  ).isRequired,
  onSelectPlan: PropTypes.func,
  hasActiveSubscription: PropTypes.bool,
  membershipStatus: PropTypes.string,
  className: PropTypes.string
};

CommunityMonetizationBanner.defaultProps = {
  onSelectPlan: undefined,
  hasActiveSubscription: false,
  membershipStatus: 'non-member',
  className: ''
};
