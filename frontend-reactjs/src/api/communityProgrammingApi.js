import { httpClient } from './httpClient.js';
import {
  assertId,
  assertToken,
  createInvalidationConfig,
  createListCacheConfig,
  normaliseListResponse
} from './apiUtils.js';

const mapListResponse = (response) => {
  const base = normaliseListResponse(response);
  const pagination = base.pagination ?? {};
  const { data } = base;
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
  assertToken(token, 'list community webinars');
  assertId(communityId, 'Community id');
  return httpClient
    .get(`/communities/${communityId}/webinars`, {
      token,
      params,
      signal,
      cache: createListCacheConfig(`community:${communityId}:webinars`, { ttl: 30_000 })
    })
    .then(mapListResponse);
}

export function createCommunityWebinar({ communityId, token, payload }) {
  assertToken(token, 'create community webinars');
  assertId(communityId, 'Community id');
  return httpClient
    .post(`/communities/${communityId}/webinars`, payload, {
      token,
      cache: createInvalidationConfig(`community:${communityId}:webinars`)
    })
    .then((response) => response?.data ?? response ?? null);
}

export function updateCommunityWebinar({ communityId, webinarId, token, payload }) {
  assertToken(token, 'update community webinars');
  assertId(communityId, 'Community id');
  assertId(webinarId, 'Webinar id');
  return httpClient
    .put(`/communities/${communityId}/webinars/${webinarId}`, payload, {
      token,
      cache: createInvalidationConfig([
        `community:${communityId}:webinars`,
        `community:${communityId}:webinars:${webinarId}`
      ])
    })
    .then((response) => response?.data ?? response ?? null);
}

export function deleteCommunityWebinar({ communityId, webinarId, token }) {
  assertToken(token, 'delete community webinars');
  assertId(communityId, 'Community id');
  assertId(webinarId, 'Webinar id');
  return httpClient
    .delete(`/communities/${communityId}/webinars/${webinarId}`, {
      token,
      cache: createInvalidationConfig([
        `community:${communityId}:webinars`,
        `community:${communityId}:webinars:${webinarId}`
      ])
    })
    .then((response) => response?.data ?? response ?? null);
}

export function listCommunityPodcastEpisodes({ communityId, token, params = {}, signal } = {}) {
  assertToken(token, 'list community podcast episodes');
  assertId(communityId, 'Community id');
  return httpClient
    .get(`/communities/${communityId}/podcasts`, {
      token,
      params,
      signal,
      cache: createListCacheConfig(`community:${communityId}:podcasts`, { ttl: 30_000 })
    })
    .then(mapListResponse);
}

export function createCommunityPodcastEpisode({ communityId, token, payload }) {
  assertToken(token, 'create community podcast episodes');
  assertId(communityId, 'Community id');
  return httpClient
    .post(`/communities/${communityId}/podcasts`, payload, {
      token,
      cache: createInvalidationConfig(`community:${communityId}:podcasts`)
    })
    .then((response) => response?.data ?? response ?? null);
}

export function updateCommunityPodcastEpisode({ communityId, episodeId, token, payload }) {
  assertToken(token, 'update community podcast episodes');
  assertId(communityId, 'Community id');
  assertId(episodeId, 'Episode id');
  return httpClient
    .put(`/communities/${communityId}/podcasts/${episodeId}`, payload, {
      token,
      cache: createInvalidationConfig([
        `community:${communityId}:podcasts`,
        `community:${communityId}:podcasts:${episodeId}`
      ])
    })
    .then((response) => response?.data ?? response ?? null);
}

export function deleteCommunityPodcastEpisode({ communityId, episodeId, token }) {
  assertToken(token, 'delete community podcast episodes');
  assertId(communityId, 'Community id');
  assertId(episodeId, 'Episode id');
  return httpClient
    .delete(`/communities/${communityId}/podcasts/${episodeId}`, {
      token,
      cache: createInvalidationConfig([
        `community:${communityId}:podcasts`,
        `community:${communityId}:podcasts:${episodeId}`
      ])
    })
    .then((response) => response?.data ?? response ?? null);
}

export function listCommunityGrowthExperiments({ communityId, token, params = {}, signal } = {}) {
  assertToken(token, 'list community growth experiments');
  assertId(communityId, 'Community id');
  return httpClient
    .get(`/communities/${communityId}/growth/experiments`, {
      token,
      params,
      signal,
      cache: createListCacheConfig(`community:${communityId}:growth:experiments`, { ttl: 30_000 })
    })
    .then(mapListResponse);
}

export function createCommunityGrowthExperiment({ communityId, token, payload }) {
  assertToken(token, 'create community growth experiments');
  assertId(communityId, 'Community id');
  return httpClient
    .post(`/communities/${communityId}/growth/experiments`, payload, {
      token,
      cache: createInvalidationConfig(`community:${communityId}:growth:experiments`)
    })
    .then((response) => response?.data ?? response ?? null);
}

export function updateCommunityGrowthExperiment({ communityId, experimentId, token, payload }) {
  assertToken(token, 'update community growth experiments');
  assertId(communityId, 'Community id');
  assertId(experimentId, 'Experiment id');
  return httpClient
    .put(`/communities/${communityId}/growth/experiments/${experimentId}`, payload, {
      token,
      cache: createInvalidationConfig([
        `community:${communityId}:growth:experiments`,
        `community:${communityId}:growth:experiments:${experimentId}`
      ])
    })
    .then((response) => response?.data ?? response ?? null);
}

export function deleteCommunityGrowthExperiment({ communityId, experimentId, token }) {
  assertToken(token, 'delete community growth experiments');
  assertId(communityId, 'Community id');
  assertId(experimentId, 'Experiment id');
  return httpClient
    .delete(`/communities/${communityId}/growth/experiments/${experimentId}`, {
      token,
      cache: createInvalidationConfig([
        `community:${communityId}:growth:experiments`,
        `community:${communityId}:growth:experiments:${experimentId}`
      ])
    })
    .then((response) => response?.data ?? response ?? null);
}
