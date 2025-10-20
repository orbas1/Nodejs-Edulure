import { httpClient } from './httpClient.js';

function normaliseList(response) {
  return {
    data: response?.data ?? [],
    meta: response?.meta ?? {},
    pagination: response?.pagination ?? response?.meta?.pagination ?? null
  };
}

export function listCampaigns({ token, params, signal } = {}) {
  return httpClient.get('/admin/ads/campaigns', { token, params, signal }).then(normaliseList);
}

export function createCampaign({ token, payload }) {
  return httpClient.post('/admin/ads/campaigns', payload, { token }).then((response) => response?.data ?? null);
}

export function updateCampaign({ token, id, payload }) {
  if (!id) {
    throw new Error('Campaign id is required');
  }
  return httpClient
    .put(`/admin/ads/campaigns/${id}`, payload, { token })
    .then((response) => response?.data ?? null);
}

export function deleteCampaign({ token, id }) {
  if (!id) {
    throw new Error('Campaign id is required');
  }
  return httpClient.delete(`/admin/ads/campaigns/${id}`, { token }).then((response) => response?.data ?? null);
}

export function getAdsSummary({ token, signal } = {}) {
  return httpClient.get('/admin/ads/summary', { token, signal }).then((response) => response?.data ?? {});
}

const adminAdsApi = {
  listCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getAdsSummary
};

export default adminAdsApi;
