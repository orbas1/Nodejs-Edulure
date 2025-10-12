import db from '../config/database.js';
import logger from '../config/logger.js';
import AdsCampaignModel from '../models/AdsCampaignModel.js';
import AdsCampaignMetricModel from '../models/AdsCampaignMetricModel.js';
import DomainEventModel from '../models/DomainEventModel.js';

const log = logger.child({ service: 'AdsService' });

const PROHIBITED_KEYWORDS = ['clickbait', 'scam', 'spam', 'crypto giveaway'];
const MIN_HEADLINE_LENGTH = 12;
const MAX_HEADLINE_LENGTH = 160;

function rate(value, total) {
  if (!total || total <= 0) {
    return 0;
  }
  return Number((value / total).toFixed(4));
}

function centsPerUnit(cents, units) {
  if (!units || units <= 0) {
    return 0;
  }
  return Math.round(cents / units);
}

function defaultSummary() {
  return {
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spendCents: 0,
    revenueCents: 0,
    lastMetricDate: null
  };
}

function toISO(date) {
  if (!date) return null;
  if (date instanceof Date) return date.toISOString();
  return new Date(date).toISOString();
}

function calculateActiveDays(campaign, now = new Date()) {
  const startAt = campaign.startAt ? new Date(campaign.startAt) : now;
  const endAt = campaign.endAt ? new Date(campaign.endAt) : null;
  const start = startAt <= now ? startAt : now;
  const end = endAt && endAt < now ? endAt : now;
  if (end < start) {
    return 1;
  }
  const diff = Math.abs(end - start);
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
}

function calculatePerformanceScore({ averages, forecast, lifetime }, complianceStatus) {
  const ctrScore = Math.min(30, Math.round(averages.ctr * 1000));
  const conversionScore = Math.min(30, Math.round(averages.conversionRate * 1000));
  const roasScore = Math.min(20, Math.round((averages.roas ?? 0) * 10));
  const stabilityScore = Math.min(10, forecast.expectedDailySpendCents > 0 ? 10 : 4);
  const volumeScore = Math.min(10, Math.round(Math.log10(lifetime.impressions + 1) * 4));
  const base = ctrScore + conversionScore + roasScore + stabilityScore + volumeScore;
  if (complianceStatus === 'halted') {
    return Math.max(5, Math.round(base * 0.25));
  }
  if (complianceStatus === 'needs_review') {
    return Math.round(base * 0.75);
  }
  return Math.min(100, Math.max(0, base));
}

