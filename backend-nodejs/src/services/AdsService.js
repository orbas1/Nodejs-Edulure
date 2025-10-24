import { randomUUID } from 'node:crypto';

import db from '../config/database.js';
import logger from '../config/logger.js';
import AdsCampaignModel from '../models/AdsCampaignModel.js';
import AdsCampaignMetricModel from '../models/AdsCampaignMetricModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import { PLACEMENT_CONTEXTS } from './AdsPlacementService.js';

const log = logger.child({ service: 'AdsService' });

const PROHIBITED_KEYWORDS = ['clickbait', 'scam', 'spam', 'crypto giveaway'];
const MIN_HEADLINE_LENGTH = 12;
const MAX_HEADLINE_LENGTH = 160;
const ALLOWED_CAMPAIGN_ROLES = new Set(['admin', 'staff', 'instructor', 'service']);
const ADMIN_LEVEL_ROLES = new Set(['admin', 'staff', 'service']);
const PLACEMENT_CONTEXT_KEYS = Object.keys(PLACEMENT_CONTEXTS);
const BRAND_SAFETY_CATEGORIES = new Set(['standard', 'education', 'financial', 'youth', 'sensitive']);

function toStringArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry ?? '').trim()))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function normalisePlacement(entry) {
  if (!entry) {
    return null;
  }
  const context = typeof entry === 'string' ? entry : entry.context ?? entry.slot ?? null;
  if (!context) {
    return null;
  }
  const key = String(context).trim();
  if (!PLACEMENT_CONTEXT_KEYS.includes(key)) {
    return null;
  }
  const template = PLACEMENT_CONTEXTS[key];
  return {
    context: key,
    slot: entry.slot ?? template.slot,
    surface: entry.surface ?? template.surface,
    label: entry.label ?? template.label ?? key
  };
}

function validatePlacements(rawPlacements, { allowEmpty = false } = {}) {
  const seen = new Set();
  const placements = [];
  const entries = Array.isArray(rawPlacements) ? rawPlacements : [];
  for (const entry of entries) {
    const placement = normalisePlacement(entry);
    if (!placement) continue;
    if (seen.has(placement.context)) continue;
    seen.add(placement.context);
    placements.push(placement);
  }

  if (!placements.length && !allowEmpty) {
    const fallback = normalisePlacement('global_feed');
    if (fallback) {
      placements.push(fallback);
    }
  }

  return placements;
}

function validateBrandSafety(raw = {}) {
  const categories = new Set();
  const provided = Array.isArray(raw.categories)
    ? raw.categories
    : Array.isArray(raw.levels)
    ? raw.levels
    : [];
  for (const value of provided) {
    const key = String(value ?? '')
      .toLowerCase()
      .trim();
    if (!key) continue;
    if (BRAND_SAFETY_CATEGORIES.has(key)) {
      categories.add(key);
    }
  }
  if (!categories.size) {
    categories.add('standard');
  }

  const excludedTopics = toStringArray(raw.excludedTopics ?? raw.blockedTopics ?? []);
  const reviewNotes = typeof raw.reviewNotes === 'string' ? raw.reviewNotes.trim() : null;

  return {
    categories: Array.from(categories),
    excludedTopics,
    reviewNotes: reviewNotes && reviewNotes.length ? reviewNotes : null
  };
}

function ensurePlacementCompatibility({ placements, targeting }) {
  const contexts = Array.isArray(placements) ? placements.map((placement) => placement.context) : [];
  const keywords = toStringArray(targeting?.keywords ?? []);
  const audiences = toStringArray(targeting?.audiences ?? []);

  if (contexts.includes('search') && keywords.length === 0) {
    const error = new Error('Search placements require at least one keyword.');
    error.status = 422;
    throw error;
  }

  if (
    (contexts.includes('global_feed') || contexts.includes('community_feed')) &&
    keywords.length === 0 &&
    audiences.length === 0
  ) {
    const error = new Error('Feed placements require keywords or audience segments.');
    error.status = 422;
    throw error;
  }
}

