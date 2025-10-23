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

function aggregateRevenueRows(rows = []) {
  return rows.reduce(
    (acc, row) => {
      const gross = Number(row.grossVolumeCents ?? row.gross_volume_cents ?? 0);
      const recognised = Number(row.recognisedVolumeCents ?? row.recognised_volume_cents ?? 0);
      const discount = Number(row.discountCents ?? row.discount_cents ?? 0);
      const tax = Number(row.taxCents ?? row.tax_cents ?? 0);
      const refunded = Number(row.refundedCents ?? row.refunded_cents ?? 0);
      const totalIntents = Number(row.totalIntents ?? row.total_intents ?? 0);
      const succeededIntents = Number(row.succeededIntents ?? row.succeeded_intents ?? 0);

      acc.grossVolumeCents += gross;
      acc.recognisedVolumeCents += recognised;
      acc.discountCents += discount;
      acc.taxCents += tax;
      acc.refundedCents += refunded;
      acc.totalIntents += totalIntents;
      acc.succeededIntents += succeededIntents;

      return acc;
    },
    {
      grossVolumeCents: 0,
      recognisedVolumeCents: 0,
      discountCents: 0,
      taxCents: 0,
      refundedCents: 0,
      totalIntents: 0,
      succeededIntents: 0
    }
  );
}

