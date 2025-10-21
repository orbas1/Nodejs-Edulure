import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import withInstructorDashboardAccess from './instructor/withInstructorDashboardAccess.jsx';
import {
  createCommunityTier,
  deleteCommunityTier,
  listCommunitySubscriptions,
  listCommunityTiers,
  updateCommunitySubscription,
  updateCommunityTier
} from '../../api/communityApi.js';
import PricingHeader from './instructor/pricing/PricingHeader.jsx';
import PricingSummaryMetrics from './instructor/pricing/PricingSummaryMetrics.jsx';
import PricingRevenueMix from './instructor/pricing/PricingRevenueMix.jsx';
import PricingOffersTable from './instructor/pricing/PricingOffersTable.jsx';
import PricingSubscriptionsTable from './instructor/pricing/PricingSubscriptionsTable.jsx';
import PricingSessionsPanel from './instructor/pricing/PricingSessionsPanel.jsx';
import PricingInsightsPanel from './instructor/pricing/PricingInsightsPanel.jsx';
import PricingTierDialog from './instructor/pricing/PricingTierDialog.jsx';
import PricingSubscriptionsRoster from './instructor/pricing/PricingSubscriptionsRoster.jsx';

const numberFromString = (value) => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const match = value.replace(/,/g, '').match(/[-+]?[0-9]*\.?[0-9]+/);
    if (match) {
      return Number(match[0]);
    }
  }
  return 0;
};

const percentFromString = (value) => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const match = value.replace(/,/g, '').match(/[-+]?[0-9]*\.?[0-9]+/);
    if (match) {
      return Number(match[0]);
    }
  }
  return 0;
};

const parseSeats = (value) => {
  if (typeof value !== 'string') {
    return { reserved: 0, total: 0 };
  }
  const [reservedPart, totalPart] = value.split('/');
  const reserved = numberFromString(reservedPart);
  const total = numberFromString(totalPart);
  return { reserved, total };
};

