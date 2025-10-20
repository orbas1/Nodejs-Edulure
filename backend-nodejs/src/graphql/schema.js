import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  Kind
} from 'graphql';

import LiveFeedService from '../services/LiveFeedService.js';

const FeedContextEnum = new GraphQLEnumType({
  name: 'FeedContext',
  values: {
    GLOBAL: { value: 'global' },
    COMMUNITY: { value: 'community' }
  }
});

const PlacementContextEnum = new GraphQLEnumType({
  name: 'FeedPlacementContext',
  values: {
    GLOBAL_FEED: { value: 'global_feed' },
    COMMUNITY_FEED: { value: 'community_feed' },
    SEARCH: { value: 'search' },
    COURSE_LIVE: { value: 'course_live' }
  }
});

const FeedItemKindEnum = new GraphQLEnumType({
  name: 'FeedItemKind',
  values: {
    POST: { value: 'post' },
    AD: { value: 'ad' }
  }
});

const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'RFC 3339 compliant DateTime string',
  serialize(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new TypeError('DateTime cannot represent an invalid Date instance');
    }
    return date.toISOString();
  },
  parseValue(value) {
    if (value === null || value === undefined) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new TypeError('DateTime cannot represent an invalid Date instance');
    }
    return date.toISOString();
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.STRING) {
      return null;
    }
    const date = new Date(ast.value);
    if (Number.isNaN(date.getTime())) {
      throw new TypeError('DateTime cannot represent an invalid Date instance');
    }
    return date.toISOString();
  }
});

function parseLiteralValue(ast) {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value);
    case Kind.NULL:
      return null;
    case Kind.LIST:
      return ast.values.map(parseLiteralValue);
    case Kind.OBJECT: {
      const value = Object.create(null);
      for (const field of ast.fields) {
        value[field.name.value] = parseLiteralValue(field.value);
      }
      return value;
    }
    default:
      return null;
  }
}

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize(value) {
    return value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast) {
    return parseLiteralValue(ast);
  }
});

const FeedPostStatsType = new GraphQLObjectType({
  name: 'FeedPostStats',
  fields: {
    comments: { type: GraphQLInt },
    reactions: { type: GraphQLInt },
    reactionBreakdown: { type: JSONScalar }
  }
});

const FeedCommunityType = new GraphQLObjectType({
  name: 'FeedCommunity',
  fields: {
    id: { type: GraphQLInt },
    name: { type: GraphQLString },
    slug: { type: GraphQLString }
  }
});

const FeedAuthorType = new GraphQLObjectType({
  name: 'FeedAuthor',
  fields: {
    id: { type: GraphQLInt },
    name: { type: GraphQLString },
    role: { type: GraphQLString },
    avatarUrl: { type: GraphQLString }
  }
});

const FeedPostType = new GraphQLObjectType({
  name: 'FeedPost',
  fields: {
    id: { type: GraphQLInt },
    type: { type: GraphQLString },
    title: { type: GraphQLString },
    body: { type: GraphQLString },
    publishedAt: { type: DateTimeScalar },
    scheduledAt: { type: DateTimeScalar },
    visibility: { type: GraphQLString },
    status: { type: GraphQLString },
    tags: { type: new GraphQLList(GraphQLString) },
    channel: { type: JSONScalar },
    community: { type: FeedCommunityType },
    author: { type: FeedAuthorType },
    stats: { type: FeedPostStatsType },
    metadata: { type: JSONScalar }
  }
});

const FeedAdMetricsType = new GraphQLObjectType({
  name: 'FeedAdMetrics',
  fields: {
    ctr: { type: GraphQLFloat },
    cpcCents: { type: GraphQLFloat },
    cpaCents: { type: GraphQLFloat }
  }
});

const FeedAdTrackingType = new GraphQLObjectType({
  name: 'FeedAdTracking',
  fields: {
    impressionKey: { type: GraphQLString },
    requestId: { type: GraphQLString }
  }
});

