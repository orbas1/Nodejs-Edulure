import { httpClient } from './httpClient.js';

export function listAdsCampaigns({ token, params = {}, signal } = {}) {
  return httpClient.get('/ads/campaigns', { token, params, signal }).then((response) => ({
    data: Array.isArray(response?.data) ? response.data : [],
    pagination: response?.meta?.pagination ?? { count: 0, page: 1 }
  }));
}

export function createAdsCampaign({ token, payload }) {
  return httpClient.post('/ads/campaigns', payload, { token }).then((response) => response?.data ?? null);
}

export function updateAdsCampaign({ token, campaignId, payload }) {
  return httpClient.put(`/ads/campaigns/${campaignId}`, payload, { token }).then((response) => response?.data ?? null);
}

export function pauseAdsCampaign({ token, campaignId }) {
  return httpClient.post(`/ads/campaigns/${campaignId}/pause`, null, { token }).then((response) => response?.data ?? null);
}

export function resumeAdsCampaign({ token, campaignId }) {
  return httpClient.post(`/ads/campaigns/${campaignId}/resume`, null, { token }).then((response) => response?.data ?? null);
}

export function recordAdsCampaignMetrics({ token, campaignId, payload }) {
  return httpClient
    .post(`/ads/campaigns/${campaignId}/metrics`, payload, { token })
    .then((response) => response?.data ?? null);
}
