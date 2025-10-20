import PropTypes from 'prop-types';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

function formatDate(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return DATE_FORMATTER.format(date);
}

export default function PricingSubscriptionsRoster({
  subscriptions,
  loading,
  onUpdateSubscription,
  disableActions,
  emptyState,
  controls
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/70">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Active subscribers</h3>
          <p className="text-sm text-slate-600">
            Monitor membership health, pause accounts, or trigger cancellations in real time.
          </p>
        </div>
        {controls ? <div className="flex flex-wrap items-center gap-3">{controls}</div> : null}
      </div>
      {loading ? (
        <div className="px-5 py-6 text-sm text-slate-600">Loading membership roster…</div>
      ) : subscriptions.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Current period end</th>
                <th className="px-4 py-3">Cancel at period end</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.map((subscription) => (
                <tr key={subscription.publicId ?? subscription.id} className="bg-white transition hover:bg-primary/5">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {subscription.user?.name ?? 'Member'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{subscription.user?.email ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{subscription.tier?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{subscription.status ?? 'unknown'}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(subscription.currentPeriodEnd)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {subscription.cancelAtPeriodEnd ? (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Scheduled</span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Renewing</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {subscription.status !== 'active' ? (
                        <button
                          type="button"
                          className="dashboard-pill px-3 py-1"
                          onClick={() =>
                            onUpdateSubscription?.(subscription, {
                              status: 'active',
                              cancelAtPeriodEnd: false
                            })
                          }
                          disabled={disableActions}
                        >
                          Resume
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="dashboard-pill px-3 py-1"
                          onClick={() =>
                            onUpdateSubscription?.(subscription, {
                              status: 'paused'
                            })
                          }
                          disabled={disableActions}
                        >
                          Pause
                        </button>
                      )}
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1"
                        onClick={() =>
                          onUpdateSubscription?.(subscription, {
                            cancelAtPeriodEnd: !subscription.cancelAtPeriodEnd
                          })
                        }
                        disabled={disableActions}
                      >
                        {subscription.cancelAtPeriodEnd ? 'Retain renewal' : 'Cancel at renewal'}
                      </button>
                      <button
                        type="button"
                        className="dashboard-pill border-rose-200 bg-rose-50 px-3 py-1 text-rose-600"
                        onClick={() =>
                          onUpdateSubscription?.(subscription, {
                            status: 'canceled',
                            cancelAtPeriodEnd: false
                          })
                        }
                        disabled={disableActions}
                      >
                        Cancel now
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-6 text-sm text-slate-600">{emptyState}</div>
      )}
    </div>
  );
}

PricingSubscriptionsRoster.propTypes = {
  subscriptions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      publicId: PropTypes.string,
      status: PropTypes.string,
      currentPeriodEnd: PropTypes.string,
      cancelAtPeriodEnd: PropTypes.bool,
      user: PropTypes.shape({ name: PropTypes.string, email: PropTypes.string }),
      tier: PropTypes.shape({ name: PropTypes.string })
    })
  ),
  loading: PropTypes.bool,
  onUpdateSubscription: PropTypes.func,
  disableActions: PropTypes.bool,
  emptyState: PropTypes.string,
  controls: PropTypes.node
};

PricingSubscriptionsRoster.defaultProps = {
  subscriptions: [],
  loading: false,
  onUpdateSubscription: undefined,
  disableActions: false,
  emptyState: 'No subscriptions match the selected filters.',
  controls: null
};
