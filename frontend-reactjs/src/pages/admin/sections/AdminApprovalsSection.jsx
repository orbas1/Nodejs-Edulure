import { useMemo } from 'react';
import PropTypes from 'prop-types';

import { coerceNumber, describeTimestamp, ensureArray, ensureString } from '../utils.js';

function toLabelCase(value, fallback = '') {
  const text = ensureString(value, fallback);
  if (!text) {
    return fallback;
  }

  return text
    .replace(/[_\s]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

function resolveStatusTone(status) {
  switch (status) {
    case 'approved':
      return { className: 'bg-emerald-100 text-emerald-700 border border-emerald-200', label: 'Approved' };
    case 'rejected':
    case 'denied':
      return { className: 'bg-rose-100 text-rose-700 border border-rose-200', label: 'Requires attention' };
    case 'escalated':
      return { className: 'bg-amber-100 text-amber-700 border border-amber-200', label: 'Escalated' };
    case 'in_review':
    case 'review':
      return { className: 'bg-sky-100 text-sky-700 border border-sky-200', label: 'In review' };
    default:
      return { className: 'bg-slate-100 text-slate-600 border border-slate-200', label: 'Pending' };
  }
}

function normaliseApprovalItems(items) {
  return ensureArray(items).map((item, index) => ({
    id: ensureString(item?.id, `approval-${index}`),
    name: ensureString(item?.name, 'Pending item'),
    type: toLabelCase(item?.type, 'General'),
    summary: ensureString(item?.summary, 'Awaiting review details'),
    status: ensureString(item?.status, 'pending').toLowerCase(),
    statusLabel: toLabelCase(item?.status, 'Pending'),
    submittedAt: ensureString(item?.submittedAt),
    submittedAtLabel: describeTimestamp(item?.submittedAt, { fallback: null }),
    amount: ensureString(item?.amount),
    action: ensureString(item?.action, 'Review'),
    actionDisabled: Boolean(item?.actionDisabled)
  }));
}

export default function AdminApprovalsSection({ pendingCount, items, formatNumber, onRefresh, onAction }) {
  const approvalItems = useMemo(() => normaliseApprovalItems(items), [items]);
  const safePendingCount = useMemo(
    () => coerceNumber(pendingCount ?? approvalItems.length, { min: 0, fallback: 0 }),
    [pendingCount, approvalItems]
  );

  const safeFormatNumber = useMemo(
    () => (typeof formatNumber === 'function' ? formatNumber : (value) => ensureString(value)),
    [formatNumber]
  );

  return (
    <section id="approvals" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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
      <div className="mt-6 space-y-4">
        {approvalItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Nothing requires approval right now.
          </div>
        ) : (
          approvalItems.map((item) => {
            const statusTone = resolveStatusTone(item.status);
            return (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">{item.type}</p>
                  <p className="text-sm text-slate-600">{item.summary}</p>
                </div>
                <div className="flex flex-col items-start gap-3 md:items-end">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[0.65rem] font-semibold tracking-wide ${statusTone.className}`}
                      aria-label={`Status: ${statusTone.label}`}
                    >
                      {statusTone.label}
                    </span>
                    {item.submittedAtLabel ? <span>{item.submittedAtLabel}</span> : null}
                  </div>
                  {item.amount ? <p className="text-sm font-semibold text-slate-900">{item.amount}</p> : null}
                  <button
                    type="button"
                    className="dashboard-pill px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      if (onAction) {
                        onAction(item);
                      }
                    }}
                    disabled={item.actionDisabled}
                  >
                    {item.action ?? 'Review'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

AdminApprovalsSection.propTypes = {
  pendingCount: PropTypes.number.isRequired,
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
  formatNumber: PropTypes.func.isRequired,
  onRefresh: PropTypes.func,
  onAction: PropTypes.func
};

AdminApprovalsSection.defaultProps = {
  onRefresh: undefined,
  onAction: undefined
};
