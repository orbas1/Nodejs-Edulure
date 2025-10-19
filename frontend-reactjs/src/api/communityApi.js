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

export async function createCommunityResource({ communityId, token, payload }) {
  const response = await httpClient.post(`/communities/${communityId}/resources`, payload, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:resources`, `community:${communityId}:detail`]
    }
  });
  return mapResponse(response);
}

export async function updateCommunityResource({ communityId, resourceId, token, payload }) {
  const response = await httpClient.put(`/communities/${communityId}/resources/${resourceId}`, payload, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:resources`, `community:${communityId}:detail`]
    }
  });
  return mapResponse(response);
}

export async function deleteCommunityResource({ communityId, resourceId, token }) {
  const response = await httpClient.delete(`/communities/${communityId}/resources/${resourceId}`, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:resources`, `community:${communityId}:detail`]
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

export async function listCommunityRoles({ communityId, token, signal }) {
  const response = await httpClient.get(`/communities/${communityId}/roles`, {
    token,
    signal,
    cache: {
      ttl: 1000 * 30,
      tags: [`community:${communityId}:roles`]
    }
  });
  return mapResponse(response);
}

export async function createCommunityRole({ communityId, token, payload }) {
  const response = await httpClient.post(`/communities/${communityId}/roles`, payload, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:roles`]
    }
  });
  return mapResponse(response);
}

export async function assignCommunityRole({ communityId, userId, token, payload }) {
  const response = await httpClient.patch(`/communities/${communityId}/members/${userId}/role`, payload, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:roles`]
    }
  });
  return mapResponse(response);
}

export async function listCommunityEvents({ communityId, token, params = {}, signal }) {
  const response = await httpClient.get(`/communities/${communityId}/events`, {
    token,
    signal,
    params: {
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
      status: params.status ?? 'scheduled',
      order: params.order ?? 'asc'
    },
    cache: {
      ttl: 1000 * 30,
      tags: [`community:${communityId}:events`]
    }
  });
  return mapResponse(response);
}

export async function createCommunityEvent({ communityId, token, payload }) {
  const response = await httpClient.post(`/communities/${communityId}/events`, payload, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:events`]
    }
  });
  return mapResponse(response);
}

export async function createCommunityResource({ communityId, token, payload }) {
  const response = await httpClient.post(`/communities/${communityId}/resources`, payload, {
    token,
    cache: {
      invalidateTags: [`community:${communityId}:resources`]
    }
  });
  return mapResponse(response);
}
