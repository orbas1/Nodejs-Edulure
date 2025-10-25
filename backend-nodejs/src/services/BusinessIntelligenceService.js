import logger from '../config/logger.js';
import ReportingCourseEnrollmentDailyView from '../models/ReportingCourseEnrollmentDailyView.js';
import ReportingCommunityEngagementDailyView from '../models/ReportingCommunityEngagementDailyView.js';
import ReportingPaymentsRevenueDailyView from '../models/ReportingPaymentsRevenueDailyView.js';
import FeatureFlagModel from '../models/FeatureFlagModel.js';
import TelemetryFreshnessMonitorModel from '../models/TelemetryFreshnessMonitorModel.js';

const RANGE_DAYS = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '90d': 90
};

function subtractDays(date, days) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() - days);
  return copy;
}

function startOfUtcDay(date) {
  const copy = new Date(date.getTime());
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function endOfUtcDay(date) {
  const copy = new Date(date.getTime());
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
}

function computePercentageChange(current, previous) {
  if (!Number.isFinite(previous) || previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

function buildDelta(current, previous) {
  const change = current - previous;
  return {
    absolute: change,
    percentage: computePercentageChange(current, previous)
  };
}

function resolveCurrencyBreakdown(rows) {
  const byCurrency = new Map();
  rows.forEach((row) => {
    const currency = row.currency ?? 'USD';
    if (!byCurrency.has(currency)) {
      byCurrency.set(currency, {
        currency,
        grossVolumeCents: 0,
        recognisedVolumeCents: 0,
        discountCents: 0,
        taxCents: 0,
        refundedCents: 0,
        totalIntents: 0,
        succeededIntents: 0
      });
    }
    const entry = byCurrency.get(currency);
    entry.grossVolumeCents += Number(row.grossVolumeCents ?? 0);
    entry.recognisedVolumeCents += Number(row.recognisedVolumeCents ?? 0);
    entry.discountCents += Number(row.discountCents ?? 0);
    entry.taxCents += Number(row.taxCents ?? 0);
    entry.refundedCents += Number(row.refundedCents ?? 0);
    entry.totalIntents += Number(row.totalIntents ?? 0);
    entry.succeededIntents += Number(row.succeededIntents ?? 0);
  });
  return Array.from(byCurrency.values());
}

function determineOverallFreshnessStatus(pipelines = []) {
  if (!pipelines.length) {
    return 'unknown';
  }
  if (pipelines.some((pipeline) => pipeline.status === 'critical')) {
    return 'critical';
  }
  if (pipelines.some((pipeline) => pipeline.status === 'warning')) {
    return 'warning';
  }
  return 'healthy';
}

export class BusinessIntelligenceService {
  constructor({
    loggerInstance = logger.child({ service: 'BusinessIntelligenceService' }),
    courseReportingModel = ReportingCourseEnrollmentDailyView,
    communityReportingModel = ReportingCommunityEngagementDailyView,
    paymentsReportingModel = ReportingPaymentsRevenueDailyView,
    featureFlagModel = FeatureFlagModel,
    freshnessModel = TelemetryFreshnessMonitorModel
  } = {}) {
    this.logger = loggerInstance;
    this.courseReportingModel = courseReportingModel;
    this.communityReportingModel = communityReportingModel;
    this.paymentsReportingModel = paymentsReportingModel;
    this.featureFlagModel = featureFlagModel;
    this.freshnessModel = freshnessModel;
  }

  resolveRange(rangeKey) {
    const days = RANGE_DAYS[rangeKey] ?? RANGE_DAYS['30d'];
    const today = startOfUtcDay(new Date());
    const start = subtractDays(today, days - 1);
    const end = endOfUtcDay(today);
    const previousEnd = subtractDays(start, 1);
    const previousStart = subtractDays(previousEnd, days - 1);

    return {
      start,
      end,
      previousStart: startOfUtcDay(previousStart),
      previousEnd: endOfUtcDay(previousEnd),
      days
    };
  }

  async safeCall(fn, fallback, contextMessage) {
    try {
      return await fn();
    } catch (error) {
      this.logger.error({ err: error }, contextMessage);
      return fallback;
    }
  }

  async fetchExperiments() {
    const flags = await this.safeCall(
      () => this.featureFlagModel.allWithOverrides(),
      [],
      'Failed to load feature flag definitions for BI experiments'
    );

    return flags
      .filter((flag) => {
        if (!flag || !flag.metadata) {
          return false;
        }
        if (flag.metadata.experimentId) {
          return true;
        }
        const tags = Array.isArray(flag.metadata.tags) ? flag.metadata.tags : [];
        if (tags.some((tag) => tag.toLowerCase().includes('experiment'))) {
          return true;
        }
        return flag.key.includes('.experiment');
      })
      .map((flag) => ({
        key: flag.key,
        experimentId: flag.metadata?.experimentId ?? null,
        name: flag.name,
        status: flag.killSwitch ? 'disabled' : flag.enabled ? 'active' : 'inactive',
        rolloutPercentage: flag.rolloutPercentage ?? 0,
        owner: flag.metadata?.owner ?? flag.metadata?.team ?? null,
        description: flag.description ?? null,
        tags: Array.isArray(flag.metadata?.tags) ? flag.metadata.tags : [],
        lastUpdatedAt: flag.updatedAt,
        environments: flag.environments ?? []
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  async fetchFreshnessSnapshots() {
    const monitors = await this.safeCall(
      () => this.freshnessModel.listSnapshots({ limit: 25 }),
      [],
      'Failed to load telemetry freshness monitors for BI overview'
    );

    return monitors.map((monitor) => ({
      pipelineKey: monitor.pipelineKey,
      status: monitor.status,
      lagSeconds: Number(monitor.lagSeconds ?? 0),
      thresholdMinutes: Number(monitor.thresholdMinutes ?? 0),
      lastEventAt: monitor.lastEventAt,
      metadata: monitor.metadata ?? {}
    }));
  }

  async getExecutiveOverview({ range = '30d', tenantId = 'global' } = {}) {
    const { start, end, previousStart, previousEnd, days } = this.resolveRange(range);

    const [
      enrollmentDaily,
      enrollmentTotals,
      previousEnrollmentTotals,
      categoryBreakdown,
      communityDaily,
      communityTotals,
      previousCommunityTotals,
      revenueDaily,
      revenueTotals,
      previousRevenueTotals,
      topCommunities,
      experiments,
      freshness
    ] = await Promise.all([
      this.safeCall(
        () => this.courseReportingModel.fetchDailySummaries({ start, end }),
        [],
        'Failed to load enrollment daily summaries for BI overview'
      ),
      this.safeCall(
        () => this.courseReportingModel.fetchTotals({ start, end }),
        { enrollments: 0, completions: 0, recognisedRevenueCents: 0, averageProgressPercent: 0 },
        'Failed to load enrollment totals for BI overview'
      ),
      this.safeCall(
        () => this.courseReportingModel.fetchTotals({ start: previousStart, end: previousEnd }),
        { enrollments: 0, completions: 0, recognisedRevenueCents: 0, averageProgressPercent: 0 },
        'Failed to load previous enrollment totals for BI overview'
      ),
      this.safeCall(
        () => this.courseReportingModel.fetchCategoryBreakdown({ start, end }),
        [],
        'Failed to load enrollment category breakdown for BI overview'
      ),
      this.safeCall(
        () => this.communityReportingModel.fetchDailySummaries({ start, end }),
        [],
        'Failed to load community daily summaries for BI overview'
      ),
      this.safeCall(
        () => this.communityReportingModel.fetchTotals({ start, end }),
        { posts: 0, comments: 0, tags: 0, publicPosts: 0, eventPosts: 0 },
        'Failed to load community totals for BI overview'
      ),
      this.safeCall(
        () => this.communityReportingModel.fetchTotals({ start: previousStart, end: previousEnd }),
        { posts: 0, comments: 0, tags: 0, publicPosts: 0, eventPosts: 0 },
        'Failed to load previous community totals for BI overview'
      ),
      this.safeCall(
        () => this.paymentsReportingModel.fetchDailySummaries({ start, end }),
        [],
        'Failed to load revenue daily summaries for BI overview'
      ),
      this.safeCall(
        () => this.paymentsReportingModel.fetchTotals({ start, end }),
        {
          grossVolumeCents: 0,
          recognisedVolumeCents: 0,
          discountCents: 0,
          taxCents: 0,
          refundedCents: 0,
          totalIntents: 0,
          succeededIntents: 0
        },
        'Failed to load revenue totals for BI overview'
      ),
      this.safeCall(
        () => this.paymentsReportingModel.fetchTotals({ start: previousStart, end: previousEnd }),
        {
          grossVolumeCents: 0,
          recognisedVolumeCents: 0,
          discountCents: 0,
          taxCents: 0,
          refundedCents: 0,
          totalIntents: 0,
          succeededIntents: 0
        },
        'Failed to load previous revenue totals for BI overview'
      ),
      this.safeCall(
        () => this.communityReportingModel.fetchTopCommunities({ start, end, limit: 6 }),
        [],
        'Failed to load top community insights for BI overview'
      ),
      this.fetchExperiments(),
      this.fetchFreshnessSnapshots()
    ]);

    const completionRate = enrollmentTotals.enrollments
      ? Number((enrollmentTotals.completions / enrollmentTotals.enrollments).toFixed(3))
      : 0;
    const previousCompletionRate = previousEnrollmentTotals.enrollments
      ? Number(
          (previousEnrollmentTotals.completions / previousEnrollmentTotals.enrollments).toFixed(3)
        )
      : 0;

    const recognisedNetRevenueCents = Math.max(
      revenueTotals.recognisedVolumeCents - revenueTotals.refundedCents,
      0
    );
    const previousRecognisedNetRevenueCents = Math.max(
      previousRevenueTotals.recognisedVolumeCents - previousRevenueTotals.refundedCents,
      0
    );

    const discountDelta = revenueTotals.discountCents - previousRevenueTotals.discountCents;
    const refundDelta = revenueTotals.refundedCents - previousRevenueTotals.refundedCents;
    const leakageAdjustment = Math.round(
      (Math.max(discountDelta, 0) + Math.max(refundDelta, 0)) / 2
    );
    const normalisedPreviousNetRevenueCents =
      previousRecognisedNetRevenueCents + Math.max(leakageAdjustment, 0);

    const revenueByCurrency = resolveCurrencyBreakdown(revenueDaily);

    const dataQuality = {
      pipelines: freshness,
      status: determineOverallFreshnessStatus(freshness)
    };

    const sortedCategoryBreakdown = categoryBreakdown
      .slice()
      .sort((a, b) => b.enrollments - a.enrollments);

    return {
      tenantId,
      timeframe: {
        range,
        days,
        start: start.toISOString(),
        end: end.toISOString(),
        comparisonStart: previousStart.toISOString(),
        comparisonEnd: previousEnd.toISOString()
      },
      scorecard: {
        enrollments: {
          total: enrollmentTotals.enrollments,
          change: buildDelta(enrollmentTotals.enrollments, previousEnrollmentTotals.enrollments)
        },
        completionRate: {
          value: completionRate,
          change: buildDelta(completionRate, previousCompletionRate)
        },
        recognisedRevenue: {
          cents: revenueTotals.recognisedVolumeCents,
          change: buildDelta(
            revenueTotals.recognisedVolumeCents,
            previousRevenueTotals.recognisedVolumeCents
          )
        },
        netRevenue: {
          cents: recognisedNetRevenueCents,
          change: buildDelta(recognisedNetRevenueCents, normalisedPreviousNetRevenueCents)
        },
        averageProgressPercent: {
          value: enrollmentTotals.averageProgressPercent,
          change: buildDelta(
            enrollmentTotals.averageProgressPercent,
            previousEnrollmentTotals.averageProgressPercent
          )
        },
        communityEngagement: {
          posts: {
            total: communityTotals.posts,
            change: buildDelta(communityTotals.posts, previousCommunityTotals.posts)
          },
          comments: {
            total: communityTotals.comments,
            change: buildDelta(communityTotals.comments, previousCommunityTotals.comments)
          },
          events: communityTotals.eventPosts
        }
      },
      enrollmentTrends: enrollmentDaily,
      revenueTrends: revenueDaily,
      revenueByCurrency,
      communityTrends: communityDaily,
      topCommunities,
      categoryBreakdown: sortedCategoryBreakdown,
      experiments,
      dataQuality
    };
  }

  async getRevenueSavedViews({ range = '30d', tenantId = 'global' } = {}) {
    const { start, end, previousStart, previousEnd } = this.resolveRange(range);

    const emptyTotals = {
      grossVolumeCents: 0,
      recognisedVolumeCents: 0,
      discountCents: 0,
      taxCents: 0,
      refundedCents: 0,
      totalIntents: 0,
      succeededIntents: 0
    };

    const [
      currentDaily,
      previousDaily,
      currentTotalsRaw,
      previousTotalsRaw
    ] = await Promise.all([
      this.safeCall(
        () => this.paymentsReportingModel.fetchDailySummaries({ start, end }),
        [],
        'Failed to load revenue daily summaries for saved views'
      ),
      this.safeCall(
        () => this.paymentsReportingModel.fetchDailySummaries({ start: previousStart, end: previousEnd }),
        [],
        'Failed to load historical revenue daily summaries for saved views'
      ),
      this.safeCall(
        () => this.paymentsReportingModel.fetchTotals({ start, end }),
        emptyTotals,
        'Failed to load revenue totals for saved views'
      ),
      this.safeCall(
        () => this.paymentsReportingModel.fetchTotals({ start: previousStart, end: previousEnd }),
        emptyTotals,
        'Failed to load historical revenue totals for saved views'
      )
    ]);

    const currentTotals = normaliseTotals(currentTotalsRaw);
    const previousTotals = normaliseTotals(previousTotalsRaw);

    const currentBreakdown = resolveCurrencyBreakdown(currentDaily);
    const previousBreakdown = resolveCurrencyBreakdown(previousDaily);
    const previousByCurrency = new Map(previousBreakdown.map((entry) => [entry.currency, entry]));

    const breakdownWithShare = buildCurrencyShare(
      currentBreakdown,
      currentTotals.grossVolumeCents
    );
    const shareByCurrency = new Map(
      breakdownWithShare.map((entry) => [entry.currency ?? 'unknown', entry.share])
    );

    const views = [];

    views.push({
      id: `overall-${range}`,
      title: 'All revenue',
      tenantId,
      currency:
        breakdownWithShare.length === 1 ? breakdownWithShare[0].currency : 'MULTI',
      totals: currentTotals,
      change: {
        grossVolume: buildDelta(currentTotals.grossVolumeCents, previousTotals.grossVolumeCents),
        recognisedVolume: buildDelta(
          currentTotals.recognisedVolumeCents,
          previousTotals.recognisedVolumeCents
        )
      },
      breakdown: {
        currencies: breakdownWithShare.map((entry) => ({
          currency: entry.currency,
          grossVolumeCents: entry.grossVolumeCents,
          recognisedVolumeCents: entry.recognisedVolumeCents,
          discountCents: entry.discountCents,
          taxCents: entry.taxCents,
          refundedCents: entry.refundedCents,
          totalIntents: entry.totalIntents,
          succeededIntents: entry.succeededIntents,
          share: entry.share
        }))
      },
      intents: {
        totalIntents: currentTotals.totalIntents,
        succeededIntents: currentTotals.succeededIntents
      },
      timeframe: {
        start: start.toISOString(),
        end: end.toISOString(),
        comparisonStart: previousStart.toISOString(),
        comparisonEnd: previousEnd.toISOString(),
        range
      }
    });

    currentBreakdown.forEach((entry) => {
      const previousEntry = previousByCurrency.get(entry.currency) ?? {
        grossVolumeCents: 0,
        recognisedVolumeCents: 0,
        discountCents: 0,
        refundedCents: 0,
        totalIntents: 0,
        succeededIntents: 0
      };

      views.push({
        id: `currency-${entry.currency?.toLowerCase?.() ?? 'unknown'}-${range}`,
        title: `${entry.currency ?? 'Unknown'} revenue`,
        tenantId,
        currency: entry.currency ?? 'USD',
        totals: {
          grossVolumeCents: Number(entry.grossVolumeCents ?? 0),
          recognisedVolumeCents: Number(entry.recognisedVolumeCents ?? 0),
          discountCents: Number(entry.discountCents ?? 0),
          taxCents: Number(entry.taxCents ?? 0),
          refundedCents: Number(entry.refundedCents ?? 0),
          totalIntents: Number(entry.totalIntents ?? 0),
          succeededIntents: Number(entry.succeededIntents ?? 0)
        },
        change: {
          grossVolume: buildDelta(
            Number(entry.grossVolumeCents ?? 0),
            Number(previousEntry.grossVolumeCents ?? 0)
          ),
          recognisedVolume: buildDelta(
            Number(entry.recognisedVolumeCents ?? 0),
            Number(previousEntry.recognisedVolumeCents ?? 0)
          )
        },
        breakdown: {
          currencies: [
            {
              currency: entry.currency ?? 'USD',
              grossVolumeCents: Number(entry.grossVolumeCents ?? 0),
              recognisedVolumeCents: Number(entry.recognisedVolumeCents ?? 0),
              discountCents: Number(entry.discountCents ?? 0),
              taxCents: Number(entry.taxCents ?? 0),
              refundedCents: Number(entry.refundedCents ?? 0),
              totalIntents: Number(entry.totalIntents ?? 0),
              succeededIntents: Number(entry.succeededIntents ?? 0),
              share: shareByCurrency.get(entry.currency ?? 'unknown') ?? 0
            }
          ]
        },
        intents: {
          totalIntents: Number(entry.totalIntents ?? 0),
          succeededIntents: Number(entry.succeededIntents ?? 0)
        },
        timeframe: {
          start: start.toISOString(),
          end: end.toISOString(),
          comparisonStart: previousStart.toISOString(),
          comparisonEnd: previousEnd.toISOString(),
          range
        }
      });
    });

    return {
      tenantId,
      range,
      views
    };
  }
}

function normaliseTotals(totals = {}) {
  return {
    grossVolumeCents: Number(totals.grossVolumeCents ?? 0),
    recognisedVolumeCents: Number(totals.recognisedVolumeCents ?? 0),
    discountCents: Number(totals.discountCents ?? 0),
    taxCents: Number(totals.taxCents ?? 0),
    refundedCents: Number(totals.refundedCents ?? 0),
    totalIntents: Number(totals.totalIntents ?? 0),
    succeededIntents: Number(totals.succeededIntents ?? 0)
  };
}

function buildCurrencyShare(entries = [], grandTotal) {
  const total = Number.isFinite(grandTotal) && grandTotal > 0
    ? grandTotal
    : entries.reduce((acc, entry) => acc + Number(entry.grossVolumeCents ?? 0), 0);

  return entries.map((entry) => ({
    ...entry,
    share: total > 0 ? Number(((Number(entry.grossVolumeCents ?? 0) / total) * 100).toFixed(2)) : 0
  }));
}

const businessIntelligenceService = new BusinessIntelligenceService();

export default businessIntelligenceService;