function normaliseRole(role) {
  return typeof role === 'string' ? role.toLowerCase() : null;
}

function resolveActorId(actor) {
  if (!actor || typeof actor !== 'object') {
    return null;
  }
  return actor.id ?? actor.userId ?? actor.sub ?? null;
}

function assertActorCanManageCampaigns(actor) {
  const actorId = resolveActorId(actor);
  if (!actorId) {
    const error = new Error('Actor identity required');
    error.status = 401;
    throw error;
  }

  const role = normaliseRole(actor?.role);
  if (!role || !ALLOWED_CAMPAIGN_ROLES.has(role)) {
    const error = new Error('You do not have permission to manage campaigns');
    error.status = 403;
    throw error;
  }

  return { id: actorId, role };
}

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

function averageMetric(series, field) {
  if (!Array.isArray(series) || series.length === 0) {
    return 0;
  }
  const total = series.reduce((accumulator, entry) => accumulator + Number(entry?.[field] ?? 0), 0);
  return total / series.length;
}

function computePercentageChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return null;
  }
  return Number(((current - previous) / Math.abs(previous)).toFixed(4));
}

function determinePacingStatus(budgetDailyCents, avgDailySpendCents) {
  if (!budgetDailyCents || budgetDailyCents <= 0) {
    return 'unbounded';
  }
  if (avgDailySpendCents > budgetDailyCents * 1.1) {
    return 'over';
  }
  if (avgDailySpendCents < budgetDailyCents * 0.6) {
    return 'under';
  }
  return 'on_track';
}

function pickBestDay(series, field) {
  if (!Array.isArray(series) || series.length === 0) {
    return null;
  }
  const best = series.reduce((accumulator, entry) => {
    if (!accumulator) {
      return entry;
    }
    const currentValue = Number(entry?.[field] ?? 0);
    const bestValue = Number(accumulator?.[field] ?? 0);
    return currentValue > bestValue ? entry : accumulator;
  }, null);

  if (!best) {
    return null;
  }

  return {
    date: best.date,
    value: Number(best?.[field] ?? 0)
  };
}

function generateInsightRecommendations({ campaign, summary, trends, pacing, daysObserved }) {
  const recommendations = [];

  if (trends.ctrChange !== null && trends.ctrChange <= -0.1) {
    recommendations.push({
      type: 'creative',
      severity: 'medium',
      message: `Click-through rate dropped ${(Math.abs(trends.ctrChange) * 100).toFixed(1)}% over the last period.`,
      action: 'Refresh creative assets or expand keywords to regain engagement.'
    });
  }

  if (trends.conversionRateChange !== null && trends.conversionRateChange <= -0.15) {
    recommendations.push({
      type: 'conversion',
      severity: 'medium',
      message: `Conversion rate declined ${(Math.abs(trends.conversionRateChange) * 100).toFixed(1)}% versus the prior window.`,
      action: 'Audit landing page relevance and confirm tracking pixels fire correctly.'
    });
  }

  if (summary.conversions === 0 && summary.clicks >= 100) {
    recommendations.push({
      type: 'conversion_tracking',
      severity: 'high',
      message: 'No conversions recorded despite significant click volume.',
      action: 'Verify conversion tracking events and ensure the post-click experience matches the campaign objective.'
    });
  }

  if (summary.conversionRate < 0.02 && summary.clicks >= 150) {
    recommendations.push({
      type: 'funnel',
      severity: 'high',
      message: 'Conversion rate is below 2% for the observed period.',
      action: 'Tighten audience targeting or iterate on offer positioning to improve relevance.'
    });
  }

  if (pacing.status === 'over') {
    recommendations.push({
      type: 'budget',
      severity: 'high',
      message: 'Average daily spend is exceeding the configured budget.',
      action: 'Lower bid caps or increase the daily budget to prevent early exhaustion.'
    });
  } else if (pacing.status === 'under' && daysObserved >= 3) {
    recommendations.push({
      type: 'delivery',
      severity: 'low',
      message: 'Campaign is underspending relative to budget.',
      action: 'Raise bids slightly or broaden targeting segments to capture additional inventory.'
    });
  }

  return recommendations;
}