function containsProhibitedKeyword(text) {
  if (!text) {
    return false;
  }
  const haystack = String(text).toLowerCase();
  return PROHIBITED_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

export default class AdsService {
  static async listCampaigns({ actor, filters = {}, pagination = {} } = {}) {
    const page = Math.max(1, Number(pagination.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(pagination.limit ?? 20)));
    const offset = (page - 1) * limit;

    const queryFilters = {
      status: filters.status,
      search: filters.search,
      limit,
      offset,
      orderBy: 'updated_at'
    };

    if (actor.role !== 'admin') {
      queryFilters.createdBy = actor.id;
    }

    const [campaigns, total] = await Promise.all([
      AdsCampaignModel.list(queryFilters),
      AdsCampaignModel.count(queryFilters)
    ]);

    const hydrated = await this.hydrateCampaignCollection(campaigns);

    return {
      data: hydrated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getCampaign(publicId, actor) {
    const campaign = await AdsCampaignModel.findByPublicId(publicId);
    if (!campaign) {
      const error = new Error('Campaign not found');
      error.status = 404;
      throw error;
    }
    if (actor.role !== 'admin' && campaign.createdBy !== actor.id) {
      const error = new Error('You do not have permission to manage this campaign');
      error.status = 403;
      throw error;
    }

    const [hydrated] = await this.hydrateCampaignCollection([campaign]);
    return hydrated;
  }

  static async createCampaign(actor, payload) {
    const startAt = payload.startAt ? new Date(payload.startAt) : null;
    const endAt = payload.endAt ? new Date(payload.endAt) : null;
    if (startAt && endAt && endAt < startAt) {
      const error = new Error('End date must be after the start date');
      error.status = 422;
      throw error;
    }

    const campaign = await db.transaction(async (trx) => {
      const created = await AdsCampaignModel.create(
        {
          createdBy: actor.id,
          name: payload.name,
          objective: payload.objective,
          status: payload.status ?? 'draft',
          budgetCurrency: payload.budget?.currency ?? payload.budgetCurrency ?? 'USD',
          budgetDailyCents: payload.budget?.dailyCents ?? payload.budgetDailyCents ?? 0,
          spendCurrency: payload.spendCurrency ?? payload.budget?.currency ?? 'USD',
          targetingKeywords: payload.targeting?.keywords ?? [],
          targetingAudiences: payload.targeting?.audiences ?? [],
          targetingLocations: payload.targeting?.locations ?? [],
          targetingLanguages: payload.targeting?.languages ?? ['en'],
          creativeHeadline: payload.creative?.headline,
          creativeDescription: payload.creative?.description,
          creativeUrl: payload.creative?.url,
          startAt: startAt ? startAt.toISOString() : null,
          endAt: endAt ? endAt.toISOString() : null,
          metadata: {
            reviewChecklist: payload.metadata?.reviewChecklist ?? [],
            landingPage: payload.creative?.url ?? null
          }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'ads_campaign',
          entityId: String(created.id),
          eventType: 'ads.campaign.created',
          payload: {
            createdBy: actor.id,
            objective: payload.objective,
            status: created.status
          },
          performedBy: actor.id
        },
        trx
      );

      return created;
    });

    const [hydrated] = await this.hydrateCampaignCollection([campaign]);
    return hydrated;
  }

  static async updateCampaign(publicId, actor, payload) {
    const campaign = await AdsCampaignModel.findByPublicId(publicId);
    if (!campaign) {
      const error = new Error('Campaign not found');
      error.status = 404;
      throw error;
    }
    if (actor.role !== 'admin' && campaign.createdBy !== actor.id) {
      const error = new Error('You do not have permission to manage this campaign');
      error.status = 403;
      throw error;
    }

    const updates = {};
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.objective !== undefined) updates.objective = payload.objective;
    if (payload.status !== undefined) updates.status = payload.status;
    if (payload.budget?.currency || payload.budgetCurrency) {
      updates.budgetCurrency = payload.budget?.currency ?? payload.budgetCurrency;
    }
    if (payload.budget?.dailyCents !== undefined || payload.budgetDailyCents !== undefined) {
      updates.budgetDailyCents = payload.budget?.dailyCents ?? payload.budgetDailyCents;
    }
    if (payload.targeting) {
      updates.targetingKeywords = payload.targeting.keywords ?? campaign.targetingKeywords;
      updates.targetingAudiences = payload.targeting.audiences ?? campaign.targetingAudiences;
      updates.targetingLocations = payload.targeting.locations ?? campaign.targetingLocations;
      updates.targetingLanguages = payload.targeting.languages ?? campaign.targetingLanguages;
    }
    if (payload.creative) {
      updates.creativeHeadline = payload.creative.headline ?? campaign.creativeHeadline;
      updates.creativeDescription = payload.creative.description ?? campaign.creativeDescription;
      updates.creativeUrl = payload.creative.url ?? campaign.creativeUrl;
    }
    if (payload.schedule) {
      if (payload.schedule.startAt) {
        updates.startAt = new Date(payload.schedule.startAt).toISOString();
      }
      if (payload.schedule.endAt) {
        updates.endAt = new Date(payload.schedule.endAt).toISOString();
      }
    }
    if (payload.metadata) {
      updates.metadata = { ...campaign.metadata, ...payload.metadata };
    }

    const updated = await AdsCampaignModel.updateById(campaign.id, updates);

    await DomainEventModel.record({
      entityType: 'ads_campaign',
      entityId: String(updated.id),
      eventType: 'ads.campaign.updated',
      payload: {
        fields: Object.keys(updates)
      },
      performedBy: actor.id
    });

    const [hydrated] = await this.hydrateCampaignCollection([updated]);
    return hydrated;
  }

  static async pauseCampaign(publicId, actor, reason = 'manual_pause') {
    const campaign = await AdsCampaignModel.findByPublicId(publicId);
    if (!campaign) {
      const error = new Error('Campaign not found');
      error.status = 404;
      throw error;
    }
    if (actor.role !== 'admin' && campaign.createdBy !== actor.id) {
      const error = new Error('You do not have permission to manage this campaign');
      error.status = 403;
      throw error;
    }
    if (campaign.status === 'paused') {
      return this.getCampaign(publicId, actor);
    }

    const updated = await AdsCampaignModel.updateById(campaign.id, {
      status: 'paused',
      metadata: { ...campaign.metadata, lastManualAction: reason, lastManualActionAt: new Date().toISOString() }
    });

    await DomainEventModel.record({
      entityType: 'ads_campaign',
      entityId: String(updated.id),
      eventType: 'ads.campaign.paused',
      payload: { reason },
      performedBy: actor.id
    });

    return this.getCampaign(publicId, actor);
  }

  static async resumeCampaign(publicId, actor) {
    const campaign = await AdsCampaignModel.findByPublicId(publicId);
    if (!campaign) {
      const error = new Error('Campaign not found');
      error.status = 404;
      throw error;
    }
    if (actor.role !== 'admin' && campaign.createdBy !== actor.id) {
      const error = new Error('You do not have permission to manage this campaign');
      error.status = 403;
      throw error;
    }

    const now = new Date();
    if (campaign.endAt && new Date(campaign.endAt) < now) {
      const error = new Error('Campaign schedule has finished. Extend the schedule before resuming.');
      error.status = 422;
      throw error;
    }

    const updated = await AdsCampaignModel.updateById(campaign.id, {
      status: 'active',
      metadata: { ...campaign.metadata, lastManualAction: 'resume', lastManualActionAt: new Date().toISOString() }
    });

    await DomainEventModel.record({
      entityType: 'ads_campaign',
      entityId: String(updated.id),
      eventType: 'ads.campaign.resumed',
      payload: {},
      performedBy: actor.id
    });

    return this.getCampaign(publicId, actor);
  }

  static async recordDailyMetrics(publicId, actor, payload) {
    const campaign = await AdsCampaignModel.findByPublicId(publicId);
    if (!campaign) {
      const error = new Error('Campaign not found');
      error.status = 404;
      throw error;
    }
    if (actor.role !== 'admin' && campaign.createdBy !== actor.id) {
      const error = new Error('You do not have permission to manage this campaign');
      error.status = 403;
      throw error;
    }

    const metricDate = new Date(payload.metricDate ?? new Date());
    metricDate.setUTCHours(0, 0, 0, 0);

    await AdsCampaignMetricModel.upsertDaily(
      campaign.id,
      metricDate,
      {
        impressions: payload.impressions,
        clicks: payload.clicks,
        conversions: payload.conversions,
        spendCents: payload.spendCents,
        revenueCents: payload.revenueCents,
        metadata: payload.metadata
      }
    );

    const [hydrated] = await this.hydrateCampaignCollection([campaign]);

    await DomainEventModel.record({
      entityType: 'ads_campaign',
      entityId: String(campaign.id),
      eventType: 'ads.campaign.metrics_recorded',
      payload: {
        metricDate: metricDate.toISOString(),
        impressions: payload.impressions,
        clicks: payload.clicks,
        conversions: payload.conversions,
        spendCents: payload.spendCents
      },
      performedBy: actor.id
    });

    return hydrated;
  }

  static async getInsights(publicId, actor, { windowDays = 14 } = {}) {
    const campaign = await AdsCampaignModel.findByPublicId(publicId);
    if (!campaign) {
      const error = new Error('Campaign not found');
      error.status = 404;
      throw error;
    }
    if (actor.role !== 'admin' && campaign.createdBy !== actor.id) {
      const error = new Error('You do not have permission to manage this campaign');
      error.status = 403;
      throw error;
    }

    const metrics = await AdsCampaignMetricModel.listByCampaign(campaign.id, { limit: windowDays });
    const orderedMetrics = [...metrics].sort((a, b) => {
      const left = new Date(a.metricDate).getTime();
      const right = new Date(b.metricDate).getTime();
      return left - right;
    });

    const totals = orderedMetrics.reduce(
      (accumulator, metric) => ({
        impressions: accumulator.impressions + metric.impressions,
        clicks: accumulator.clicks + metric.clicks,
        conversions: accumulator.conversions + metric.conversions,
        spendCents: accumulator.spendCents + metric.spendCents,
        revenueCents: accumulator.revenueCents + metric.revenueCents
      }),
      defaultSummary()
    );

    const dailySeries = orderedMetrics
      .map((metric) => ({
        date: toISO(metric.metricDate),
        impressions: metric.impressions,
        clicks: metric.clicks,
        conversions: metric.conversions,
        spendCents: metric.spendCents,
        revenueCents: metric.revenueCents,
        ctr: rate(metric.clicks, metric.impressions),
        conversionRate: rate(metric.conversions, metric.clicks),
        cpcCents: centsPerUnit(metric.spendCents, metric.clicks),
        cpaCents: centsPerUnit(metric.spendCents, metric.conversions)
      }));

    return {
      summary: {
        impressions: totals.impressions,
        clicks: totals.clicks,
        conversions: totals.conversions,
        spendCents: totals.spendCents,
        revenueCents: totals.revenueCents,
        ctr: rate(totals.clicks, totals.impressions),
        conversionRate: rate(totals.conversions, totals.clicks),
        cpcCents: centsPerUnit(totals.spendCents, totals.clicks),
        cpaCents: centsPerUnit(totals.spendCents, totals.conversions)
      },
      daily: dailySeries
    };
  }

  static async hydrateCampaignCollection(campaigns) {
    if (!campaigns.length) {
      return [];
    }

    const ids = campaigns.map((campaign) => campaign.id);
    const lifetimeMap = await AdsCampaignMetricModel.summariseByCampaignIds(ids);

    const results = [];
    for (const campaign of campaigns) {
      const lifetime = lifetimeMap.get(campaign.id) ?? defaultSummary();
      const trailing = await AdsCampaignMetricModel.summariseWindow(campaign.id, { windowDays: 7 });

      await this.applyLifecycleTransitions(campaign);

      const derived = this.computeDerivedMetrics(campaign, lifetime, trailing);
      const compliance = this.evaluateCompliance(campaign, derived);
      derived.performanceScore = compliance.performanceScore;

      await this.syncPerformanceSnapshot(campaign, derived, lifetime);
      await this.syncComplianceState(campaign, compliance);

      results.push(this.formatCampaign(campaign, derived, compliance));
    }
    return results;
  }

  static computeDerivedMetrics(campaign, lifetimeSummary, trailingSummary) {
    const lifetime = {
      impressions: lifetimeSummary.impressions,
      clicks: lifetimeSummary.clicks,
      conversions: lifetimeSummary.conversions,
      spendCents: lifetimeSummary.spendCents,
      revenueCents: lifetimeSummary.revenueCents,
      lastRecordedAt: toISO(lifetimeSummary.lastMetricDate)
    };

    const trailing = {
      impressions: trailingSummary.impressions ?? 0,
      clicks: trailingSummary.clicks ?? 0,
      conversions: trailingSummary.conversions ?? 0,
      spendCents: trailingSummary.spendCents ?? 0,
      revenueCents: trailingSummary.revenueCents ?? 0,
      ctr: rate(trailingSummary.clicks ?? 0, trailingSummary.impressions ?? 0),
      conversionRate: rate(trailingSummary.conversions ?? 0, trailingSummary.clicks ?? 0),
      cpcCents: centsPerUnit(trailingSummary.spendCents ?? 0, trailingSummary.clicks ?? 0),
      cpaCents: centsPerUnit(trailingSummary.spendCents ?? 0, trailingSummary.conversions ?? 0)
    };

    const averages = {
      ctr: rate(lifetime.clicks, lifetime.impressions),
      conversionRate: rate(lifetime.conversions, lifetime.clicks),
      cpcCents: centsPerUnit(lifetime.spendCents, lifetime.clicks),
      cpaCents: centsPerUnit(lifetime.spendCents, lifetime.conversions),
      roas: lifetime.spendCents > 0 ? Number((lifetime.revenueCents / lifetime.spendCents).toFixed(2)) : null
    };

    const daysActive = calculateActiveDays(campaign);
    const forecast = {
      expectedDailySpendCents: daysActive > 0 ? Math.round(lifetime.spendCents / daysActive) : 0,
      expectedDailyConversions: daysActive > 0 ? Number((lifetime.conversions / daysActive).toFixed(2)) : 0,
      projectedRoas: trailing.spendCents > 0 ? Number((trailing.revenueCents / trailing.spendCents).toFixed(2)) : null
    };

    return {
      lifetime,
      trailing,
      averages,
      forecast,
      daysActive,
      performanceScore: calculatePerformanceScore({ averages, forecast, lifetime }, 'pass')
    };
  }

  static evaluateCompliance(campaign, derived) {
    const violations = [];
    const warnings = [];

    if (!campaign.creativeHeadline || campaign.creativeHeadline.trim().length < MIN_HEADLINE_LENGTH) {
      violations.push({
        code: 'creative_headline_short',
        severity: 'critical',
        message: 'Creative headline is too short. Provide at least 12 characters so ads are reviewable.'
      });
    }

    if (campaign.creativeHeadline && campaign.creativeHeadline.length > MAX_HEADLINE_LENGTH) {
      warnings.push({
        code: 'creative_headline_length',
        severity: 'warning',
        message: 'Creative headline exceeds 160 characters and may be truncated in placements.'
      });
    }

    if (!campaign.creativeUrl) {
      violations.push({
        code: 'missing_landing_page',
        severity: 'critical',
        message: 'A landing page URL is required before the campaign can run.'
      });
    }

    const lifetimeCopy = `${campaign.creativeHeadline ?? ''} ${campaign.creativeDescription ?? ''}`;
    if (containsProhibitedKeyword(lifetimeCopy)) {
      violations.push({
        code: 'prohibited_keywords',
        severity: 'critical',
        message: 'Creative text includes prohibited copy. Remove spam or deceptive keywords.'
      });
    }

    if (!campaign.targetingKeywords?.length) {
      warnings.push({
        code: 'missing_keywords',
        severity: 'warning',
        message: 'Add at least one targeting keyword to improve delivery.'
      });
    }

    const allowableSpend = campaign.budgetDailyCents * derived.daysActive;
    if (allowableSpend > 0 && derived.lifetime.spendCents > allowableSpend * 1.15) {
      violations.push({
        code: 'overspend_detected',
        severity: 'critical',
        message: 'Lifetime spend exceeded the scheduled budget by more than 15%. Campaign paused until reviewed.'
      });
    }

    if (campaign.status === 'active' && derived.trailing.conversions === 0 && derived.trailing.clicks >= 200) {
      warnings.push({
        code: 'zero_conversion',
        severity: 'warning',
        message: 'No conversions recorded in the last 7 days. Optimise creative or targeting to improve ROAS.'
      });
    }

    let status = 'pass';
    if (violations.some((violation) => violation.severity === 'critical')) {
      status = 'halted';
    } else if (violations.length || warnings.length) {
      status = 'needs_review';
    }

    const riskScoreBase = 100 - violations.length * 25 - warnings.length * 10;
    const riskScore = Math.max(5, Math.min(95, riskScoreBase));

    const performanceScore = calculatePerformanceScore(derived, status);

    return {
      status,
      riskScore,
      violations: [...violations, ...warnings],
      performanceScore
    };
  }

  static async syncPerformanceSnapshot(campaign, derived, lifetimeSummary) {
    const updates = {};
    if (campaign.spendTotalCents !== lifetimeSummary.spendCents) {
      updates.spendTotalCents = lifetimeSummary.spendCents;
    }
    if (Math.abs((campaign.ctr ?? 0) - derived.averages.ctr) > 0.0001) {
      updates.ctr = derived.averages.ctr;
    }
    if (campaign.cpcCents !== derived.averages.cpcCents) {
      updates.cpcCents = derived.averages.cpcCents;
    }
    if (campaign.cpaCents !== derived.averages.cpaCents) {
      updates.cpaCents = derived.averages.cpaCents;
    }
    if (campaign.performanceScore !== derived.performanceScore) {
      updates.performanceScore = derived.performanceScore;
    }
    if (Object.keys(updates).length) {
      const updated = await AdsCampaignModel.updateById(campaign.id, updates);
      Object.assign(campaign, updated);
    }
  }

  static async syncComplianceState(campaign, compliance) {
    const previousStatus = campaign.metadata?.lastComplianceStatus;
    const previousHash = JSON.stringify(campaign.metadata?.complianceViolations ?? []);
    const nextHash = JSON.stringify(compliance.violations);

    const updates = {};
    const metadata = {
      ...campaign.metadata,
      lastComplianceStatus: compliance.status,
      complianceRiskScore: compliance.riskScore,
      complianceViolations: compliance.violations
    };

    if (previousStatus !== compliance.status || previousHash !== nextHash) {
      updates.metadata = metadata;
    }

    if (compliance.status === 'halted' && campaign.status === 'active') {
      updates.status = 'paused';
      log.warn({ campaignId: campaign.publicId }, 'Auto-pausing campaign after compliance failure');
      await DomainEventModel.record({
        entityType: 'ads_campaign',
        entityId: String(campaign.id),
        eventType: 'ads.campaign.auto-paused',
        payload: { reason: 'compliance_violation' },
        performedBy: null
      });
    }

    if (Object.keys(updates).length) {
      const updated = await AdsCampaignModel.updateById(campaign.id, updates);
      Object.assign(campaign, updated);
    }
  }

  static async applyLifecycleTransitions(campaign) {
    const now = new Date();
    if (campaign.status === 'active' && campaign.endAt && new Date(campaign.endAt) < now) {
      const updated = await AdsCampaignModel.updateById(campaign.id, { status: 'completed' });
      Object.assign(campaign, updated);
      await DomainEventModel.record({
        entityType: 'ads_campaign',
        entityId: String(campaign.id),
        eventType: 'ads.campaign.completed',
        payload: { reason: 'schedule_complete' },
        performedBy: null
      });
    }

    if (campaign.status === 'scheduled' && campaign.startAt && new Date(campaign.startAt) <= now) {
      const updated = await AdsCampaignModel.updateById(campaign.id, { status: 'active' });
      Object.assign(campaign, updated);
      await DomainEventModel.record({
        entityType: 'ads_campaign',
        entityId: String(campaign.id),
        eventType: 'ads.campaign.activated',
        payload: { reason: 'schedule_start' },
        performedBy: null
      });
    }
  }

  static formatCampaign(campaign, derived, compliance) {
    return {
      id: campaign.publicId,
      internalId: campaign.id,
      name: campaign.name,
      objective: campaign.objective,
      status: campaign.status,
      performanceScore: derived.performanceScore,
      budget: {
        currency: campaign.budgetCurrency,
        dailyCents: campaign.budgetDailyCents
      },
      spend: {
        currency: campaign.spendCurrency,
        totalCents: derived.lifetime.spendCents
      },
      metrics: {
        lifetime: {
          ...derived.lifetime,
          ctr: derived.averages.ctr,
          conversionRate: derived.averages.conversionRate,
          cpcCents: derived.averages.cpcCents,
          cpaCents: derived.averages.cpaCents,
          roas: derived.averages.roas
        },
        trailing7Days: derived.trailing,
        forecast: derived.forecast
      },
      targeting: {
        keywords: campaign.targetingKeywords,
        audiences: campaign.targetingAudiences,
        locations: campaign.targetingLocations,
        languages: campaign.targetingLanguages
      },
      creative: {
        headline: campaign.creativeHeadline,
        description: campaign.creativeDescription,
        url: campaign.creativeUrl
      },
      schedule: {
        startAt: toISO(campaign.startAt),
        endAt: toISO(campaign.endAt)
      },
      compliance,
      metadata: campaign.metadata,
      createdBy: campaign.createdBy,
      createdAt: toISO(campaign.createdAt),
      updatedAt: toISO(campaign.updatedAt)
    };
  }
}
