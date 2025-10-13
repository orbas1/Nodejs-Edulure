import PropTypes from 'prop-types';

export default function AdminApprovalsSection({ pendingCount, items, formatNumber, onRefresh }) {
  return (
    <section id="approvals" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Approvals queue</h2>
          <p className="text-sm text-slate-600">
            {pendingCount > 0
              ? `${formatNumber(pendingCount)} items awaiting action across communities, payouts, and follow controls.`
              : 'All approval workflows are clear right now.'}
          </p>
        </div>
        <button
          type="button"
          className="dashboard-pill disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onRefresh}
          disabled={!onRefresh}
        >
          Refresh queue
        </button>
      </div>
      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Nothing requires approval right now.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                <p className="text-xs uppercase tracking-wide text-primary">{item.type}</p>
                <p className="text-sm text-slate-600">{item.summary}</p>
              </div>
              <div className="flex flex-col items-start gap-3 md:items-end">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    {item.status}
                  </span>
                  {item.submittedAt ? <span>{item.submittedAt}</span> : null}
                </div>
                {item.amount ? <p className="text-sm font-semibold text-slate-900">{item.amount}</p> : null}
                <button type="button" className="dashboard-pill px-4 py-2 text-xs">
                  {item.action ?? 'Review'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

AdminApprovalsSection.propTypes = {
  pendingCount: PropTypes.number.isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  formatNumber: PropTypes.func.isRequired,
  onRefresh: PropTypes.func
};

AdminApprovalsSection.defaultProps = {
  onRefresh: undefined
};