const FeedAdType = new GraphQLObjectType({
  name: 'FeedAd',
  fields: {
    placementId: { type: GraphQLString },
    campaignId: { type: GraphQLString },
    context: { type: GraphQLString },
    slot: { type: GraphQLString },
    position: { type: GraphQLInt },
    headline: { type: GraphQLString },
    description: { type: GraphQLString },
    ctaUrl: { type: GraphQLString },
    advertiser: { type: GraphQLString },
    objective: { type: GraphQLString },
    tags: { type: new GraphQLList(GraphQLString) },
    disclosure: { type: GraphQLString },
    metrics: { type: FeedAdMetricsType },
    tracking: { type: FeedAdTrackingType },
    targeting: { type: JSONScalar }
  }
});

const FeedItemType = new GraphQLObjectType({
  name: 'FeedItem',
  fields: {
    kind: { type: new GraphQLNonNull(FeedItemKindEnum) },
    context: { type: GraphQLString },
    timestamp: { type: DateTimeScalar },
    post: { type: FeedPostType },
    ad: { type: FeedAdType }
  }
});

const FeedHighlightMetricsType = new GraphQLObjectType({
  name: 'FeedHighlightMetrics',
  fields: {
    performanceScore: { type: GraphQLFloat },
    ctr: { type: GraphQLFloat },
    cpcCents: { type: GraphQLFloat },
    cpaCents: { type: GraphQLFloat },
    spendCents: { type: GraphQLFloat }
  }
});

const FeedHighlightType = new GraphQLObjectType({
  name: 'FeedHighlight',
  fields: {
    type: { type: GraphQLString },
    id: { type: GraphQLString },
    title: { type: GraphQLString },
    name: { type: GraphQLString },
    summary: { type: GraphQLString },
    status: { type: GraphQLString },
    projectType: { type: GraphQLString },
    objective: { type: GraphQLString },
    ownerId: { type: GraphQLInt },
    metrics: { type: FeedHighlightMetricsType },
    targeting: { type: JSONScalar },
    schedule: { type: JSONScalar },
    metadata: { type: JSONScalar },
    analyticsTargets: { type: JSONScalar },
    timestamp: { type: DateTimeScalar },
    position: { type: GraphQLInt },
    context: { type: GraphQLString }
  }
});

const PaginationType = new GraphQLObjectType({
  name: 'FeedPagination',
  fields: {
    page: { type: GraphQLInt },
    perPage: { type: GraphQLInt },
    total: { type: GraphQLInt },
    pageCount: { type: GraphQLInt }
  }
});

const FeedAdsTotalsType = new GraphQLObjectType({
  name: 'FeedAdsTotals',
  fields: {
    impressions: { type: GraphQLFloat },
    clicks: { type: GraphQLFloat },
    conversions: { type: GraphQLFloat },
    spendCents: { type: GraphQLFloat },
    revenueCents: { type: GraphQLFloat }
  }
});

const FeedAdsSummaryType = new GraphQLObjectType({
  name: 'FeedAdsSummary',
  fields: {
    placementsServed: { type: GraphQLInt },
    campaignsServed: { type: GraphQLInt },
    activeCampaigns: { type: GraphQLInt },
    scheduledCampaigns: { type: GraphQLInt },
    totals: { type: FeedAdsTotalsType }
  }
});

const FeedTrendingTagType = new GraphQLObjectType({
  name: 'FeedTrendingTag',
  fields: {
    tag: { type: GraphQLString },
    count: { type: GraphQLInt }
  }
});

const FeedEngagementType = new GraphQLObjectType({
  name: 'FeedEngagement',
  fields: {
    postsSampled: { type: GraphQLInt },
    postsTotal: { type: GraphQLInt },
    comments: { type: GraphQLInt },
    reactions: { type: GraphQLInt },
    uniqueCommunities: { type: GraphQLInt },
    trendingTags: { type: new GraphQLList(FeedTrendingTagType) },
    latestActivityAt: { type: DateTimeScalar }
  }
});

const FeedAnalyticsRangeType = new GraphQLObjectType({
  name: 'FeedAnalyticsRange',
  fields: {
    start: { type: DateTimeScalar },
    end: { type: DateTimeScalar }
  }
});

const FeedAnalyticsType = new GraphQLObjectType({
  name: 'FeedAnalytics',
  fields: {
    generatedAt: { type: DateTimeScalar },
    range: { type: FeedAnalyticsRangeType },
    engagement: { type: FeedEngagementType },
    ads: { type: FeedAdsSummaryType }
  }
});