function sanitizeRecommendationList(recommendations) {
  if (!Array.isArray(recommendations)) {
    return [];
  }

  return recommendations.slice(0, 10).map((recommendation) => ({
    id: randomUUID(),
    type: recommendation.type ?? 'general',
    severity: recommendation.severity ?? 'medium',
    message: recommendation.message ?? '',
    action: recommendation.action ?? null
  }));
}

function sanitizeSummaryForHistory(summary = {}) {
  return {
    impressions: Number(summary.impressions ?? 0),
    clicks: Number(summary.clicks ?? 0),
    conversions: Number(summary.conversions ?? 0),
    spendCents: Number(summary.spendCents ?? 0),
    revenueCents: Number(summary.revenueCents ?? 0),
    ctr: Number(summary.ctr ?? 0),
    conversionRate: Number(summary.conversionRate ?? 0),
    cpcCents: Number(summary.cpcCents ?? 0),
    cpaCents: Number(summary.cpaCents ?? 0),
    avgDailySpendCents: Number(summary.avgDailySpendCents ?? 0)
  };
}

function sanitizeTrendsForHistory(trends = {}) {
  return {
    ctrChange: trends.ctrChange ?? null,
    conversionRateChange: trends.conversionRateChange ?? null,
    spendChange: trends.spendChange ?? null,
    sampleDays: trends.sampleDays ?? null
  };
}

