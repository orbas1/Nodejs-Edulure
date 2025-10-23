import { randomUUID } from 'crypto';

import db from '../config/database.js';
import logger from '../config/logger.js';
import ExplorerSearchEventModel from '../models/ExplorerSearchEventModel.js';
import ExplorerSearchEventEntityModel from '../models/ExplorerSearchEventEntityModel.js';
import ExplorerSearchDailyMetricModel from '../models/ExplorerSearchDailyMetricModel.js';
import ExplorerSearchInteractionModel from '../models/ExplorerSearchInteractionModel.js';
import AnalyticsAlertModel from '../models/AnalyticsAlertModel.js';
import AnalyticsForecastModel from '../models/AnalyticsForecastModel.js';
import FeatureFlagModel from '../models/FeatureFlagModel.js';
import { castAsBigInt } from '../database/utils/casts.js';
import {
  recordExplorerInteraction,
  recordExplorerSearchEvent
} from '../observability/metrics.js';

const log = logger.child({ service: 'ExplorerAnalyticsService' });

const ZERO_RESULT_ALERT_CODE = 'explorer.zero-result-rate';
const CTR_ALERT_CODE = 'explorer.click-through-rate';
const ZERO_RESULT_THRESHOLD = 0.18;
const CTR_FLOOR = 0.015;
const MIN_SEARCHES_FOR_ALERT = 40;
const FORECAST_HORIZON_DAYS = 7;
const EXPERIMENT_FLAG_PREFIXES = ['explorer.', 'ads.experiment.'];

function sum(values) {
  return values.reduce((acc, value) => acc + Number(value ?? 0), 0);
}

function ratio(numerator, denominator) {
  if (!denominator || Number(denominator) === 0) {
    return 0;
  }
  return Number((Number(numerator ?? 0) / Number(denominator)).toFixed(4));
}