const FeedRangeType = new GraphQLObjectType({
  name: 'FeedRange',
  fields: {
    key: { type: GraphQLString },
    start: { type: DateTimeScalar },
    end: { type: DateTimeScalar }
  }
});

const FeedResponseType = new GraphQLObjectType({
  name: 'FeedResponse',
  fields: {
    context: { type: GraphQLString },
    community: { type: GraphQLString },
    range: { type: FeedRangeType },
    generatedAt: { type: DateTimeScalar },
    pagination: { type: PaginationType },
    ads: { type: FeedAdsSummaryType },
    items: { type: new GraphQLList(FeedItemType) },
    highlights: { type: new GraphQLList(FeedHighlightType) },
    analytics: { type: FeedAnalyticsType }
  }
});

const FeedQueryInputType = new GraphQLInputObjectType({
  name: 'FeedQueryInput',
  fields: {
    context: { type: FeedContextEnum, defaultValue: 'global' },
    community: { type: GraphQLString },
    page: { type: GraphQLInt, defaultValue: 1 },
    perPage: { type: GraphQLInt, defaultValue: 20 },
    includeAnalytics: { type: GraphQLBoolean, defaultValue: true },
    includeHighlights: { type: GraphQLBoolean, defaultValue: true },
    range: { type: GraphQLString, defaultValue: '30d' },
    search: { type: GraphQLString },
    postType: { type: GraphQLString }
  }
});

const FeedPlacementInputType = new GraphQLInputObjectType({
  name: 'FeedPlacementInput',
  fields: {
    context: { type: PlacementContextEnum, defaultValue: 'global_feed' },
    limit: { type: GraphQLInt, defaultValue: 3 },
    keywords: { type: new GraphQLList(GraphQLString) }
  }
});

const FeedAnalyticsInputType = new GraphQLInputObjectType({
  name: 'FeedAnalyticsInput',
  fields: {
    context: { type: FeedContextEnum, defaultValue: 'global' },
    community: { type: GraphQLString },
    range: { type: GraphQLString, defaultValue: '30d' },
    search: { type: GraphQLString },
    postType: { type: GraphQLString }
  }
});

function ensureActor(context) {
  const actor = context?.actor;
  if (!actor) {
    throw new Error('Unauthorised GraphQL request');
  }
  return actor;
}

function buildFilterPayload(input = {}) {
  return {
    search: input.search,
    postType: input.postType
  };
}

function buildPlacementMetadata(input = {}) {
  if (!input.keywords || !input.keywords.length) {
    return {};
  }
  return {
    keywords: input.keywords.filter((keyword) => typeof keyword === 'string' && keyword.trim().length)
  };
}

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    feed: {
      type: new GraphQLNonNull(FeedResponseType),
      args: {
        input: { type: FeedQueryInputType }
      },
      resolve: async (_root, args, context) => {
        const actor = ensureActor(context);
        const input = args.input ?? {};
        return LiveFeedService.getFeed({
          actor,
          context: input.context ?? 'global',
          community: input.community,
          page: input.page ?? 1,
          perPage: input.perPage ?? 20,
          includeAnalytics: input.includeAnalytics ?? true,
          includeHighlights: input.includeHighlights ?? true,
          range: input.range ?? '30d',
          filters: buildFilterPayload(input)
        });
      }
    },
    feedPlacements: {
      type: new GraphQLNonNull(new GraphQLList(FeedAdType)),
      args: {
        input: { type: new GraphQLNonNull(FeedPlacementInputType) }
      },
      resolve: async (_root, args) => {
        const input = args.input ?? {};
        return LiveFeedService.getPlacements({
          context: input.context ?? 'global_feed',
          limit: input.limit ?? 3,
          metadata: buildPlacementMetadata(input)
        });
      }
    },
    feedAnalytics: {
      type: new GraphQLNonNull(FeedAnalyticsType),
      args: {
        input: { type: FeedAnalyticsInputType }
      },
      resolve: async (_root, args, context) => {
        const actor = ensureActor(context);
        const input = args.input ?? {};
        return LiveFeedService.getAnalytics({
          actor,
          context: input.context ?? 'global',
          community: input.community,
          range: input.range ?? '30d',
          filters: buildFilterPayload(input)
        });
      }
    }
  }
});

export const feedSchema = new GraphQLSchema({
  query: QueryType
});

export default feedSchema;
