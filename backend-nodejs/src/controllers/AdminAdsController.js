import Joi from 'joi';

import db from '../config/database.js';
import AdsCampaignModel from '../models/AdsCampaignModel.js';
import { paginated, created, success } from '../utils/httpResponse.js';

const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed', 'archived'];
const CAMPAIGN_OBJECTIVES = ['awareness', 'acquisition', 'retention', 'upsell', 'cross_sell'];

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(25),
  search: Joi.string().trim().allow('', null),
  status: Joi.alternatives().try(
    Joi.string().valid(...CAMPAIGN_STATUSES),
    Joi.array().items(Joi.string().valid(...CAMPAIGN_STATUSES))
  )
});

const campaignPayloadSchema = Joi.object({
  name: Joi.string().trim().max(200).required(),
  objective: Joi.string()
    .valid(...CAMPAIGN_OBJECTIVES)
    .default('acquisition'),
  status: Joi.string()
    .valid(...CAMPAIGN_STATUSES)
    .default('draft'),
  budgetDaily: Joi.number().precision(2).min(0).default(0),
  spendTotal: Joi.number().precision(2).min(0).default(0),
  performanceScore: Joi.number().min(0).max(100).allow(null).optional(),
  ctr: Joi.number().precision(4).min(0).allow(null).optional(),
  cpc: Joi.number().precision(4).min(0).allow(null).optional(),
  cpa: Joi.number().precision(4).min(0).allow(null).optional(),
  targetingKeywords: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(60)), Joi.string().allow('', null)),
  targetingAudiences: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(60)), Joi.string().allow('', null)),
  targetingLocations: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(60)), Joi.string().allow('', null)),
  targetingLanguages: Joi.alternatives().try(Joi.array().items(Joi.string().trim().max(10)), Joi.string().allow('', null)),
  creativeHeadline: Joi.string().trim().max(150).allow('', null).optional(),
  creativeDescription: Joi.string().trim().max(500).allow('', null).optional(),
  creativeUrl: Joi.string().uri().allow('', null).optional(),
  startAt: Joi.date().iso().allow(null).optional(),
  endAt: Joi.date().iso().allow(null).optional(),
  metadata: Joi.alternatives().try(Joi.object(), Joi.string().allow('', null)).default({})
});

const campaignUpdateSchema = campaignPayloadSchema.fork(['name'], (schema) => schema.optional());

function toArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === 'string' && entry.trim().length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
}

