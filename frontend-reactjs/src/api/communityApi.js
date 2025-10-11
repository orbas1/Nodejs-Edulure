import { httpClient } from './httpClient.js';

const mapResponse = (response) => ({
  data: response?.data ?? null,
  meta: response?.meta ?? null
});

export async function fetchCommunities(token) {
  const response = await httpClient.get('/communities', { token });
  return mapResponse(response);
}

export async function fetchCommunityDetail(communityId, token) {
  const response = await httpClient.get(`/communities/${communityId}`, { token });
  return mapResponse(response);
}

export async function fetchCommunityFeed({ communityId, token, page = 1, perPage = 10, channelId, postType, visibility }) {
  const response = await httpClient.get(`/communities/${communityId}/posts`, {
    token,
    params: {
      page,
      perPage,
      channelId,
      postType,
      visibility
    }
  });
  return mapResponse(response);
}

export async function fetchAggregatedFeed({ token, page = 1, perPage = 10, postType, visibility }) {
  const response = await httpClient.get('/communities/feed', {
    token,
    params: {
      page,
      perPage,
      postType,
      visibility
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
    }
  });
  return mapResponse(response);
}