function InstructorPricing({
  onExportFinanceReport,
  onConfigureRules,
  onLaunchOffer,
  onEditSessions,
  onRefreshRevenue
}) {
  const { dashboard, refresh, instructorOrchestration } = useOutletContext();
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const [pendingExport, setPendingExport] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [tierDialogMode, setTierDialogMode] = useState('create');
  const [activeTier, setActiveTier] = useState(null);
  const [tierSubmitting, setTierSubmitting] = useState(false);
  const [tierDeleting, setTierDeleting] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState(null);
  const [communityTiers, setCommunityTiers] = useState([]);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [communitySubscriptions, setCommunitySubscriptions] = useState([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState('active');
  const [subscriptionSearch, setSubscriptionSearch] = useState('');
  const [updatingSubscriptionId, setUpdatingSubscriptionId] = useState(null);
  const pricing = dashboard?.pricing;
  const revenueStreams = dashboard?.analytics?.revenueStreams ?? [];

  const offers = useMemo(() => pricing?.offers ?? [], [pricing]);
  const subscriptions = useMemo(() => pricing?.subscriptions ?? [], [pricing]);
  const sessions = useMemo(() => pricing?.sessions ?? [], [pricing]);
  const insights = useMemo(() => pricing?.insights ?? [], [pricing]);
  const communityOptions = useMemo(() => {
    const manageDeck = dashboard?.communities?.manageDeck ?? [];
    return manageDeck
      .map((community) => {
        const rawId = community.id ?? '';
        const match = String(rawId).match(/community-(\d+)/i);
        const value = match ? match[1] : String(rawId || '').trim();
        if (!value) {
          return null;
        }
        return {
          value,
          label: community.title ?? `Community ${value}`
        };
      })
      .filter(Boolean);
  }, [dashboard?.communities?.manageDeck]);

  const summary = useMemo(() => {
    const totalLearners = offers.reduce((sum, offer) => sum + numberFromString(offer.learners), 0);
    const activeSubscribers = subscriptions.reduce((sum, tier) => sum + numberFromString(tier.members), 0);
    const avgConversion = offers.length
      ? offers.reduce((sum, offer) => sum + percentFromString(offer.conversion), 0) / offers.length
      : 0;
    const seatStats = sessions.reduce(
      (acc, session) => {
        const parsed = parseSeats(session.seats ?? '0/0');
        return {
          reserved: acc.reserved + parsed.reserved,
          total: acc.total + parsed.total
        };
      },
      { reserved: 0, total: 0 }
    );
    const seatUtilisation = seatStats.total > 0 ? (seatStats.reserved / seatStats.total) * 100 : 0;

    return {
      totalLearners,
      activeSubscribers,
      avgConversion: Math.round(avgConversion * 10) / 10,
      sessions: sessions.length,
      seatUtilisation: Math.round(seatUtilisation * 10) / 10
    };
  }, [offers, sessions, subscriptions]);

  useEffect(() => {
    if (!communityOptions.length) {
      setSelectedCommunityId(null);
      return;
    }
    if (!selectedCommunityId || !communityOptions.some((option) => option.value === selectedCommunityId)) {
      setSelectedCommunityId(communityOptions[0].value);
    }
  }, [communityOptions, selectedCommunityId]);

  const loadCommunityTiers = useCallback(
    async (signal) => {
      if (!token || !selectedCommunityId) {
        setCommunityTiers([]);
        return [];
      }
      setLoadingTiers(true);
      try {
        const response = await listCommunityTiers({
          communityId: selectedCommunityId,
          token,
          params: { includeInactive: true },
          signal
        });
        const data = response?.data ?? [];
        setCommunityTiers(data);
        return data;
      } catch (error) {
        if (signal?.aborted) {
          return [];
        }
        setFeedback({
          tone: 'error',
          message: error instanceof Error ? error.message : 'Unable to fetch subscription tiers.'
        });
        return [];
      } finally {
        if (!signal?.aborted) {
          setLoadingTiers(false);
        }
      }
    },
    [selectedCommunityId, token]
  );

  const loadCommunitySubscriptions = useCallback(
    async (signal) => {
      if (!token || !selectedCommunityId) {
        setCommunitySubscriptions([]);
        return [];
      }
      setLoadingSubscriptions(true);
      try {
        const params = {};
        if (subscriptionStatusFilter !== 'all') {
          params.status = subscriptionStatusFilter;
        }
        if (subscriptionSearch.trim()) {
          params.search = subscriptionSearch.trim();
        }
        const response = await listCommunitySubscriptions({
          communityId: selectedCommunityId,
          token,
          params,
          signal
        });
        const data = response?.data ?? [];
        setCommunitySubscriptions(data);
        return data;
      } catch (error) {
        if (signal?.aborted) {
          return [];
        }
        setFeedback({
          tone: 'error',
          message: error instanceof Error ? error.message : 'Unable to fetch community subscriptions.'
        });
        return [];
      } finally {
        if (!signal?.aborted) {
          setLoadingSubscriptions(false);
        }
      }
    },
    [selectedCommunityId, subscriptionSearch, subscriptionStatusFilter, token]
  );

  useEffect(() => {
    if (!selectedCommunityId || !token) {
      setCommunityTiers([]);
      return;
    }
    const controller = new AbortController();
    loadCommunityTiers(controller.signal);
    return () => controller.abort();
  }, [loadCommunityTiers, selectedCommunityId, token]);

  useEffect(() => {
    if (!selectedCommunityId || !token) {
      setCommunitySubscriptions([]);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      loadCommunitySubscriptions(controller.signal);
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [loadCommunitySubscriptions, selectedCommunityId, subscriptionSearch, subscriptionStatusFilter, token]);

  const membersByTier = useMemo(() => {
    const map = new Map();
    communitySubscriptions.forEach((subscription) => {
      const tierId = subscription.tier?.id;
      if (!tierId) return;
      const key = String(tierId);
      const entry = map.get(key) ?? { active: 0, paused: 0, canceled: 0 };
      const status = (subscription.status ?? 'active').toLowerCase();
      if (entry[status] === undefined) {
        entry[status] = 0;
      }
      entry[status] += 1;
      map.set(key, entry);
    });
    return map;
  }, [communitySubscriptions]);

  const openCreateTierDialog = useCallback(() => {
    setTierDialogMode('create');
    setActiveTier(null);
    setTierDialogOpen(true);
  }, []);

  const openEditTierDialog = useCallback((tier) => {
    setTierDialogMode('edit');
    setActiveTier(tier);
    setTierDialogOpen(true);
  }, []);

  const closeTierDialog = useCallback(() => {
    setTierDialogOpen(false);
    setActiveTier(null);
  }, []);

  const handleTierSubmit = useCallback(
    async (payload) => {
      if (!token || !selectedCommunityId) {
        setFeedback({
          tone: 'error',
          message: 'Select a community to manage subscription tiers.'
        });
        return;
      }
      setTierSubmitting(true);
      try {
        const { id, ...body } = payload;
        if (id) {
          await updateCommunityTier({ communityId: selectedCommunityId, tierId: id, token, payload: body });
          setFeedback({ tone: 'success', message: 'Subscription tier updated.' });
        } else {
          await createCommunityTier({ communityId: selectedCommunityId, token, payload: body });
          setFeedback({ tone: 'success', message: 'Subscription tier created.' });
        }
        closeTierDialog();
        await loadCommunityTiers();
        await loadCommunitySubscriptions();
      } catch (error) {
        setFeedback({
          tone: 'error',
          message: error instanceof Error ? error.message : 'Unable to save subscription tier.'
        });
      } finally {
        setTierSubmitting(false);
      }
    },
    [closeTierDialog, loadCommunitySubscriptions, loadCommunityTiers, selectedCommunityId, token]
  );

  const handleDeleteTier = useCallback(
    async (tier) => {
      if (!tier?.id) {
        setFeedback({ tone: 'error', message: 'Tier reference missing. Try refreshing and selecting again.' });
        return;
      }
      if (!token || !selectedCommunityId) {
        setFeedback({
          tone: 'error',
          message: 'Select a community to manage subscription tiers.'
        });
        return;
      }
      setTierDeleting(true);
      try {
        await deleteCommunityTier({ communityId: selectedCommunityId, tierId: tier.id, token });
        setFeedback({ tone: 'success', message: 'Subscription tier deleted.' });
        closeTierDialog();
        await loadCommunityTiers();
        await loadCommunitySubscriptions();
      } catch (error) {
        setFeedback({
          tone: 'error',
          message: error instanceof Error ? error.message : 'Unable to delete subscription tier.'
        });
      } finally {
        setTierDeleting(false);
      }
    },
    [closeTierDialog, loadCommunitySubscriptions, loadCommunityTiers, selectedCommunityId, token]
  );

  const handleToggleTier = useCallback(
    async (tier) => {
      if (!token || !selectedCommunityId) {
        setFeedback({
          tone: 'error',
          message: 'Sign in again to manage subscription tiers.'
        });
        return;
      }
      setTierSubmitting(true);
      try {
        await updateCommunityTier({
          communityId: selectedCommunityId,
          tierId: tier.id,
          token,
          payload: { isActive: !tier.isActive }
        });
        setFeedback({
          tone: 'success',
          message: tier.isActive ? 'Tier deactivated.' : 'Tier activated.'
        });
        await loadCommunityTiers();
      } catch (error) {
        setFeedback({
          tone: 'error',
          message: error instanceof Error ? error.message : 'Unable to update tier status.'
        });
      } finally {
        setTierSubmitting(false);
      }
    },
    [loadCommunityTiers, selectedCommunityId, token]
  );

  const handleUpdateSubscription = useCallback(
    async (subscription, payload) => {
      if (!token || !selectedCommunityId) {
        setFeedback({
          tone: 'error',
          message: 'Select a community to manage subscriptions.'
        });
        return;
      }
      const subscriptionId = subscription.publicId ?? subscription.id;
      if (!subscriptionId) {
        setFeedback({ tone: 'error', message: 'Subscription reference missing.' });
        return;
      }
      setUpdatingSubscriptionId(subscriptionId);
      try {
        await updateCommunitySubscription({
          communityId: selectedCommunityId,
          subscriptionId,
          token,
          payload
        });
        setFeedback({ tone: 'success', message: 'Subscription updated.' });
        await loadCommunitySubscriptions();
      } catch (error) {
        setFeedback({
          tone: 'error',
          message: error instanceof Error ? error.message : 'Unable to update subscription.'
        });
      } finally {
        setUpdatingSubscriptionId(null);
      }
    },
    [loadCommunitySubscriptions, selectedCommunityId, token]
  );

  const disableTierActions = tierSubmitting || tierDeleting || loadingTiers;
  const rosterControls = (
    <>
      <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
        Status
        <select
          className="dashboard-input mt-1"
          value={subscriptionStatusFilter}
          onChange={(event) => setSubscriptionStatusFilter(event.target.value)}
        >
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="canceled">Canceled</option>
          <option value="all">All statuses</option>
        </select>
      </label>
      <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
        Search
        <input
          className="dashboard-input mt-1"
          value={subscriptionSearch}
          onChange={(event) => setSubscriptionSearch(event.target.value)}
          placeholder="Search by member or tier"
        />
      </label>
      <button
        type="button"
        className="dashboard-pill px-4 py-2 text-sm"
        onClick={() => loadCommunitySubscriptions()}
        disabled={loadingSubscriptions}
      >
        {loadingSubscriptions ? 'Refreshing…' : 'Refresh'}
      </button>
    </>
  );

  if (!pricing) {
    return (
      <DashboardStateMessage
        title="Pricing data unavailable"
        description="We couldn't load monetisation telemetry for your Learnspace. Refresh once data sources are connected."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const hasSignals = offers.length + subscriptions.length + sessions.length + revenueStreams.length + insights.length > 0;

  if (!hasSignals) {
    return (
      <DashboardStateMessage
        title="No monetisation activity"
        description="There are no course offers, subscription tiers, or live session revenues tracked yet. Refresh after syncing commerce data."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  const summaryMetrics = [
    {
      title: 'Cohort enrolments',
      value: summary.totalLearners,
      hint: 'Learners across paid cohorts'
    },
    {
      title: 'Active subscribers',
      value: summary.activeSubscribers,
      hint: 'Members across gated communities'
    },
    {
      title: 'Avg conversion',
      value: `${summary.avgConversion}%`,
      hint: 'Rolling 30-day average'
    },
    {
      title: 'Live seat utilisation',
      value: `${summary.seatUtilisation}%`,
      hint: summary.sessions > 0 ? `${summary.sessions} sessions scheduled` : 'No live sessions scheduled'
    }
  ];

  const defaultExportFinanceReport = useCallback(async () => {
    if (!instructorOrchestration?.exportPricing) {
      return;
    }
    setPendingExport(true);
    setFeedback(null);
    try {
      const payload = {
        format: 'csv',
        revenueStreams: revenueStreams.length
      };
      const result = await instructorOrchestration.exportPricing(payload);
      setFeedback({
        tone: 'success',
        message: 'Pricing export scheduled.',
        detail: result?.summary ?? 'Download links will appear once the export is ready.'
      });
      await refresh?.();
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error.message ?? 'Unable to export pricing data.'
      });
    } finally {
      setPendingExport(false);
    }
  }, [instructorOrchestration, refresh, revenueStreams.length]);

  const handleExportFinanceReport = onExportFinanceReport ?? defaultExportFinanceReport;

  return (
    <div className="space-y-8">
      <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />
      <PricingHeader
        onExportFinanceReport={handleExportFinanceReport}
        onConfigureRules={onConfigureRules}
        isExporting={pendingExport}
      />
      <PricingSummaryMetrics metrics={summaryMetrics} />
      <PricingRevenueMix streams={revenueStreams} onRefresh={onRefreshRevenue} />
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <PricingOffersTable offers={offers} onLaunchOffer={onLaunchOffer} />
          <PricingSubscriptionsTable
            tiers={communityTiers.length ? communityTiers : subscriptions}
            loading={loadingTiers}
            onCreateTier={openCreateTierDialog}
            onEditTier={openEditTierDialog}
            onToggleTier={handleToggleTier}
            communityOptions={communityOptions}
            selectedCommunityId={selectedCommunityId ?? ''}
            onSelectCommunity={(value) => setSelectedCommunityId(value || null)}
            onRefresh={() => loadCommunityTiers()}
            membersByTier={membersByTier}
            disableActions={disableTierActions}
          />
          <PricingSubscriptionsRoster
            subscriptions={communitySubscriptions}
            loading={loadingSubscriptions}
            onUpdateSubscription={handleUpdateSubscription}
            disableActions={updatingSubscriptionId !== null}
            emptyState={
              selectedCommunityId
                ? 'No subscriptions found for this filter. Promote your paywall or relax the filters.'
                : 'Select a community to review subscriber health.'
            }
            controls={rosterControls}
          />
        </div>
        <div className="space-y-6">
          <PricingSessionsPanel sessions={sessions} onEditSessions={onEditSessions} />
          <PricingInsightsPanel insights={insights} />
        </div>
      </section>
      <PricingTierDialog
        isOpen={tierDialogOpen}
        mode={tierDialogMode}
        tier={tierDialogMode === 'edit' ? activeTier : null}
        onSubmit={handleTierSubmit}
        onClose={closeTierDialog}
        submitting={tierSubmitting}
        onDelete={tierDialogMode === 'edit' ? () => handleDeleteTier(activeTier) : undefined}
        deleting={tierDeleting}
      />
    </div>
  );
}

InstructorPricing.propTypes = {
  onExportFinanceReport: PropTypes.func,
  onConfigureRules: PropTypes.func,
  onLaunchOffer: PropTypes.func,
  onEditSessions: PropTypes.func,
  onRefreshRevenue: PropTypes.func
};

InstructorPricing.defaultProps = {
  onExportFinanceReport: undefined,
  onConfigureRules: undefined,
  onLaunchOffer: undefined,
  onEditSessions: undefined,
  onRefreshRevenue: undefined
};

export default withInstructorDashboardAccess(InstructorPricing);
