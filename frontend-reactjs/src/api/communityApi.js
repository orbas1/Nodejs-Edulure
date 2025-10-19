import { httpClient } from './httpClient.js';

const mapResponse = (response) => ({
  data: response?.data ?? null,
  meta: response?.meta ?? null
});

export async function fetchCommunities(token) {
  const response = await httpClient.get('/communities', {
    token,
    cache: {
      ttl: 1000 * 60 * 5,
      tags: ['communities:list']
    }
  });
  return mapResponse(response);
}

export async function fetchCommunityDetail(communityId, token) {
  const response = await httpClient.get(`/communities/${communityId}`, {
    token,
    cache: {
      ttl: 1000 * 60 * 3,
      tags: [`community:${communityId}:detail`]
    }
  });
  return mapResponse(response);
}

export async function fetchCommunityFeed({
  communityId,
  token,
  page = 1,
  perPage = 10,
  channelId,
  postType,
  visibility,
  query
}) {
  const response = await httpClient.get(`/communities/${communityId}/posts`, {
    token,
    params: {
      page,
      perPage,
      channelId,
      postType,
      visibility,
      query
    },
    cache: {
      ttl: 1000 * 60 * 2,
      tags: [`community:${communityId}:feed`]
    }
  });
  return mapResponse(response);
}

export async function fetchAggregatedFeed({ token, page = 1, perPage = 10, postType, visibility, query }) {
  const response = await httpClient.get('/communities/feed', {
    token,
    params: {
      page,
      perPage,
      postType,
      visibility,
      query
    },
    cache: {
      ttl: 1000 * 60 * 2,
      tags: ['communities:aggregatedFeed']
    }
  });
  return mapResponse(response);
}

export async function fetchCommunityResources({ communityId, token, limit = 6, offset = 0, resourceType }) {
  const response = await httpClient.get(`/communities/${communityId}/resources`, {
    token,
    params: {
      limit,
      offset,
      resourceType
    },
    cache: {
      ttl: 1000 * 60 * 10,
      tags: [`community:${communityId}:resources`]
    }
  });
  return mapResponse(response);
}

export async function createCommunityPost({ communityId, token, payload }) {
  const response = await httpClient.post(`/communities/${communityId}/posts`, payload, {
    token,
    cache: {
      invalidateTags: [
        `community:${communityId}:feed`,
        `community:${communityId}:resources`,
        'communities:aggregatedFeed'
      ]
    }
  });
  return mapResponse(response);
}

export async function joinCommunity({ communityId, token }) {
  const response = await httpClient.post(`/communities/${communityId}/join`, {}, {
    token,
    cache: {
      invalidateTags: [
        'communities:list',
        `community:${communityId}:detail`,
        `community:${communityId}:feed`,
        'communities:aggregatedFeed'
      ]
    }
  });
  return mapResponse(response);
}

export async function leaveCommunity({ communityId, token, reason }) {
  const response = await httpClient.post(`/communities/${communityId}/leave`, { reason }, {
    token,
    cache: {
      invalidateTags: [
        'communities:list',
        `community:${communityId}:detail`,
        `community:${communityId}:feed`,
        'communities:aggregatedFeed'
      ]
    }
  });
  return mapResponse(response);
}

export async function publishCommunityRunbook({ communityId, token, payload }) {
  const response = await httpClient.post(`/communities/${communityId}/operations/runbooks`, payload, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:detail`, `community:${communityId}:resources`]
    }
  });
  return mapResponse(response);
}

export async function acknowledgeCommunityEscalation({ communityId, escalationId, token, payload }) {
  const response = await httpClient.post(
    `/communities/${communityId}/operations/escalations/${escalationId}/acknowledge`,
    payload ?? {},
    {
      token
    }
  );
  return mapResponse(response);
}

export async function scheduleCommunityEvent({ communityId, token, payload }) {
  const response = await httpClient.post(`/communities/${communityId}/operations/events`, payload, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:events`, `community:${communityId}:feed`]
    }
  });
  return mapResponse(response);
}

export async function fetchCommunitySponsorships({ communityId, token }) {
  const response = await httpClient.get(`/communities/${communityId}/sponsorships`, {
    token,
    cache: {
      ttl: 1000 * 60 * 5,
      tags: [`community:${communityId}:sponsorships`]
    }
  });
  return mapResponse(response);
}

export async function updateCommunitySponsorships({ communityId, token, blockedPlacementIds = [] }) {
  const response = await httpClient.put(
    `/communities/${communityId}/sponsorships`,
    { blockedPlacementIds },
    {
      token,
      cache: {
        invalidateTags: [
          `community:${communityId}:sponsorships`,
          `community:${communityId}:feed`,
          'communities:aggregatedFeed'
        ]
      }
    }
  );
  return mapResponse(response);
}

export async function updateCommunityTier({ communityId, tierId, token, payload }) {
  const response = await httpClient.patch(
    `/communities/${communityId}/operations/paywall/tiers/${tierId}`,
    payload,
    {
      token,
      cache: {
        invalidateTags: [`community:${communityId}:paywall`, `community:${communityId}:detail`]
      }
    }
  );
  return mapResponse(response);
}

export async function resolveCommunityIncident({ communityId, incidentId, token, payload }) {
  const response = await httpClient.post(
    `/communities/${communityId}/operations/safety/${incidentId}/resolve`,
    payload ?? {},
    {
      token
    }
  );
  return mapResponse(response);
}

export async function moderateCommunityPost({ communityId, postId, token, action, reason }) {
  const response = await httpClient.post(
    `/communities/${communityId}/posts/${postId}/moderate`,
    { action, reason },
    {
      token,
      cache: {
        invalidateTags: [
          `community:${communityId}:feed`,
          'communities:aggregatedFeed'
        ]
      }
    }
  );
  return mapResponse(response);
}

export async function removeCommunityPost({ communityId, postId, token, reason }) {
  const response = await httpClient.delete(`/communities/${communityId}/posts/${postId}`, {
    token,
    body: { reason },
    cache: {
      invalidateTags: [
        `community:${communityId}:feed`,
        'communities:aggregatedFeed'
      ]
    }
  });
  return mapResponse(response);
}
