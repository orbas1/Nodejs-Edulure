import { useMemo } from 'react';
import PropTypes from 'prop-types';

import { coerceNumber, ensureArray, ensureString } from '../utils.js';

function normaliseApprovalItems(items) {
  return ensureArray(items).map((item, index) => ({
    id: ensureString(item?.id, `approval-${index}`),
    name: ensureString(item?.name, 'Pending item'),
    type: ensureString(item?.type, 'General').toUpperCase(),
    summary: ensureString(item?.summary, 'Awaiting review details'),
    status: ensureString(item?.status, 'pending').toUpperCase(),
    submittedAt: ensureString(item?.submittedAt),
    amount: ensureString(item?.amount),
    action: ensureString(item?.action, 'Review'),
    owner: ensureString(item?.owner, 'Unassigned'),
    target: ensureString(item?.target, ''),
    reference: ensureString(item?.reference, ''),
    slaMinutes: typeof item?.slaMinutes === 'number' ? item.slaMinutes : null
  }));
}

function resolveStatusBadge(status) {
  switch (status) {
    case 'ESCALATED':
      return 'border-amber-300 bg-amber-50 text-amber-700';
    case 'APPROVED':
      return 'border-emerald-300 bg-emerald-50 text-emerald-700';
    case 'REJECTED':
      return 'border-rose-300 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

function describeSla(slaMinutes) {
  if (slaMinutes === null || slaMinutes === undefined) {
    return 'SLA awaiting update';
  }
  if (slaMinutes <= 0) {
    return 'SLA breached';
  }
  const hours = Math.floor(slaMinutes / 60);
  const minutes = slaMinutes % 60;
  if (hours <= 0) {
    return `${minutes} min remaining`;
  }
  return `${hours}h ${minutes.toString().padStart(2, '0')}m remaining`;
}

export default function AdminApprovalsSection({
  pendingCount,
  items,
  formatNumber,
  onRefresh,
  onDecision,
  onEscalate
}) {
  const approvalItems = useMemo(() => normaliseApprovalItems(items), [items]);
  const safePendingCount = useMemo(
    () => coerceNumber(pendingCount ?? approvalItems.length, { min: 0, fallback: 0 }),
    [pendingCount, approvalItems]
  );

  const safeFormatNumber = useMemo(
    () => (typeof formatNumber === 'function' ? formatNumber : (value) => ensureString(value)),
    [formatNumber]
  );

  const handleDecision = (item, decision) => {
    if (typeof onDecision === 'function') {
      onDecision(item, decision);
    }
  };

  const handleEscalate = (item) => {
    if (typeof onEscalate === 'function') {
      onEscalate(item);
    }
  };

  return (
    <section id="approvals" className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Approvals queue</h2>
          <p className="text-sm text-slate-600">
            {safePendingCount > 0
              ? `${safeFormatNumber(safePendingCount)} items awaiting action across communities, payouts, and follow controls.`
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
      <div className="space-y-3">
        <header className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span className="w-1/3">Request</span>
          <span className="hidden w-1/4 lg:block">Owner &amp; target</span>
          <span className="hidden w-1/5 lg:block">Status</span>
          <span className="w-1/3 text-right lg:w-1/5">Actions</span>
        </header>
        <div className="max-h-[26rem] space-y-3 overflow-y-auto pr-2">
          {approvalItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Nothing requires approval right now.
            </div>
          ) : (
            approvalItems.map((item) => {
              const badgeClasses = resolveStatusBadge(item.status);
              return (
                <article
                  key={item.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] transition hover:border-primary/20 lg:flex-row lg:items-center"
                >
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs uppercase tracking-wide text-primary">{item.type}</p>
                    <p className="text-sm text-slate-600">{item.summary}</p>
                    {item.reference ? (
                      <p className="text-xs text-slate-500">Reference: {item.reference}</p>
                    ) : null}
                  </div>
                  <div className="hidden w-1/4 space-y-1 text-sm text-slate-600 lg:block">
                    <p className="font-medium text-slate-700">Owner: {item.owner}</p>
                    {item.target ? <p className="text-xs text-slate-500">Target: {item.target}</p> : null}
                    <p className="text-xs text-slate-500">{describeSla(item.slaMinutes)}</p>
                  </div>
                  <div className="hidden w-1/5 lg:flex lg:flex-col lg:items-start lg:gap-2">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeClasses}`}>
                      {item.status}
                    </span>
                    {item.submittedAt ? (
                      <span className="text-xs text-slate-500">Submitted {item.submittedAt}</span>
                    ) : null}
                    {item.amount ? <span className="text-sm font-semibold text-slate-900">{item.amount}</span> : null}
                  </div>
                  <div className="flex w-full flex-col items-stretch gap-2 lg:w-1/5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="dashboard-pill px-3 py-1 text-xs"
                        onClick={() => handleDecision(item, 'approve')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="dashboard-pill border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:border-rose-300 hover:text-rose-800"
                        onClick={() => handleDecision(item, 'reject')}
                      >
                        Reject
                      </button>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 hover:border-amber-300"
                      onClick={() => handleEscalate(item)}
                    >
                      Escalate
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

AdminApprovalsSection.propTypes = {
  pendingCount: PropTypes.number,
  items: PropTypes.arrayOf(PropTypes.object),
  formatNumber: PropTypes.func,
  onRefresh: PropTypes.func,
  onDecision: PropTypes.func,
  onEscalate: PropTypes.func
};

AdminApprovalsSection.defaultProps = {
  pendingCount: null,
  items: [],
  formatNumber: undefined,
  onRefresh: undefined,
  onDecision: undefined,
  onEscalate: undefined
};
