import { httpClient } from './httpClient.js';

function normaliseList(response) {
  return {
    data: response?.data ?? [],
    meta: response?.meta ?? {},
    pagination: response?.pagination ?? response?.meta?.pagination ?? null
  };
}

export function getRevenueSummary({ token, signal } = {}) {
  return httpClient.get('/admin/revenue/summary', { token, signal }).then((response) => response?.data ?? {});
}

export function listAdjustments({ token, params, signal } = {}) {
  return httpClient.get('/admin/revenue/adjustments', { token, params, signal }).then(normaliseList);
}

export function createAdjustment({ token, payload }) {
  return httpClient.post('/admin/revenue/adjustments', payload, { token }).then((response) => response?.data ?? null);
}

export function updateAdjustment({ token, id, payload }) {
  if (!id) {
    throw new Error('Adjustment id is required');
  }
  return httpClient
    .put(`/admin/revenue/adjustments/${id}`, payload, { token })
    .then((response) => response?.data ?? null);
}

export function deleteAdjustment({ token, id }) {
  if (!id) {
    throw new Error('Adjustment id is required');
  }
  return httpClient.delete(`/admin/revenue/adjustments/${id}`, { token }).then((response) => response?.data ?? null);
}

const adminRevenueApi = {
  getRevenueSummary,
  listAdjustments,
  createAdjustment,
  updateAdjustment,
  deleteAdjustment
};

export default adminRevenueApi;
