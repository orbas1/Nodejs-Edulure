import { httpClient } from './httpClient.js';
import {
  assertId,
  assertToken,
  createInvalidationConfig,
  createListCacheConfig,
  normaliseListResponse
} from './apiUtils.js';

const REVENUE_CACHE_TAGS = {
  summary: 'admin:revenue:summary',
  adjustments: 'admin:revenue:adjustments'
};

function normaliseList(response) {
  return normaliseListResponse(response);
}

function unwrapData(response, fallback = null) {
  return response?.data ?? response ?? fallback;
}

export function getRevenueSummary({ token, signal } = {}) {
  assertToken(token, 'load revenue summary');
  return httpClient
    .get('/admin/revenue/summary', {
      token,
      signal,
      cache: createListCacheConfig(REVENUE_CACHE_TAGS.summary, { ttl: 60_000 })
    })
    .then((response) => unwrapData(response, {}));
}

export function listAdjustments({ token, params, signal } = {}) {
  assertToken(token, 'list revenue adjustments');
  return httpClient
    .get('/admin/revenue/adjustments', {
      token,
      params,
      signal,
      cache: createListCacheConfig(REVENUE_CACHE_TAGS.adjustments)
    })
    .then(normaliseList);
}

export function createAdjustment({ token, payload }) {
  assertToken(token, 'create a revenue adjustment');
  return httpClient
    .post('/admin/revenue/adjustments', payload, {
      token,
      cache: createInvalidationConfig([
        REVENUE_CACHE_TAGS.adjustments,
        REVENUE_CACHE_TAGS.summary
      ])
    })
    .then((response) => unwrapData(response));
}

export function updateAdjustment({ token, id, payload }) {
  assertToken(token, 'update a revenue adjustment');
  assertId(id, 'Adjustment id');
  return httpClient
    .put(`/admin/revenue/adjustments/${id}`, payload, {
      token,
      cache: createInvalidationConfig([
        REVENUE_CACHE_TAGS.adjustments,
        REVENUE_CACHE_TAGS.summary,
        `${REVENUE_CACHE_TAGS.adjustments}:${id}`
      ])
    })
    .then((response) => unwrapData(response));
}

export function deleteAdjustment({ token, id }) {
  assertToken(token, 'delete a revenue adjustment');
  assertId(id, 'Adjustment id');
  return httpClient
    .delete(`/admin/revenue/adjustments/${id}`, {
      token,
      cache: createInvalidationConfig([
        REVENUE_CACHE_TAGS.adjustments,
        REVENUE_CACHE_TAGS.summary,
        `${REVENUE_CACHE_TAGS.adjustments}:${id}`
      ])
    })
    .then((response) => unwrapData(response));
}

const adminRevenueApi = {
  getRevenueSummary,
  listAdjustments,
  createAdjustment,
  updateAdjustment,
  deleteAdjustment
};

export default adminRevenueApi;
