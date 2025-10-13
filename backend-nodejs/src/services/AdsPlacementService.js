import { randomUUID, createHash } from 'node:crypto';

import AdsCampaignModel from '../models/AdsCampaignModel.js';
import logger from '../config/logger.js';

const log = logger.child({ service: 'AdsPlacementService' });

const CONTEXT_CONFIG = {
  global_feed: { interval: 5, maxPerPage: 3, slot: 'feed-inline' },
  community_feed: { interval: 6, maxPerPage: 3, slot: 'feed-community' },
  search: { interval: null, maxPerPage: 4, slot: 'search-top' },
  course_live: { interval: 3, maxPerPage: 2, slot: 'course-live' }
};

const ACTIVE_STATUSES = new Set(['active', 'scheduled']);

function resolveContextConfig(context) {
  return CONTEXT_CONFIG[context] ?? CONTEXT_CONFIG.global_feed;
}

function isCampaignActive(campaign, now = new Date()) {
  if (!ACTIVE_STATUSES.has(campaign.status)) {
    return false;
  }
  const startAt = campaign.startAt ? new Date(campaign.startAt) : null;
  const endAt = campaign.endAt ? new Date(campaign.endAt) : null;
  if (startAt && startAt > now) {
    return false;
  }
  if (endAt && endAt < now) {
    return false;
  }
  return true;
}

function rankCampaign(campaign, context) {
  const performanceScore = Number(campaign.performanceScore ?? 0);
  const ctr = Number(campaign.ctr ?? 0) * 100;
  const budgetCents = Number(campaign.budgetDailyCents ?? 0);
  const contextBoost = context === 'search' ? 8 : context === 'course_live' ? 6 : 4;
  return performanceScore * 2 + ctr + Math.log10(budgetCents + 1) * 5 + contextBoost;
}

function buildPlacement(campaign, { context, slot, position }) {
  const placementId = `pl_${campaign.publicId}_${position}`;
  const disclosure = 'Sponsored by Edulure Ads';
  const fingerprint = createHash('sha1')
    .update(`${campaign.publicId}:${context}:${position}`)
    .digest('hex');

  return {
    placementId,
    campaignId: campaign.publicId,
    context,
    slot,
    position,
    headline: campaign.creativeHeadline,
    description: campaign.creativeDescription,
    ctaUrl: campaign.creativeUrl,
    advertiser: campaign.name,
    objective: campaign.objective,
    tags: campaign.targetingKeywords ?? [],
    disclosure,
    metrics: {
      ctr: Number(campaign.ctr ?? 0),
      cpcCents: Number(campaign.cpcCents ?? 0),
      cpaCents: Number(campaign.cpaCents ?? 0)
    },
    tracking: {
      impressionKey: fingerprint,
      requestId: randomUUID()
    },
    targeting: {
      audiences: campaign.targetingAudiences ?? [],
      locations: campaign.targetingLocations ?? [],
      languages: campaign.targetingLanguages ?? []
    }
  };
}

function shouldInsertAfter(index, interval) {
  if (!interval) return false;
  return (index + 1) % interval === 0;
}

export default class AdsPlacementService {
  static async fetchEligibleCampaigns({ context, limit = 3, metadata = {} } = {}) {
    const campaigns = await AdsCampaignModel.list({
      status: ['active', 'scheduled'],
      limit: 100,
      orderBy: 'performance_score'
    });

    const now = new Date();
    const filtered = campaigns
      .filter((campaign) => isCampaignActive(campaign, now))
      .map((campaign) => ({
        campaign,
        score: rankCampaign(campaign, context)
      }))
      .sort((a, b) => b.score - a.score);

    const keywordSignal = (metadata.keywords ?? [])
      .map((keyword) => keyword.toLowerCase())
      .filter(Boolean);

    if (keywordSignal.length) {
      filtered.sort((a, b) => {
        const aMatches = (a.campaign.targetingKeywords ?? []).some((keyword) =>
          keywordSignal.includes(String(keyword).toLowerCase())
        );
        const bMatches = (b.campaign.targetingKeywords ?? []).some((keyword) =>
          keywordSignal.includes(String(keyword).toLowerCase())
        );
        if (aMatches === bMatches) return 0;
        return aMatches ? -1 : 1;
      });
    }

    return filtered.slice(0, limit).map((entry, index) => ({
      ...buildPlacement(entry.campaign, {
        context,
        slot: resolveContextConfig(context).slot,
        position: index + 1
      }),
      score: entry.score
    }));
  }

  static async decorateFeed({
    posts,
    context,
    page = 1,
    perPage = 10,
    metadata = {}
  }) {
    const config = resolveContextConfig(context);
    const maxPlacements = Math.min(
      config.maxPerPage ?? 2,
      Math.max(1, Math.round((posts.length || perPage) / (config.interval ?? 4)))
    );

    const placements = await this.fetchEligibleCampaigns({
      context,
      limit: maxPlacements,
      metadata
    });

    if (!placements.length) {
      return {
        items: posts.map((post) => ({ kind: 'post', post })),
        ads: { count: 0, placements: [] }
      };
    }

    const entries = [];
    let placementCursor = 0;
    for (let index = 0; index < posts.length; index += 1) {
      entries.push({ kind: 'post', post: posts[index] });
      if (
        placementCursor < placements.length &&
        (shouldInsertAfter(index, config.interval) ||
          (index === posts.length - 1 && page === 1))
      ) {
        const placement = placements[placementCursor];
        entries.push({ kind: 'ad', ad: { ...placement, position: placementCursor + 1 } });
        placementCursor += 1;
      }
    }

    while (placementCursor < placements.length) {
      const placement = placements[placementCursor];
      entries.push({ kind: 'ad', ad: { ...placement, position: placementCursor + 1 } });
      placementCursor += 1;
    }

    return {
      items: entries,
      ads: {
        count: placements.length,
        placements: placements.map((placement, index) => ({
          placementId: placement.placementId,
          campaignId: placement.campaignId,
          slot: placement.slot,
          position: index + 1,
          headline: placement.headline,
          context,
          tracking: placement.tracking
        }))
      }
    };
  }

  static async placementsForSearch({ query, entities }) {
    try {
      const keywords = String(query ?? '')
        .split(/[\s,]+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 3);

      const placements = await this.fetchEligibleCampaigns({
        context: 'search',
        limit: resolveContextConfig('search').maxPerPage,
        metadata: { keywords, entities }
      });

      return placements.map((placement, index) => ({
        placementId: placement.placementId,
        campaignId: placement.campaignId,
        headline: placement.headline,
        description: placement.description,
        ctaUrl: placement.ctaUrl,
        advertiser: placement.advertiser,
        objective: placement.objective,
        slot: placement.slot,
        position: index + 1,
        disclosure: placement.disclosure
      }));
    } catch (error) {
      log.warn({ err: error }, 'failed to resolve search ad placements');
      return [];
    }
  }
}