function sanitizePacingForHistory(pacing = {}) {
  return {
    status: pacing.status ?? null,
    budgetDailyCents: Number(pacing.budgetDailyCents ?? 0),
    avgDailySpendCents: Number(pacing.avgDailySpendCents ?? 0)
  };
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
    const { id: actorId, role: actorRole } = assertActorCanManageCampaigns(actor);
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

    if (!ADMIN_LEVEL_ROLES.has(actorRole)) {
      queryFilters.createdBy = actorId;
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
    const { id: actorId, role: actorRole } = assertActorCanManageCampaigns(actor);
    const campaign = await AdsCampaignModel.findByPublicId(publicId);
    if (!campaign) {
      const error = new Error('Campaign not found');
      error.status = 404;
      throw error;
    }
    if (!ADMIN_LEVEL_ROLES.has(actorRole) && campaign.createdBy !== actorId) {
      const error = new Error('You do not have permission to manage this campaign');
      error.status = 403;
      throw error;
    }

    const [hydrated] = await this.hydrateCampaignCollection([campaign]);
    return hydrated;
  }

  static async createCampaign(actor, payload) {
    const { id: actorId } = assertActorCanManageCampaigns(actor);
    const schedule = payload.schedule ?? {};
    const startInput = payload.startAt ?? schedule.startAt ?? null;
    const endInput = payload.endAt ?? schedule.endAt ?? null;
    const startAt = startInput ? new Date(startInput) : null;
    const endAt = endInput ? new Date(endInput) : null;
    if (startAt && endAt && endAt < startAt) {
      const error = new Error('End date must be after the start date');
      error.status = 422;
      throw error;
    }

    const placements = validatePlacements(payload.placements);
    const brandSafety = validateBrandSafety(payload.brandSafety);
    const targeting = {
      keywords: toStringArray(payload.targeting?.keywords),
      audiences: toStringArray(payload.targeting?.audiences),
      locations: toStringArray(payload.targeting?.locations),
      languages: toStringArray(payload.targeting?.languages ?? ['en'])
    };

    ensurePlacementCompatibility({ placements, targeting });

    const campaign = await db.transaction(async (trx) => {
      const created = await AdsCampaignModel.create(
        {
          createdBy: actorId,
          name: payload.name,
          objective: payload.objective,
          status: payload.status ?? 'draft',
          budgetCurrency: payload.budget?.currency ?? payload.budgetCurrency ?? 'USD',
          budgetDailyCents: payload.budget?.dailyCents ?? payload.budgetDailyCents ?? 0,
          spendCurrency: payload.spendCurrency ?? payload.budget?.currency ?? 'USD',
          targetingKeywords: targeting.keywords,
          targetingAudiences: targeting.audiences,
          targetingLocations: targeting.locations,
          targetingLanguages: targeting.languages.length ? targeting.languages : ['en'],
          creativeHeadline: payload.creative?.headline,
          creativeDescription: payload.creative?.description,
          creativeUrl: payload.creative?.url,
          startAt: startAt ? startAt.toISOString() : null,
          endAt: endAt ? endAt.toISOString() : null,
          metadata: {
            reviewChecklist: payload.metadata?.reviewChecklist ?? [],
            landingPage: payload.creative?.url ?? null,
            placements,
            brandSafety,
            creativeAsset: payload.creative?.asset ?? null,
            preview: payload.preview ?? { theme: 'light', accent: 'primary' },
            lastFormSurface: payload.metadata?.lastFormSurface ?? 'dashboard_ads',
            lastCompatibilityCheckAt: new Date().toISOString()
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
            createdBy: actorId,
            objective: payload.objective,
            status: created.status,
            placements: placements.map((placement) => placement.context),
            brandSafety: brandSafety.categories
          },
          performedBy: actorId
        },
        trx
      );

      return created;
    });

    const [hydrated] = await this.hydrateCampaignCollection([campaign]);
    return hydrated;
  }

  static async updateCampaign(publicId, actor, payload) {
    const { id: actorId, role: actorRole } = assertActorCanManageCampaigns(actor);
    const campaign = await AdsCampaignModel.findByPublicId(publicId);
    if (!campaign) {
      const error = new Error('Campaign not found');
      error.status = 404;
      throw error;
    }
    if (!ADMIN_LEVEL_ROLES.has(actorRole) && campaign.createdBy !== actorId) {
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
      const targetingUpdates = {
        keywords: toStringArray(payload.targeting.keywords ?? campaign.targetingKeywords),
        audiences: toStringArray(payload.targeting.audiences ?? campaign.targetingAudiences),
        locations: toStringArray(payload.targeting.locations ?? campaign.targetingLocations),
        languages: toStringArray(payload.targeting.languages ?? campaign.targetingLanguages)
      };
      updates.targetingKeywords = targetingUpdates.keywords;
      updates.targetingAudiences = targetingUpdates.audiences;
      updates.targetingLocations = targetingUpdates.locations;
      updates.targetingLanguages = targetingUpdates.languages.length
        ? targetingUpdates.languages
        : campaign.targetingLanguages;
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
    const metadata = { ...campaign.metadata };
    if (payload.metadata) {
      Object.assign(metadata, payload.metadata);
    }
    if (payload.placements) {
      metadata.placements = validatePlacements(payload.placements);
    }
    if (payload.brandSafety) {
      metadata.brandSafety = validateBrandSafety(payload.brandSafety);
    }
    if (payload.creative && Object.prototype.hasOwnProperty.call(payload.creative, 'asset')) {
      metadata.creativeAsset = payload.creative.asset ?? null;
    }
    if (payload.preview) {
      metadata.preview = { ...metadata.preview, ...payload.preview };
    }
    metadata.lastCompatibilityCheckAt = new Date().toISOString();

    const nextTargeting = {
      keywords: updates.targetingKeywords ?? campaign.targetingKeywords,
      audiences: updates.targetingAudiences ?? campaign.targetingAudiences,
      locations: updates.targetingLocations ?? campaign.targetingLocations,
      languages: updates.targetingLanguages ?? campaign.targetingLanguages
    };
    const nextPlacements = metadata.placements ?? campaign.metadata?.placements ?? [];
    ensurePlacementCompatibility({ placements: nextPlacements, targeting: nextTargeting });

    updates.metadata = metadata;

    const updated = await AdsCampaignModel.updateById(campaign.id, updates);

    await DomainEventModel.record({
      entityType: 'ads_campaign',
      entityId: String(updated.id),
      eventType: 'ads.campaign.updated',
      payload: {
        fields: Object.keys(updates)
      },
      performedBy: actorId
    });

    const [hydrated] = await this.hydrateCampaignCollection([updated]);
    return hydrated;
  }

  static async pauseCampaign(publicId, actor, reason = 'manual_pause') {
    const { id: actorId, role: actorRole } = assertActorCanManageCampaigns(actor);
    const campaign = await AdsCampaignModel.findByPublicId(publicId);
    if (!campaign) {
      const error = new Error('Campaign not found');
      error.status = 404;
      throw error;
    }
    if (!ADMIN_LEVEL_ROLES.has(actorRole) && campaign.createdBy !== actorId) {
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
      performedBy: actorId
    });

    return this.getCampaign(publicId, { id: actorId, role: actorRole });
  }

  static async resumeCampaign(publicId, actor) {
    const { id: actorId, role: actorRole } = assertActorCanManageCampaigns(actor);
    const campaign = await AdsCampaignModel.findByPublicId(publicId);
    if (!campaign) {
      const error = new Error('Campaign not found');
      error.status = 404;
      throw error;
    }
    if (!ADMIN_LEVEL_ROLES.has(actorRole) && campaign.createdBy !== actorId) {
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
      performedBy: actorId
    });

    return this.getCampaign(publicId, { id: actorId, role: actorRole });
  }

  static async recordDailyMetrics(publicId, actor, payload) {
    const { id: actorId, role: actorRole } = assertActorCanManageCampaigns(actor);
    const campaign = await AdsCampaignModel.findByPublicId(publicId);
    if (!campaign) {
      const error = new Error('Campaign not found');
      error.status = 404;
      throw error;
    }
    if (!ADMIN_LEVEL_ROLES.has(actorRole) && campaign.createdBy !== actorId) {
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
      performedBy: actorId
    });

    return hydrated;
  }

  static async getInsights(publicId, actor, { windowDays = 14 } = {}) {
    const { id: actorId, role: actorRole } = assertActorCanManageCampaigns(actor);
    const campaign = await AdsCampaignModel.findByPublicId(publicId);
    if (!campaign) {
      const error = new Error('Campaign not found');
      error.status = 404;
      throw error;
    }
    if (!ADMIN_LEVEL_ROLES.has(actorRole) && campaign.createdBy !== actorId) {
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

    const dailySeries = orderedMetrics.map((metric) => ({
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

    const daysObserved = dailySeries.length;
    const recentWindowSize = Math.min(daysObserved, 7);
    const recentWindow = recentWindowSize ? dailySeries.slice(-recentWindowSize) : [];
    const previousWindow = recentWindowSize
      ? dailySeries.slice(0, Math.max(dailySeries.length - recentWindowSize, 0)).slice(-recentWindowSize)
      : [];

    const trends = {
      ctrChange: computePercentageChange(averageMetric(recentWindow, 'ctr'), averageMetric(previousWindow, 'ctr')),
      conversionRateChange: computePercentageChange(
        averageMetric(recentWindow, 'conversionRate'),
        averageMetric(previousWindow, 'conversionRate')
      ),
      spendChange: computePercentageChange(
        averageMetric(recentWindow, 'spendCents'),
        averageMetric(previousWindow, 'spendCents')
      ),
      sampleDays: recentWindowSize
    };

    const avgDailySpendCents = daysObserved ? Math.round(totals.spendCents / daysObserved) : 0;
    const pacing = {
      budgetDailyCents: Number(campaign.budgetDailyCents ?? 0),
      avgDailySpendCents,
      status: determinePacingStatus(Number(campaign.budgetDailyCents ?? 0), avgDailySpendCents)
    };

    const summaryMetrics = {
      impressions: totals.impressions,
      clicks: totals.clicks,
      conversions: totals.conversions,
      spendCents: totals.spendCents,
      revenueCents: totals.revenueCents,
      ctr: rate(totals.clicks, totals.impressions),
      conversionRate: rate(totals.conversions, totals.clicks),
      cpcCents: centsPerUnit(totals.spendCents, totals.clicks),
      cpaCents: centsPerUnit(totals.spendCents, totals.conversions),
      avgDailySpendCents,
      pacing
    };

    const highlights = {
      topCtrDay: pickBestDay(dailySeries, 'ctr'),
      topConversionDay: pickBestDay(dailySeries, 'conversionRate')
    };

    const recommendations = generateInsightRecommendations({
      campaign,
      summary: summaryMetrics,
      trends,
      pacing,
      daysObserved
    });

    const generatedAt = new Date().toISOString();
    const history = await this.appendInsightAudit({
      campaign,
      actorId,
      summary: summaryMetrics,
      trends,
      pacing,
      recommendations,
      windowDays,
      generatedAt
    });

    return {
      summary: summaryMetrics,
      daily: dailySeries,
      trends,
      highlights,
      recommendations,
      history
    };
  }

  static async appendInsightAudit({
    campaign,
    actorId,
    summary,
    trends,
    pacing,
    recommendations,
    windowDays,
    generatedAt
  }) {
    if (!campaign?.id) {
      return Array.isArray(campaign?.metadata?.insightsHistory) ? campaign.metadata.insightsHistory : [];
    }

    const timestamp = generatedAt ?? new Date().toISOString();
    const historyEntry = {
      id: randomUUID(),
      generatedAt: timestamp,
      actorId: actorId ?? null,
      windowDays: windowDays ?? null,
      summary: sanitizeSummaryForHistory(summary),
      trends: sanitizeTrendsForHistory(trends),
      pacing: sanitizePacingForHistory(pacing),
      recommendations: sanitizeRecommendationList(recommendations)
    };

    const metadata = { ...(campaign.metadata ?? {}) };
    const history = Array.isArray(metadata.insightsHistory) ? [...metadata.insightsHistory, historyEntry] : [historyEntry];
    metadata.insightsHistory = history.slice(-20);
    metadata.lastInsight = {
      generatedAt: timestamp,
      actorId: actorId ?? null,
      windowDays: windowDays ?? null,
      recommendationCount: historyEntry.recommendations.length
    };

    await AdsCampaignModel.updateById(campaign.id, { metadata });
    return metadata.insightsHistory;
  }

  static async hydrateCampaignCollection(campaigns) {
    if (!Array.isArray(campaigns) || campaigns.length === 0) {
      return [];
    }

    const ids = campaigns.map((campaign) => campaign.id);
    const lifetimeMap = await AdsCampaignMetricModel.summariseByCampaignIds(ids);
    const trailingMap = await AdsCampaignMetricModel.summariseWindowBulk(ids, { windowDays: 7 });

    await Promise.all(campaigns.map((campaign) => this.applyLifecycleTransitions(campaign)));

    const results = [];
    for (const campaign of campaigns) {
      const lifetime = lifetimeMap.get(campaign.id) ?? defaultSummary();
      const trailing = trailingMap.get(campaign.id) ?? defaultSummary();

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
        url: campaign.creativeUrl,
        asset: campaign.metadata?.creativeAsset ?? null
      },
      schedule: {
        startAt: toISO(campaign.startAt),
        endAt: toISO(campaign.endAt)
      },
      compliance,
      placements: Array.isArray(campaign.metadata?.placements) ? campaign.metadata.placements : [],
      brandSafety: campaign.metadata?.brandSafety ?? { categories: ['standard'], excludedTopics: [] },
      preview: campaign.metadata?.preview ?? { theme: 'light', accent: 'primary' },
      metadata: campaign.metadata,
      createdBy: campaign.createdBy,
      createdAt: toISO(campaign.createdAt),
      updatedAt: toISO(campaign.updatedAt)
    };
  }
}
