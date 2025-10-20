import { httpClient } from './httpClient.js';

const mapListResponse = (response) => {
  const data = Array.isArray(response?.data) ? response.data : [];
  const pagination = response?.meta?.pagination ?? {};
  return {
    data,
    pagination: {
      total: typeof pagination.total === 'number' ? pagination.total : data.length,
      count: typeof pagination.count === 'number' ? pagination.count : data.length,
      limit: typeof pagination.limit === 'number' ? pagination.limit : data.length,
      offset: typeof pagination.offset === 'number' ? pagination.offset : 0
    }
  };
};

export function listCommunityWebinars({ communityId, token, params = {}, signal } = {}) {
  return httpClient
    .get(`/communities/${communityId}/webinars`, { token, params, signal })
    .then(mapListResponse);
}

export function createCommunityWebinar({ communityId, token, payload }) {
  return httpClient
    .post(`/communities/${communityId}/webinars`, payload, { token })
    .then((response) => response?.data ?? null);
}

export function updateCommunityWebinar({ communityId, webinarId, token, payload }) {
  return httpClient
    .put(`/communities/${communityId}/webinars/${webinarId}`, payload, { token })
    .then((response) => response?.data ?? null);
}

export function deleteCommunityWebinar({ communityId, webinarId, token }) {
  return httpClient
    .delete(`/communities/${communityId}/webinars/${webinarId}`, { token })
    .then((response) => response?.data ?? null);
}

export function listCommunityPodcastEpisodes({ communityId, token, params = {}, signal } = {}) {
  return httpClient
    .get(`/communities/${communityId}/podcasts`, { token, params, signal })
    .then(mapListResponse);
}

export function createCommunityPodcastEpisode({ communityId, token, payload }) {
  return httpClient
    .post(`/communities/${communityId}/podcasts`, payload, { token })
    .then((response) => response?.data ?? null);
}

export function updateCommunityPodcastEpisode({ communityId, episodeId, token, payload }) {
  return httpClient
    .put(`/communities/${communityId}/podcasts/${episodeId}`, payload, { token })
    .then((response) => response?.data ?? null);
}

export function deleteCommunityPodcastEpisode({ communityId, episodeId, token }) {
  return httpClient
    .delete(`/communities/${communityId}/podcasts/${episodeId}`, { token })
    .then((response) => response?.data ?? null);
}

export function listCommunityGrowthExperiments({ communityId, token, params = {}, signal } = {}) {
  return httpClient
    .get(`/communities/${communityId}/growth/experiments`, { token, params, signal })
    .then(mapListResponse);
}

export function createCommunityGrowthExperiment({ communityId, token, payload }) {
  return httpClient
    .post(`/communities/${communityId}/growth/experiments`, payload, { token })
    .then((response) => response?.data ?? null);
}

export function updateCommunityGrowthExperiment({ communityId, experimentId, token, payload }) {
  return httpClient
    .put(`/communities/${communityId}/growth/experiments/${experimentId}`, payload, { token })
    .then((response) => response?.data ?? null);
}

export function deleteCommunityGrowthExperiment({ communityId, experimentId, token }) {
  return httpClient
    .delete(`/communities/${communityId}/growth/experiments/${experimentId}`, { token })
    .then((response) => response?.data ?? null);
}