function computeRate(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
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
    const { start, end, previousStart, previousEnd, days } = this.resolveRange(range);

    const [currentDaily, previousDaily] = await Promise.all([
      this.safeCall(
        () => this.paymentsReportingModel.fetchDailySummaries({ start, end, tenantId }),
        [],
        'Failed to load revenue daily summaries for saved views'
      ),
      this.safeCall(
        () =>
          this.paymentsReportingModel.fetchDailySummaries({ start: previousStart, end: previousEnd, tenantId }),
        [],
        'Failed to load previous revenue summaries for saved views'
      )
    ]);

    const currentTotals = aggregateRevenueRows(currentDaily);
    const previousTotals = aggregateRevenueRows(previousDaily);

    const netRevenueCents = Math.max(currentTotals.recognisedVolumeCents - currentTotals.refundedCents, 0);
    const previousNetRevenueCents = Math.max(
      previousTotals.recognisedVolumeCents - previousTotals.refundedCents,
      0
    );

    const successRate = computeRate(currentTotals.succeededIntents, currentTotals.totalIntents);
    const previousSuccessRate = computeRate(previousTotals.succeededIntents, previousTotals.totalIntents);

    const refundRate = computeRate(currentTotals.refundedCents, currentTotals.recognisedVolumeCents);
    const previousRefundRate = computeRate(
      previousTotals.refundedCents,
      previousTotals.recognisedVolumeCents
    );

    const discountRate = computeRate(currentTotals.discountCents, currentTotals.grossVolumeCents);
    const previousDiscountRate = computeRate(previousTotals.discountCents, previousTotals.grossVolumeCents);

    const currentAverageTicket = computeRate(
      currentTotals.recognisedVolumeCents,
      currentTotals.succeededIntents
    );
    const previousAverageTicket = computeRate(
      previousTotals.recognisedVolumeCents,
      previousTotals.succeededIntents
    );

    const prepareChartPoint = (row) => ({
      date: row.date,
      grossVolumeCents: Number(row.grossVolumeCents ?? row.gross_volume_cents ?? 0),
      recognisedVolumeCents: Number(row.recognisedVolumeCents ?? row.recognised_volume_cents ?? 0),
      discountCents: Number(row.discountCents ?? row.discount_cents ?? 0),
      taxCents: Number(row.taxCents ?? row.tax_cents ?? 0),
      refundedCents: Number(row.refundedCents ?? row.refunded_cents ?? 0),
      totalIntents: Number(row.totalIntents ?? row.total_intents ?? 0),
      succeededIntents: Number(row.succeededIntents ?? row.succeeded_intents ?? 0),
      netRevenueCents: Math.max(
        Number(row.recognisedVolumeCents ?? row.recognised_volume_cents ?? 0) -
          Number(row.refundedCents ?? row.refunded_cents ?? 0),
        0
      )
    });

    const views = [
      {
        id: 'net-revenue',
        name: 'Net revenue focus',
        description: 'Recognised revenue minus refunds across the selected range.',
        metrics: [
          {
            key: 'netRevenue',
            label: 'Net revenue',
            unit: 'cents',
            currency: 'USD',
            current: netRevenueCents,
            previous: previousNetRevenueCents,
            change: buildDelta(netRevenueCents, previousNetRevenueCents)
          },
          {
            key: 'recognisedRevenue',
            label: 'Recognised revenue',
            unit: 'cents',
            currency: 'USD',
            current: currentTotals.recognisedVolumeCents,
            previous: previousTotals.recognisedVolumeCents,
            change: buildDelta(
              currentTotals.recognisedVolumeCents,
              previousTotals.recognisedVolumeCents
            )
          },
          {
            key: 'refundRate',
            label: 'Refund rate',
            unit: 'ratio',
            current: refundRate,
            previous: previousRefundRate,
            change: buildDelta(refundRate, previousRefundRate)
          }
        ],
        chart: currentDaily.map(prepareChartPoint),
        filters: { paymentStatus: 'succeeded' }
      },
      {
        id: 'payment-health',
        name: 'Payment health',
        description: 'Monitor intent success, retry workload, and gross payment throughput.',
        metrics: [
          {
            key: 'successRate',
            label: 'Success rate',
            unit: 'ratio',
            current: successRate,
            previous: previousSuccessRate,
            change: buildDelta(successRate, previousSuccessRate)
          },
          {
            key: 'totalIntents',
            label: 'Payment intents',
            unit: 'count',
            current: currentTotals.totalIntents,
            previous: previousTotals.totalIntents,
            change: buildDelta(currentTotals.totalIntents, previousTotals.totalIntents)
          },
          {
            key: 'grossVolume',
            label: 'Gross volume',
            unit: 'cents',
            currency: 'USD',
            current: currentTotals.grossVolumeCents,
            previous: previousTotals.grossVolumeCents,
            change: buildDelta(currentTotals.grossVolumeCents, previousTotals.grossVolumeCents)
          }
        ],
        chart: currentDaily.map(prepareChartPoint),
        filters: { intentStatus: ['succeeded', 'requires_action', 'failed'] }
      },
      {
        id: 'revenue-leakage',
        name: 'Leakage & discounts',
        description: 'Track where revenue is discounted or lost to refunds and taxes.',
        metrics: [
          {
            key: 'discountRate',
            label: 'Discount rate',
            unit: 'ratio',
            current: discountRate,
            previous: previousDiscountRate,
            change: buildDelta(discountRate, previousDiscountRate)
          },
          {
            key: 'taxVolume',
            label: 'Tax collected',
            unit: 'cents',
            currency: 'USD',
            current: currentTotals.taxCents,
            previous: previousTotals.taxCents,
            change: buildDelta(currentTotals.taxCents, previousTotals.taxCents)
          },
          {
            key: 'averageTicket',
            label: 'Average ticket',
            unit: 'cents',
            currency: 'USD',
            current: currentAverageTicket,
            previous: previousAverageTicket,
            change: buildDelta(currentAverageTicket, previousAverageTicket)
          }
        ],
        chart: currentDaily.map(prepareChartPoint),
        filters: { focus: ['discounts', 'refunds', 'taxes'] }
      }
    ];

    return {
      tenantId,
      range,
      timeframe: {
        start: start.toISOString(),
        end: end.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString(),
        days
      },
      views
    };
  }
}

const businessIntelligenceService = new BusinessIntelligenceService();

export default businessIntelligenceService;

