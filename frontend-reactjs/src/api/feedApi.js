import { httpClient } from './httpClient.js';

const normaliseResponse = (response) => ({
  data: response?.data ?? null,
  meta: response?.meta ?? null
});

function buildFeedCacheTags({ context, community, range, search }) {
  const baseTag = community ? `feed:${context}:${community}` : `feed:${context}`;
  const rangeTag = range ? `${baseTag}:range:${range}` : baseTag;
  const searchTag = search ? `${rangeTag}:search` : rangeTag;
  return [searchTag];
}

export async function fetchLiveFeed({
  token,
  context = 'global',
  community,
  page = 1,
  perPage = 10,
  range = '30d',
  search,
  postType,
  includeAnalytics = true,
  includeHighlights = true
} = {}) {
  if (!token) {
    throw new Error('Authentication token is required to load the live feed');
  }

  const params = {
    context,
    page,
    perPage,
    range,
    includeAnalytics,
    includeHighlights,
    search: search ?? undefined,
    postType: postType ?? undefined
  };

  if (context === 'community') {
    params.community = community;
  }

  const response = await httpClient.get('/feed', {
    token,
    params,
    cache: {
      ttl: 30_000,
      tags: buildFeedCacheTags({ context, community, range, search }),
      varyByToken: true
    }
  });
  return normaliseResponse(response);
}

export async function fetchFeedAnalytics({
  token,
  context = 'global',
  community,
  range = '30d',
  search,
  postType
} = {}) {
  if (!token) {
    throw new Error('Authentication token is required to load feed analytics');
  }

  const response = await httpClient.get('/feed/analytics', {
    token,
    params: {
      context,
      community,
      range,
      search: search ?? undefined,
      postType: postType ?? undefined
    },
    cache: {
      ttl: 30_000,
      tags: buildFeedCacheTags({ context, community, range, search }),
      varyByToken: true
    }
  });

  return normaliseResponse(response);
}

export async function fetchFeedPlacements({ token, context = 'global_feed', limit = 3, keywords } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to load feed placements');
  }

  const response = await httpClient.get('/feed/placements', {
    token,
    params: {
      context,
      limit,
      keywords: Array.isArray(keywords) ? keywords.join(',') : keywords
    },
    cache: {
      ttl: 60_000,
      tags: [`feed:placements:${context}`],
      varyByToken: true
    }
  });

  return normaliseResponse(response);
}

export const feedApi = {
  fetchLiveFeed,
  fetchFeedAnalytics,
  fetchFeedPlacements
};

export default feedApi;
