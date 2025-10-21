import { httpClient } from './httpClient.js';
import {
  assertId,
  assertToken,
  createInvalidationConfig,
  createListCacheConfig,
  normaliseListResponse
} from './apiUtils.js';

const GROWTH_CACHE_TAGS = {
  experiments: 'admin:growth:experiments',
  metrics: 'admin:growth:metrics'
};

function normaliseList(response) {
  return normaliseListResponse(response);
}

function unwrapData(response, fallback = null) {
  return response?.data ?? response ?? fallback;
}

export function listExperiments({ token, params, signal } = {}) {
  assertToken(token, 'list growth experiments');
  return httpClient
    .get('/admin/growth/experiments', {
      token,
      params,
      signal,
      cache: createListCacheConfig(GROWTH_CACHE_TAGS.experiments)
    })
    .then(normaliseList);
}

export function createExperiment({ token, payload }) {
  assertToken(token, 'create a growth experiment');
  return httpClient
    .post('/admin/growth/experiments', payload, {
      token,
      cache: createInvalidationConfig(GROWTH_CACHE_TAGS.experiments)
    })
    .then((response) => unwrapData(response));
}

export function updateExperiment({ token, id, payload }) {
  assertToken(token, 'update a growth experiment');
  assertId(id, 'Experiment id');
  return httpClient
    .put(`/admin/growth/experiments/${id}`, payload, {
      token,
      cache: createInvalidationConfig([
        GROWTH_CACHE_TAGS.experiments,
        `${GROWTH_CACHE_TAGS.experiments}:${id}`
      ])
    })
    .then((response) => unwrapData(response));
}

export function deleteExperiment({ token, id }) {
  assertToken(token, 'delete a growth experiment');
  assertId(id, 'Experiment id');
  return httpClient
    .delete(`/admin/growth/experiments/${id}`, {
      token,
      cache: createInvalidationConfig([
        GROWTH_CACHE_TAGS.experiments,
        `${GROWTH_CACHE_TAGS.experiments}:${id}`
      ])
    })
    .then((response) => unwrapData(response));
}

export function getGrowthMetrics({ token, signal } = {}) {
  assertToken(token, 'load growth metrics');
  return httpClient
    .get('/admin/growth/metrics', {
      token,
      signal,
      cache: createListCacheConfig(GROWTH_CACHE_TAGS.metrics, { ttl: 60_000 })
    })
    .then((response) => unwrapData(response, {}));
}

const adminGrowthApi = {
  listExperiments,
  createExperiment,
  updateExperiment,
  deleteExperiment,
  getGrowthMetrics
};

export default adminGrowthApi;