function standardDeviation(values) {
  if (!values.length) return 0;
  const mean = sum(values) / values.length;
  const variance = values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function exponentialSmoothing(values, alpha = 0.4) {
  if (!values.length) {
    return { forecast: 0, smoothed: [] };
  }
  let forecast = Number(values[0] ?? 0);
  const smoothed = [];
  for (const value of values) {
    forecast = alpha * Number(value ?? 0) + (1 - alpha) * forecast;
    smoothed.push(forecast);
  }
  return { forecast, smoothed };
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function serialiseEntityRecord(entityType, entityResult) {
  const displayedHits = Number(entityResult.displayedHits ?? entityResult.hits?.length ?? 0);
  const totalHits = Number(entityResult.totalHits ?? entityResult.total ?? 0);
  const processingTimeMs = Number(entityResult.processingTimeMs ?? entityResult.processingTime ?? 0);
  return {
    entityType,
    totalHits,
    displayedHits,
    processingTimeMs,
    isZeroResult: totalHits === 0,
    metadata: {
      facets: entityResult.facets ?? {},
      page: entityResult.page ?? 1,
      perPage: entityResult.perPage ?? displayedHits,
      markers: entityResult.markers ?? []
    }
  };
}

export class ExplorerAnalyticsService {
  constructor({ loggerInstance = log } = {}) {
    this.logger = loggerInstance;
  }

  async recordSearchExecution({
    query,
    entitySummaries,
    userId,
    sessionId,
    traceId,
    filters,
    globalFilters,
    sort,
    latencyMs,
    metadata = {}
  }) {
    const eventUuid = randomUUID();
    const entityRecords = entitySummaries.map(({ entityType, result }) =>
      serialiseEntityRecord(entityType, result)
    );
    const totalResults = sum(entityRecords.map((record) => record.totalHits));
    const totalDisplayed = sum(entityRecords.map((record) => record.displayedHits));
    const overallLatency = Number(latencyMs ?? 0);
    const isZeroResult = entityRecords.every((record) => record.totalHits === 0);

    const event = await db.transaction(async (trx) => {
      const created = await ExplorerSearchEventModel.create(
        {
          eventUuid,
          userId: userId ?? null,
          sessionId: sessionId ?? randomUUID(),
          traceId: traceId ?? null,
          query,
          resultTotal: totalResults,
          isZeroResult,
          latencyMs: overallLatency,
          filters,
          globalFilters,
          sortPreferences: sort,
          metadata
        },
        trx
      );

      const entities = await ExplorerSearchEventEntityModel.createMany(
        created.id,
        entityRecords,
        trx
      );

      await ExplorerSearchDailyMetricModel.incrementForEvent(
        {
          metricDate: created.createdAt,
          entityType: 'all',
          isZeroResult,
          displayedHits: totalDisplayed,
          totalHits: totalResults,
          latencyMs: overallLatency
        },
        trx
      );

      for (const record of entityRecords) {
        await ExplorerSearchDailyMetricModel.incrementForEvent(
          {
            metricDate: created.createdAt,
            entityType: record.entityType,
            isZeroResult: record.isZeroResult,
            displayedHits: record.displayedHits,
            totalHits: record.totalHits,
            latencyMs: record.processingTimeMs
          },
          trx
        );
      }

      return { event: created, entities };
    });

    for (const record of entityRecords) {
      recordExplorerSearchEvent({
        entityType: record.entityType,
        zeroResult: record.isZeroResult,
        displayedHits: record.displayedHits,
        totalHits: record.totalHits
      });
    }

    await this.evaluateHealth();

    return {
      ...event.event,
      eventUuid,
      entitySummaries: event.entities,
      totalDisplayed,
      totalResults
    };
  }

  async recordInteraction({ eventUuid, entityType, resultId, interactionType, position, userId }) {
    const event = await ExplorerSearchEventModel.findByUuid(eventUuid);
    if (!event) {
      const error = new Error('Search event not found');
      error.status = 404;
      throw error;
    }

    const normalizedEntity = String(entityType ?? '').toLowerCase();
    if (!normalizedEntity) {
      const error = new Error('Entity type is required');
      error.status = 422;
      throw error;
    }

    const interaction = await db.transaction(async (trx) => {
      const recorded = await ExplorerSearchInteractionModel.recordInteraction(
        {
          eventId: event.id,
          entityType: normalizedEntity,
          resultId: String(resultId ?? ''),
          interactionType: interactionType ?? 'click',
          position: position ?? null,
          metadata: { userId: userId ?? null }
        },
        trx
      );

      await ExplorerSearchEventEntityModel.incrementClicks(event.id, normalizedEntity, 1, trx);
      await ExplorerSearchDailyMetricModel.incrementClicks(
        {
          metricDate: event.createdAt,
          entityType: 'all',
          clicks: 1
        },
        trx
      );
      await ExplorerSearchDailyMetricModel.incrementClicks(
        {
          metricDate: event.createdAt,
          entityType: normalizedEntity,
          clicks: 1
        },
        trx
      );

      return recorded;
    });

    recordExplorerInteraction({ entityType: normalizedEntity, interactionType: interaction.interactionType });
    await this.evaluateHealth();
    return interaction;
  }

  async getExplorerSummary({ rangeDays = 7 } = {}) {
    const now = new Date();
    const since = new Date(now);
    since.setUTCDate(since.getUTCDate() - (rangeDays - 1));
    since.setUTCHours(0, 0, 0, 0);
    const until = new Date(now);
    until.setUTCHours(23, 59, 59, 999);

    await this.computeForecasts({ since, until });

    const [aggregateMap, dailyRows, topQueries, zeroResultQueries, baseTotals, adsSummary, experiments, searchVolumeForecast, ctrForecast, alerts] = await Promise.all([
      ExplorerSearchDailyMetricModel.aggregateRange({ since, until }),
      ExplorerSearchDailyMetricModel.listBetween({ since, until }),
      ExplorerSearchEventModel.topQueries({ since, limit: 5, zeroResultOnly: false }),
      ExplorerSearchEventModel.topQueries({ since, limit: 5, zeroResultOnly: true }),
      ExplorerSearchEventModel.aggregateRange({ since }),
      this.loadAdsSummary({ since, until }),
      this.loadExperiments(),
      AnalyticsForecastModel.listByCode('explorer.search-volume', { limit: FORECAST_HORIZON_DAYS }),
      AnalyticsForecastModel.listByCode('explorer.click-through-rate', { limit: FORECAST_HORIZON_DAYS }),
      AnalyticsAlertModel.listRecent({ since: addDays(now, -14) })
    ]);

    const overall = aggregateMap.get('all') ?? {
      searches: baseTotals.searches,
      zeroResults: baseTotals.zeroResults,
      displayedResults: 0,
      totalResults: baseTotals.totalResults,
      clicks: 0,
      conversions: 0,
      averageLatencyMs: baseTotals.averageLatencyMs
    };

    const entityBreakdown = [];
    for (const [entityType, metrics] of aggregateMap.entries()) {
      if (entityType === 'all') continue;
      entityBreakdown.push({
        entityType,
        searches: metrics.searches,
        zeroResultRate: ratio(metrics.zeroResults, metrics.searches),
        clickThroughRate: ratio(metrics.clicks, metrics.displayedResults || metrics.totalResults),
        displayedResults: metrics.displayedResults,
        clicks: metrics.clicks,
        averageLatencyMs: metrics.averageLatencyMs
      });
    }

    const timeseries = dailyRows
      .filter((row) => row.entityType === 'all')
      .map((row) => ({
        date: row.metricDate.toISOString().split('T')[0],
        searches: row.searches,
        zeroResultRate: ratio(row.zeroResults, Math.max(1, row.searches)),
        clickThroughRate: ratio(row.clicks, Math.max(1, row.displayedResults || row.totalResults)),
        averageLatencyMs: row.averageLatencyMs
      }));

    return {
      range: {
        start: since.toISOString(),
        end: until.toISOString(),
        days: rangeDays
      },
      totals: {
        searches: overall.searches,
        zeroResultRate: ratio(overall.zeroResults, Math.max(1, overall.searches)),
        clickThroughRate: ratio(overall.clicks, Math.max(1, overall.displayedResults || overall.totalResults)),
        averageLatencyMs: Math.round(overall.averageLatencyMs ?? 0),
        uniqueUsers: baseTotals.uniqueUsers
      },
      entityBreakdown,
      timeseries,
      topQueries,
      zeroResultQueries,
      ads: adsSummary,
      experiments,
      forecasts: {
        searchVolume: searchVolumeForecast,
        clickThroughRate: ctrForecast
      },
      alerts
    };
  }

  async getExplorerAlerts({ includeResolved = false } = {}) {
    if (includeResolved) {
      return AnalyticsAlertModel.listRecent({ since: addDays(new Date(), -30) });
    }
    return AnalyticsAlertModel.listOpen();
  }

  async evaluateHealth() {
    try {
      const since = addDays(new Date(), -1);
      const metricsMap = await ExplorerSearchDailyMetricModel.aggregateRange({ since });
      const overall = metricsMap.get('all');
      if (!overall || overall.searches < MIN_SEARCHES_FOR_ALERT) {
        return;
      }

      const zeroRate = ratio(overall.zeroResults, overall.searches);
      await this.evaluateThresholdAlert({
        code: ZERO_RESULT_ALERT_CODE,
        triggered: zeroRate >= ZERO_RESULT_THRESHOLD,
        message: `Explorer zero-result rate at ${(zeroRate * 100).toFixed(1)}% over the last 24h`,
        metadata: { zeroRate }
      });

      const ctr = ratio(overall.clicks, overall.displayedResults || overall.totalResults);
      await this.evaluateThresholdAlert({
        code: CTR_ALERT_CODE,
        triggered: ctr <= CTR_FLOOR,
        message: `Explorer click-through rate at ${(ctr * 100).toFixed(2)}% over the last 24h`,
        metadata: { ctr }
      });
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to evaluate explorer health');
    }
  }

  async evaluateThresholdAlert({ code, triggered, message, metadata }) {
    const existing = await AnalyticsAlertModel.findOpenByCode(code);
    if (triggered) {
      if (!existing) {
        await AnalyticsAlertModel.create({
          alertCode: code,
          severity: 'warning',
          message,
          metadata
        });
      }
    } else if (existing) {
      await AnalyticsAlertModel.resolve(existing.id);
    }
  }

  async loadAdsSummary({ since, until }) {
    const query = db('ads_campaign_metrics_daily')
      .select({
        impressions: castAsBigInt(db, 'SUM(impressions)'),
        clicks: castAsBigInt(db, 'SUM(clicks)'),
        conversions: castAsBigInt(db, 'SUM(conversions)'),
        spendCents: castAsBigInt(db, 'SUM(spend_cents)'),
        revenueCents: castAsBigInt(db, 'SUM(revenue_cents)')
      });
    if (since) {
      query.andWhere('metric_date', '>=', since);
    }
    if (until) {
      query.andWhere('metric_date', '<=', until);
    }
    const row = await query.first();
    const impressions = Number(row?.impressions ?? 0);
    const clicks = Number(row?.clicks ?? 0);
    const conversions = Number(row?.conversions ?? 0);
    const spendCents = Number(row?.spendCents ?? 0);
    const revenueCents = Number(row?.revenueCents ?? 0);

    return {
      impressions,
      clicks,
      conversions,
      spendCents,
      revenueCents,
      clickThroughRate: ratio(clicks, impressions),
      conversionRate: ratio(conversions, clicks),
      roas: spendCents > 0 ? Number((revenueCents / spendCents).toFixed(2)) : 0
    };
  }

  async loadExperiments() {
    const flags = await FeatureFlagModel.all();
    return flags
      .filter((flag) => EXPERIMENT_FLAG_PREFIXES.some((prefix) => flag.key.startsWith(prefix)))
      .map((flag) => ({
        key: flag.key,
        name: flag.name,
        description: flag.description,
        enabled: Boolean(flag.enabled) && !flag.killSwitch,
        rolloutPercentage: flag.rolloutPercentage ?? null,
        metadata: flag.metadata
      }));
  }

  async computeForecasts({ since, until }) {
    const history = await ExplorerSearchDailyMetricModel.listBetween({
      since: addDays(since ?? new Date(), -21),
      until: until ?? new Date()
    });
    const allHistory = history.filter((row) => row.entityType === 'all');
    if (!allHistory.length) {
      return;
    }

    const searchSeries = allHistory.map((row) => row.searches);
    const ctrSeries = allHistory.map((row) =>
      ratio(row.clicks, row.displayedResults || row.totalResults || row.searches)
    );

    const searchForecast = exponentialSmoothing(searchSeries, 0.35);
    const searchStd = standardDeviation(searchSeries);
    const ctrForecast = exponentialSmoothing(ctrSeries, 0.4);
    const ctrStd = standardDeviation(ctrSeries);

    const lastDate = allHistory[allHistory.length - 1].metricDate;

    for (let i = 1; i <= FORECAST_HORIZON_DAYS; i += 1) {
      const targetDate = addDays(lastDate, i);
      const searchValue = Math.max(0, Math.round(searchForecast.forecast));
      const searchLower = Math.max(0, Math.round(searchForecast.forecast - 1.5 * searchStd));
      const searchUpper = Math.max(searchLower, Math.round(searchForecast.forecast + 1.5 * searchStd));
      await AnalyticsForecastModel.upsert({
        forecastCode: 'explorer.search-volume',
        targetDate,
        metricValue: searchValue,
        lowerBound: searchLower,
        upperBound: searchUpper,
        metadata: { methodology: 'exponential_smoothing', alpha: 0.35 }
      });

      const ctrValue = Math.max(0, Number(searchForecast.forecast ? ctrForecast.forecast : ctrSeries.at(-1) ?? 0));
      const ctrLower = Math.max(0, Number((ctrValue - 1.5 * ctrStd).toFixed(4)));
      const ctrUpper = Math.max(ctrLower, Number((ctrValue + 1.5 * ctrStd).toFixed(4)));
      await AnalyticsForecastModel.upsert({
        forecastCode: 'explorer.click-through-rate',
        targetDate,
        metricValue: ctrValue,
        lowerBound: ctrLower,
        upperBound: ctrUpper,
        metadata: { methodology: 'exponential_smoothing', alpha: 0.4 }
      });
    }
  }
}

export const explorerAnalyticsService = new ExplorerAnalyticsService();
export default explorerAnalyticsService;
