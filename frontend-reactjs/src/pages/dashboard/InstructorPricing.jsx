import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import PricingHeader from './instructor/pricing/PricingHeader.jsx';
import PricingSummaryMetrics from './instructor/pricing/PricingSummaryMetrics.jsx';
import PricingRevenueMix from './instructor/pricing/PricingRevenueMix.jsx';
import PricingOffersTable from './instructor/pricing/PricingOffersTable.jsx';
import PricingSubscriptionsTable from './instructor/pricing/PricingSubscriptionsTable.jsx';
import PricingSessionsPanel from './instructor/pricing/PricingSessionsPanel.jsx';
import PricingInsightsPanel from './instructor/pricing/PricingInsightsPanel.jsx';

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

export default function InstructorPricing({
  onExportFinanceReport,
  onConfigureRules,
  onLaunchOffer,
  onManageTiers,
  onEditSessions,
  onRefreshRevenue
}) {
  const { dashboard, refresh, instructorOrchestration } = useOutletContext();
  const [pendingExport, setPendingExport] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const pricing = dashboard?.pricing;
  const revenueStreams = dashboard?.analytics?.revenueStreams ?? [];

  const offers = useMemo(() => pricing?.offers ?? [], [pricing]);
  const subscriptions = useMemo(() => pricing?.subscriptions ?? [], [pricing]);
  const sessions = useMemo(() => pricing?.sessions ?? [], [pricing]);
  const insights = useMemo(() => pricing?.insights ?? [], [pricing]);

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
          <PricingSubscriptionsTable tiers={subscriptions} onManageTiers={onManageTiers} />
        </div>
        <div className="space-y-6">
          <PricingSessionsPanel sessions={sessions} onEditSessions={onEditSessions} />
          <PricingInsightsPanel insights={insights} />
        </div>
      </section>
    </div>
  );
}

InstructorPricing.propTypes = {
  onExportFinanceReport: PropTypes.func,
  onConfigureRules: PropTypes.func,
  onLaunchOffer: PropTypes.func,
  onManageTiers: PropTypes.func,
  onEditSessions: PropTypes.func,
  onRefreshRevenue: PropTypes.func
};

InstructorPricing.defaultProps = {
  onExportFinanceReport: undefined,
  onConfigureRules: undefined,
  onLaunchOffer: undefined,
  onManageTiers: undefined,
  onEditSessions: undefined,
  onRefreshRevenue: undefined
};