function toObject(value) {
  if (!value) {
    return {};
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function buildCampaignPayload(payload, actorId) {
  const result = {
    metadata: {
      ...toObject(payload.metadata),
      lastUpdatedBy: actorId ?? null
    }
  };

  if (payload.name !== undefined) result.name = payload.name;
  if (payload.objective !== undefined) result.objective = payload.objective;
  if (payload.status !== undefined) result.status = payload.status;
  if (payload.budgetDaily !== undefined) result.budgetDailyCents = Math.round(payload.budgetDaily * 100);
  if (payload.spendTotal !== undefined) result.spendTotalCents = Math.round(payload.spendTotal * 100);
  if (payload.performanceScore !== undefined) result.performanceScore = payload.performanceScore;
  if (payload.ctr !== undefined) result.ctr = payload.ctr;
  if (payload.cpc !== undefined) result.cpcCents = Math.round(payload.cpc * 100);
  if (payload.cpa !== undefined) result.cpaCents = Math.round(payload.cpa * 100);
  if (payload.targetingKeywords !== undefined) result.targetingKeywords = toArray(payload.targetingKeywords);
  if (payload.targetingAudiences !== undefined) result.targetingAudiences = toArray(payload.targetingAudiences);
  if (payload.targetingLocations !== undefined) result.targetingLocations = toArray(payload.targetingLocations);
  if (payload.targetingLanguages !== undefined) result.targetingLanguages = toArray(payload.targetingLanguages);
  if (payload.creativeHeadline !== undefined) result.creativeHeadline = payload.creativeHeadline ?? null;
  if (payload.creativeDescription !== undefined) result.creativeDescription = payload.creativeDescription ?? null;
  if (payload.creativeUrl !== undefined) result.creativeUrl = payload.creativeUrl ?? null;
  if (payload.startAt !== undefined) result.startAt = payload.startAt ?? null;
  if (payload.endAt !== undefined) result.endAt = payload.endAt ?? null;
  result.createdBy = actorId ?? null;
  return result;
}

export default class AdminAdsController {
  static async listCampaigns(req, res, next) {
    try {
      const params = await listQuerySchema.validateAsync(req.query, { abortEarly: false, stripUnknown: true });
      const offset = (params.page - 1) * params.perPage;

      const [items, total] = await Promise.all([
        AdsCampaignModel.list({
          search: params.search,
          status: params.status,
          limit: params.perPage,
          offset
        }),
        AdsCampaignModel.count({ search: params.search, status: params.status })
      ]);

      return paginated(res, {
        data: items,
        message: 'Ad campaigns retrieved',
        pagination: {
          page: params.page,
          perPage: params.perPage,
          total,
          totalPages: Math.ceil(total / params.perPage)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async createCampaign(req, res, next) {
    try {
      const payload = await campaignPayloadSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const actorId = req.user?.id ?? null;
      const record = await AdsCampaignModel.create(buildCampaignPayload(payload, actorId));
      return created(res, { data: record, message: 'Ad campaign created' });
    } catch (error) {
      next(error);
    }
  }

  static async updateCampaign(req, res, next) {
    try {
      const payload = await campaignUpdateSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const record = await AdsCampaignModel.updateById(
        Number(req.params.campaignId),
        buildCampaignPayload(payload, req.user?.id)
      );
      return success(res, { data: record, message: 'Ad campaign updated' });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCampaign(req, res, next) {
    try {
      await AdsCampaignModel.deleteById(Number(req.params.campaignId));
      return success(res, { message: 'Ad campaign deleted', status: 204 });
    } catch (error) {
      next(error);
    }
  }

  static async summary(_req, res, next) {
    try {
      const DAY = 24 * 60 * 60 * 1000;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY);

      const [campaignTotals, metricsRow, topCampaigns] = await Promise.all([
        db('ads_campaigns')
          .select({
            total: db.raw('COUNT(*)'),
            active: db.raw("SUM(CASE WHEN status IN ('active') THEN 1 ELSE 0 END)")
          })
          .first(),
        db('ads_campaign_metrics_daily')
          .select({
            impressions: db.raw('SUM(impressions)::bigint'),
            clicks: db.raw('SUM(clicks)::bigint'),
            conversions: db.raw('SUM(conversions)::bigint'),
            spendCents: db.raw('SUM(spend_cents)::bigint'),
            revenueCents: db.raw('SUM(revenue_cents)::bigint')
          })
          .where('metric_date', '>=', thirtyDaysAgo)
          .first(),
        db('ads_campaign_metrics_daily as m')
          .leftJoin('ads_campaigns as c', 'm.campaign_id', 'c.id')
          .select({
            campaignId: 'm.campaign_id',
            name: 'c.name',
            status: 'c.status',
            impressions: db.raw('SUM(m.impressions)::bigint'),
            clicks: db.raw('SUM(m.clicks)::bigint'),
            conversions: db.raw('SUM(m.conversions)::bigint'),
            spendCents: db.raw('SUM(m.spend_cents)::bigint'),
            revenueCents: db.raw('SUM(m.revenue_cents)::bigint')
          })
          .where('m.metric_date', '>=', thirtyDaysAgo)
          .groupBy('m.campaign_id', 'c.name', 'c.status')
          .orderByRaw('SUM(m.revenue_cents) - SUM(m.spend_cents) DESC NULLS LAST')
          .limit(5)
      ]);

      const recentWindow = await db('ads_campaign_metrics_daily as m')
        .select({
          metricDate: 'm.metric_date',
          impressions: db.raw('SUM(m.impressions)::bigint'),
          clicks: db.raw('SUM(m.clicks)::bigint'),
          conversions: db.raw('SUM(m.conversions)::bigint'),
          spendCents: db.raw('SUM(m.spend_cents)::bigint'),
          revenueCents: db.raw('SUM(m.revenue_cents)::bigint')
        })
        .where('m.metric_date', '>=', db.raw("current_date - interval '14 days'"))
        .groupBy('m.metric_date')
        .orderBy('m.metric_date', 'asc');

      return success(res, {
        data: {
          totalCampaigns: Number(campaignTotals?.total ?? 0),
          activeCampaigns: Number(campaignTotals?.active ?? 0),
          metrics30d: {
            impressions: Number(metricsRow?.impressions ?? 0),
            clicks: Number(metricsRow?.clicks ?? 0),
            conversions: Number(metricsRow?.conversions ?? 0),
            spendCents: Number(metricsRow?.spendCents ?? 0),
            revenueCents: Number(metricsRow?.revenueCents ?? 0)
          },
          topCampaigns: topCampaigns.map((campaign) => {
            const spend = Number(campaign.spendCents ?? 0);
            const revenue = Number(campaign.revenueCents ?? 0);
            const roas = spend === 0 ? null : Number((revenue / spend).toFixed(2));
            return {
              id: Number(campaign.campaignId),
              name: campaign.name,
              status: campaign.status,
              impressions: Number(campaign.impressions ?? 0),
              clicks: Number(campaign.clicks ?? 0),
              conversions: Number(campaign.conversions ?? 0),
              spendCents: spend,
              revenueCents: revenue,
              roas
            };
          }),
          performanceTrend: recentWindow.map((row) => ({
            date: row.metricDate instanceof Date ? row.metricDate.toISOString().slice(0, 10) : String(row.metricDate),
            impressions: Number(row.impressions ?? 0),
            clicks: Number(row.clicks ?? 0),
            conversions: Number(row.conversions ?? 0),
            spendCents: Number(row.spendCents ?? 0),
            revenueCents: Number(row.revenueCents ?? 0)
          }))
        },
        message: 'Ad campaign metrics compiled'
      });
    } catch (error) {
      next(error);
    }
  }
}
