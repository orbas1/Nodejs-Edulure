import logger from '../config/logger.js';
import CommunityService from './CommunityService.js';
import AdsPlacementService from './AdsPlacementService.js';
import CreationProjectModel from '../models/CreationProjectModel.js';
import AdsCampaignModel from '../models/AdsCampaignModel.js';
import AdsCampaignMetricModel from '../models/AdsCampaignMetricModel.js';

const log = logger.child({ service: 'LiveFeedService' });

const RANGE_DAYS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '180d': 180,
  '365d': 365
};

function ensureActor(actor) {
  if (!actor || typeof actor.id !== 'number') {
    const error = new Error('Unauthorised feed request');
    error.status = 401;
    throw error;
  }
}

function resolveRange(rangeKey) {
  const now = new Date();
  const days = RANGE_DAYS[rangeKey] ?? RANGE_DAYS['30d'];
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(now.getTime());
  return { key: rangeKey, start, end };
}

function normaliseString(value) {
  if (!value) return undefined;
  const text = String(value).trim();
  return text.length ? text : undefined;
}

function enrichFeedItem(entry, context) {
  if (!entry || typeof entry !== 'object') {
    return entry;
  }

  const timestampSource = entry.kind === 'post' ? entry.post?.publishedAt ?? entry.post?.createdAt : undefined;
  const timestamp = timestampSource ? new Date(timestampSource).toISOString() : new Date().toISOString();

  return {
    ...entry,
    context,
    timestamp
  };
}

