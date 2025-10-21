import { httpClient } from './httpClient.js';
import {
  assertId,
  assertToken,
  createInvalidationConfig,
  createListCacheConfig,
  normaliseListResponse
} from './apiUtils.js';

const ADS_CACHE_TAGS = {
  campaigns: 'ads:campaigns'
};

export function listAdsCampaigns({ token, params = {}, signal } = {}) {
  assertToken(token, 'list advertising campaigns');
  return httpClient
    .get('/ads/campaigns', {
      token,
      params,
      signal,
      cache: createListCacheConfig(ADS_CACHE_TAGS.campaigns)
    })
    .then((response) => normaliseListResponse(response, { defaultMeta: { pagination: { page: 1, count: 0 } } }));
}

export function createAdsCampaign({ token, payload }) {
  assertToken(token, 'create an advertising campaign');
  return httpClient
    .post('/ads/campaigns', payload, {
      token,
      cache: createInvalidationConfig(ADS_CACHE_TAGS.campaigns)
    })
    .then((response) => response?.data ?? response ?? null);
}

export function updateAdsCampaign({ token, campaignId, payload }) {
  assertToken(token, 'update an advertising campaign');
  assertId(campaignId, 'Campaign id');
  return httpClient
    .put(`/ads/campaigns/${campaignId}`, payload, {
      token,
      cache: createInvalidationConfig([
        ADS_CACHE_TAGS.campaigns,
        `${ADS_CACHE_TAGS.campaigns}:${campaignId}`
      ])
    })
    .then((response) => response?.data ?? response ?? null);
}

export function pauseAdsCampaign({ token, campaignId }) {
  assertToken(token, 'pause an advertising campaign');
  assertId(campaignId, 'Campaign id');
  return httpClient
    .post(`/ads/campaigns/${campaignId}/pause`, null, {
      token,
      cache: createInvalidationConfig([
        ADS_CACHE_TAGS.campaigns,
        `${ADS_CACHE_TAGS.campaigns}:${campaignId}`
      ])
    })
    .then((response) => response?.data ?? response ?? null);
}

export function resumeAdsCampaign({ token, campaignId }) {
  assertToken(token, 'resume an advertising campaign');
  assertId(campaignId, 'Campaign id');
  return httpClient
    .post(`/ads/campaigns/${campaignId}/resume`, null, {
      token,
      cache: createInvalidationConfig([
        ADS_CACHE_TAGS.campaigns,
        `${ADS_CACHE_TAGS.campaigns}:${campaignId}`
      ])
    })
    .then((response) => response?.data ?? response ?? null);
}

export function recordAdsCampaignMetrics({ token, campaignId, payload }) {
  assertToken(token, 'record campaign metrics');
  assertId(campaignId, 'Campaign id');
  return httpClient
    .post(`/ads/campaigns/${campaignId}/metrics`, payload, {
      token,
      cache: createInvalidationConfig([
        ADS_CACHE_TAGS.campaigns,
        `${ADS_CACHE_TAGS.campaigns}:${campaignId}`
      ])
    })
    .then((response) => response?.data ?? response ?? null);
}
