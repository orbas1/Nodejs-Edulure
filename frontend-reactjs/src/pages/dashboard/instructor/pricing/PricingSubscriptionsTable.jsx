import PropTypes from 'prop-types';

const NUMBER_FORMATTERS = new Map();

function formatPrice(priceCents, currency, interval) {
  if (!NUMBER_FORMATTERS.has(currency)) {
    NUMBER_FORMATTERS.set(
      currency,
      new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2
      })
    );
  }
  const formatter = NUMBER_FORMATTERS.get(currency);
  const amount = formatter.format((Number(priceCents ?? 0) || 0) / 100);
  const suffix = interval === 'lifetime' ? 'one-off' : `/${interval}`;
  return `${amount} ${suffix}`;
}

function formatMembers(members) {
  if (!members) {
    return '0 active';
  }
  const parts = [];
  if (members.active) {
    parts.push(`${members.active} active`);
  }
  if (members.paused) {
    parts.push(`${members.paused} paused`);
  }
  if (members.canceled) {
    parts.push(`${members.canceled} canceled`);
  }
  return parts.length ? parts.join(' · ') : '0 active';
}

export default function PricingSubscriptionsTable({
  tiers,
  loading,
  onCreateTier,
  onEditTier,
  onToggleTier,
  communityOptions,
  selectedCommunityId,
  onSelectCommunity,
  onRefresh,
  membersByTier,
  disableActions
}) {
  return (
    <div className="dashboard-section space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Subscription tiers</h2>
          <p className="mt-1 text-sm text-slate-600">
            Configure pricing, trial periods, and benefits for every gated community experience.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {communityOptions.length ? (
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              Community
              <select
                className="dashboard-input mt-1"
                value={selectedCommunityId ?? ''}
                onChange={(event) => onSelectCommunity?.(event.target.value || null)}
              >
                {communityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            className="dashboard-pill px-4 py-2 text-sm"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh tiers'}
          </button>
          <button
            type="button"
            className="dashboard-primary-pill px-4 py-2 text-sm"
            onClick={onCreateTier}
          >
            New tier
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600">
          Syncing live paywall tiers…
        </div>
      ) : tiers.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Members</th>
                <th className="px-4 py-3">Trial</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Benefits</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tiers.map((tier) => {
                const memberSummary = membersByTier.get(String(tier.id));
                return (
                  <tr key={tier.id} className="bg-white transition hover:bg-primary/5">
                    <td className="px-4 py-3 font-semibold text-slate-900">{tier.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatPrice(tier.priceCents, tier.currency ?? 'USD', tier.billingInterval)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatMembers(memberSummary)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {tier.trialPeriodDays ? `${tier.trialPeriodDays} days` : 'No trial'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          tier.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {tier.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {Array.isArray(tier.benefits) && tier.benefits.length ? (
                        <ul className="list-disc space-y-1 pl-4 text-xs">
                          {tier.benefits.slice(0, 3).map((benefit, index) => (
                            <li key={`${tier.id}-benefit-${index}`}>{benefit}</li>
                          ))}
                          {tier.benefits.length > 3 ? <li>+{tier.benefits.length - 3} more</li> : null}
                        </ul>
                      ) : (
                        <span className="text-xs text-slate-400">Define benefits to set expectations.</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="dashboard-pill px-3 py-1"
                          onClick={() => onEditTier?.(tier)}
                          disabled={disableActions}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="dashboard-pill px-3 py-1"
                          onClick={() => onToggleTier?.(tier)}
                          disabled={disableActions}
                        >
                          {tier.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-600">
          No paywall tiers detected. Create a tier to open up recurring revenue from your community members.
        </div>
      )}
    </div>
  );
}

PricingSubscriptionsTable.propTypes = {
  tiers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string,
      priceCents: PropTypes.number,
      currency: PropTypes.string,
      billingInterval: PropTypes.string,
      trialPeriodDays: PropTypes.number,
      benefits: PropTypes.arrayOf(PropTypes.string),
      isActive: PropTypes.bool
    })
  ),
  loading: PropTypes.bool,
  onCreateTier: PropTypes.func,
  onEditTier: PropTypes.func,
  onToggleTier: PropTypes.func,
  communityOptions: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, label: PropTypes.string })
  ),
  selectedCommunityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSelectCommunity: PropTypes.func,
  onRefresh: PropTypes.func,
  membersByTier: PropTypes.instanceOf(Map),
  disableActions: PropTypes.bool
};

PricingSubscriptionsTable.defaultProps = {
  tiers: [],
  loading: false,
  onCreateTier: undefined,
  onEditTier: undefined,
  onToggleTier: undefined,
  communityOptions: [],
  selectedCommunityId: '',
  onSelectCommunity: undefined,
  onRefresh: undefined,
  membersByTier: new Map(),
  disableActions: false
};