function topTagsFromPosts(posts, limit = 5) {
  const counts = new Map();
  for (const post of posts) {
    const tags = Array.isArray(post?.tags) ? post.tags : [];
    for (const tag of tags) {
      const key = String(tag).trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

function deriveEngagementMomentum({ posts, comments, reactions, uniqueCommunities }) {
  const postScore = Math.min(posts.length * 2, 40);
  const commentScore = Math.min(comments * 0.5, 30);
  const reactionScore = Math.min(reactions * 0.25, 20);
  const communityScore = Math.min(uniqueCommunities * 5, 10);
  const total = postScore + commentScore + reactionScore + communityScore;
  return Math.max(0, Math.min(100, Math.round(total)));
}

export default class LiveFeedService {
  static async getFeed({
    actor,
    context = 'global',
    community,
    page = 1,
    perPage = 20,
    includeAnalytics = true,
    includeHighlights = true,
    range = '30d',
    filters = {}
  } = {}) {
    ensureActor(actor);
    const rangeWindow = resolveRange(range);

    const base = await this.fetchFeedCore({ actor, context, community, page, perPage, filters });

    const highlights = includeHighlights
      ? await this.composeHighlights({ actor, context: base.context, limit: 4 })
      : [];

    const analytics = includeAnalytics
      ? await this.computeAnalytics({ actor, base, range: rangeWindow })
      : null;

    const items = base.items.map((entry) => enrichFeedItem(entry, base.context));

    return {
      context: base.context,
      community: base.community,
      range: {
        key: rangeWindow.key,
        start: rangeWindow.start.toISOString(),
        end: rangeWindow.end.toISOString()
      },
      generatedAt: new Date().toISOString(),
      pagination: base.pagination,
      ads: base.ads,
      items,
      highlights,
      analytics
    };
  }

  static async getAnalytics({ actor, context = 'global', community, range = '30d', filters = {} } = {}) {
    ensureActor(actor);
    const rangeWindow = resolveRange(range);
    const base = await this.fetchFeedCore({
      actor,
      context,
      community,
      page: 1,
      perPage: Math.max(Number(filters.perPage ?? 25), 25),
      filters: { ...filters, search: filters.search }
    });

    return this.computeAnalytics({ actor, base, range: rangeWindow });
  }

  static async getPlacements({ context = 'global_feed', limit = 3, metadata = {} } = {}) {
    const placements = await AdsPlacementService.fetchEligibleCampaigns({
      context,
      limit,
      metadata
    });
    return placements.map((placement, index) => ({
      ...placement,
      position: index + 1
    }));
  }

  static async fetchFeedCore({ actor, context, community, page, perPage, filters = {} }) {
    const sharedFilters = {
      page,
      perPage,
      query: normaliseString(filters.search),
      postType: normaliseString(filters.postType)
    };

    if (context === 'community') {
      if (!community) {
        const error = new Error('Community context requires identifier');
        error.status = 422;
        throw error;
      }

      const result = await CommunityService.listFeed(community, actor.id, {
        ...sharedFilters,
        actorRole: actor.role
      });
      return {
        ...result,
        context: 'community',
        community
      };
    }

    const result = await CommunityService.listFeedForUser(actor.id, {
      ...sharedFilters,
      actorRole: actor.role
    });
    return {
      ...result,
      context: 'global',
      community: null
    };
  }

  static async composeHighlights({ actor, context, limit = 4 } = {}) {
    const [projects, campaigns] = await Promise.all([
      this.fetchProjectHighlights({ actor, limit }),
      this.fetchCampaignSpotlights({ limit })
    ]);

    const combined = [...projects, ...campaigns]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    if (!combined.length) {
      return combined;
    }

    return combined.map((entry) => ({
      ...entry,
      context,
      position: combined.findIndex((candidate) => candidate.id === entry.id && candidate.type === entry.type) + 1
    }));
  }

  static async fetchProjectHighlights({ actor, limit = 3 }) {
    try {
      const scope = actor.role === 'instructor' ? { ownerId: actor.id } : {};
      const projects = await CreationProjectModel.list({
        ...scope,
        status: ['published', 'approved'],
        includeArchived: false,
        orderBy: 'updated_at',
        orderDirection: 'desc',
        limit
      });

      return projects.map((project) => ({
        type: 'project',
        id: project.publicId,
        title: project.title,
        summary: project.summary,
        status: project.status,
        projectType: project.type,
        ownerId: project.ownerId,
        metadata: project.metadata,
        analyticsTargets: project.analyticsTargets,
        timestamp: project.updatedAt ? new Date(project.updatedAt).toISOString() : new Date().toISOString()
      }));
    } catch (error) {
      log.warn({ err: error }, 'Failed to fetch project highlights for live feed');
      return [];
    }
  }

  static async fetchCampaignSpotlights({ limit = 3 } = {}) {
    try {
      const campaigns = await AdsCampaignModel.list({
        status: ['active', 'scheduled'],
        orderBy: 'performance_score',
        orderDirection: 'desc',
        limit
      });

      return campaigns.map((campaign) => ({
        type: 'campaign',
        id: campaign.publicId,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        metrics: {
          performanceScore: Number(campaign.performanceScore ?? 0),
          ctr: Number(campaign.ctr ?? 0),
          cpcCents: Number(campaign.cpcCents ?? 0),
          cpaCents: Number(campaign.cpaCents ?? 0),
          spendCents: Number(campaign.spendTotalCents ?? 0)
        },
        targeting: {
          keywords: campaign.targetingKeywords,
          audiences: campaign.targetingAudiences,
          locations: campaign.targetingLocations,
          languages: campaign.targetingLanguages
        },
        schedule: {
          startAt: campaign.startAt ? new Date(campaign.startAt).toISOString() : null,
          endAt: campaign.endAt ? new Date(campaign.endAt).toISOString() : null
        },
        timestamp: campaign.updatedAt ? new Date(campaign.updatedAt).toISOString() : new Date().toISOString()
      }));
    } catch (error) {
      log.warn({ err: error }, 'Failed to fetch campaign spotlights for live feed');
      return [];
    }
  }

  static async computeAnalytics({ base, range }) {
    const posts = base.items
      .filter((entry) => entry.kind === 'post' && entry.post)
      .map((entry) => entry.post);

    const comments = posts.reduce((sum, post) => sum + Number(post?.stats?.comments ?? 0), 0);
    const reactions = posts.reduce((sum, post) => sum + Number(post?.stats?.reactions ?? 0), 0);
    const uniqueCommunities = new Set(posts.map((post) => post?.community?.id).filter(Boolean));
    const trendingTags = topTagsFromPosts(posts);
    const latestActivity = posts
      .map((post) => (post.publishedAt ? new Date(post.publishedAt) : post.createdAt ? new Date(post.createdAt) : null))
      .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const placements = base.ads?.placements ?? [];
    const campaignPublicIds = Array.from(new Set(placements.map((placement) => placement.campaignId).filter(Boolean)));

    const adsSummary = {
      placementsServed: placements.length,
      campaignsServed: campaignPublicIds.length,
      activeCampaigns: 0,
      scheduledCampaigns: 0,
      totals: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spendCents: 0,
        revenueCents: 0
      }
    };

    if (campaignPublicIds.length) {
      try {
        const campaigns = await AdsCampaignModel.findByPublicIds(campaignPublicIds);
        const internalIds = campaigns.map((campaign) => campaign.id);
        const metricsMap = await AdsCampaignMetricModel.summariseByCampaignIds(internalIds, {
          since: range.start,
          until: range.end
        });

        for (const campaign of campaigns) {
          if (campaign.status === 'active') {
            adsSummary.activeCampaigns += 1;
          } else if (campaign.status === 'scheduled') {
            adsSummary.scheduledCampaigns += 1;
          }

          const metrics = metricsMap.get(campaign.id) ?? {};
          adsSummary.totals.impressions += Number(metrics.impressions ?? 0);
          adsSummary.totals.clicks += Number(metrics.clicks ?? 0);
          adsSummary.totals.conversions += Number(metrics.conversions ?? 0);
          adsSummary.totals.spendCents += Number(metrics.spendCents ?? 0);
          adsSummary.totals.revenueCents += Number(metrics.revenueCents ?? 0);
        }
      } catch (error) {
        log.warn({ err: error }, 'Failed to aggregate campaign metrics for feed analytics');
      }
    }

    const momentum = deriveEngagementMomentum({
      posts,
      comments,
      reactions,
      uniqueCommunities
    });

    return {
      generatedAt: new Date().toISOString(),
      range: {
        start: range.start.toISOString(),
        end: range.end.toISOString()
      },
      engagement: {
        postsSampled: posts.length,
        postsTotal: Number(base.pagination?.total ?? posts.length),
        comments,
        reactions,
        uniqueCommunities: uniqueCommunities.size,
        trendingTags,
        latestActivityAt: latestActivity ? latestActivity.toISOString() : null,
        momentumScore: momentum
      },
      ads: adsSummary
    };
  }

  static async getMomentumScore(args = {}) {
    const analytics = await this.computeAnalytics(args);
    return {
      momentumScore: analytics.engagement.momentumScore,
      generatedAt: analytics.generatedAt,
      range: analytics.range
    };
  }
}
