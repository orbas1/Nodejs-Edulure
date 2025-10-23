import { useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

function formatCurrency(value, currency) {
  if (!Number.isFinite(value)) {
    return '';
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2
    }).format(value);
  } catch (error) {
    return currencyFormatter.format(value);
  }
}

export default function CommunityMembershipModal({
  isOpen,
  mode,
  communityName,
  membershipRole,
  membershipStatus,
  planSummary,
  addonSummary,
  onConfirm,
  onCancel,
  isProcessing,
  error,
  highlight,
  nextLiveSession
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });
  }, [isOpen]);

  const isJoinMode = mode === 'join';
  const heading = isJoinMode ? 'Confirm community access' : 'Leave community';
  const toneClasses = isJoinMode
    ? 'border-primary/30 bg-white'
    : 'border-rose-200 bg-rose-50/60';

  const toneButton = isJoinMode
    ? 'bg-primary text-white hover:bg-primary-dark'
    : 'bg-rose-600 text-white hover:bg-rose-700';

  const roleMessage = useMemo(() => {
    if (!membershipStatus) return null;
    if (membershipStatus === 'active' && membershipRole) {
      return `You’re currently participating as ${membershipRole}.`;
    }
    if (membershipStatus === 'pending') {
      return 'Your request is pending moderator review.';
    }
    if (membershipStatus === 'invited') {
      return 'You have an invitation waiting for approval.';
    }
    if (membershipStatus === 'suspended') {
      return 'Your access is suspended until a moderator resolves outstanding actions.';
    }
    return null;
  }, [membershipRole, membershipStatus]);

  const monetisationInsight = useMemo(() => {
    if (!Array.isArray(planSummary) || planSummary.length === 0) {
      return null;
    }

    const topPlan = planSummary[0];
    const remaining = planSummary.length - 1;
    const displayPrice = formatCurrency((topPlan.priceCents ?? 0) / 100, topPlan.currency ?? 'USD');
    const interval = topPlan.intervalLabel ?? 'month';
    return `${topPlan.name} · ${displayPrice}/${interval}${
      remaining > 0 ? ` · +${remaining} ${remaining === 1 ? 'additional plan' : 'additional plans'}` : ''
    }`;
  }, [planSummary]);

  const addonInsight = useMemo(() => {
    if (!Array.isArray(addonSummary) || addonSummary.length === 0) {
      return null;
    }
    const primaryAddon = addonSummary[0];
    const extra = addonSummary.length - 1;
    const descriptor = extra > 0 ? ` (+${extra} more)` : '';
    return `${primaryAddon.name}${descriptor}`;
  }, [addonSummary]);

  const liveSessionInsight = useMemo(() => {
    if (!nextLiveSession?.startsAt) return null;
    const date = new Date(nextLiveSession.startsAt);
    if (Number.isNaN(date.getTime())) return null;
    const formatted = date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    return `${nextLiveSession.title ?? 'Upcoming live session'} · ${formatted}`;
  }, [nextLiveSession]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-membership-modal-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`w-full max-w-lg rounded-4xl border p-6 shadow-2xl backdrop-blur ${toneClasses}`}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{communityName}</p>
            <h2 id="community-membership-modal-title" className="text-xl font-semibold text-slate-900">
              {heading}
            </h2>
            {highlight ? <p className="text-sm text-slate-600">{highlight}</p> : null}
          </div>
          {roleMessage ? (
            <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-xs font-semibold text-slate-600">
              {roleMessage}
            </div>
          ) : null}
          {isJoinMode && monetisationInsight ? (
            <div className="rounded-3xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-primary">
              {monetisationInsight}
            </div>
          ) : null}
          {isJoinMode && addonInsight ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
              Add-ons: {addonInsight}
            </div>
          ) : null}
          {isJoinMode && liveSessionInsight ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
              Next live: {liveSessionInsight}
            </div>
          ) : null}
          {!isJoinMode && Array.isArray(planSummary) && planSummary.length ? (
            <div className="rounded-3xl border border-rose-200 bg-white px-4 py-3 text-xs text-rose-600">
              Leaving revokes access to {numberFormatter.format(planSummary.length)} monetised tier
              {planSummary.length === 1 ? '' : 's'} and archived classroom assets.
            </div>
          ) : null}
          {error ? (
            <p className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              className={`inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-semibold shadow-card transition disabled:cursor-not-allowed disabled:opacity-70 ${toneButton}`}
            >
              {isProcessing ? 'Processing…' : isJoinMode ? 'Join community' : 'Confirm leave'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

CommunityMembershipModal.propTypes = {
  isOpen: PropTypes.bool,
  mode: PropTypes.oneOf(['join', 'leave']).isRequired,
  communityName: PropTypes.string,
  membershipRole: PropTypes.string,
  membershipStatus: PropTypes.string,
  planSummary: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      priceCents: PropTypes.number,
      currency: PropTypes.string,
      intervalLabel: PropTypes.string
    })
  ),
  addonSummary: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired
    })
  ),
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
  isProcessing: PropTypes.bool,
  error: PropTypes.string,
  highlight: PropTypes.string,
  nextLiveSession: PropTypes.shape({
    title: PropTypes.string,
    startsAt: PropTypes.string
  })
};

CommunityMembershipModal.defaultProps = {
  isOpen: false,
  communityName: 'Selected community',
  membershipRole: undefined,
  membershipStatus: undefined,
  planSummary: undefined,
  addonSummary: undefined,
  onConfirm: undefined,
  onCancel: undefined,
  isProcessing: false,
  error: null,
  highlight: null,
  nextLiveSession: null
};
