import { httpClient } from './httpClient.js';

function normaliseList(response) {
  return {
    data: response?.data ?? [],
    meta: response?.meta ?? {},
    pagination: response?.pagination ?? response?.meta?.pagination ?? null
  };
}

export function listExperiments({ token, params, signal } = {}) {
  return httpClient.get('/admin/growth/experiments', { token, params, signal }).then(normaliseList);
}

export function createExperiment({ token, payload }) {
  return httpClient.post('/admin/growth/experiments', payload, { token }).then((response) => response?.data ?? null);
}

export function updateExperiment({ token, id, payload }) {
  if (!id) {
    throw new Error('Experiment id is required');
  }
  return httpClient
    .put(`/admin/growth/experiments/${id}`, payload, { token })
    .then((response) => response?.data ?? null);
}

export function deleteExperiment({ token, id }) {
  if (!id) {
    throw new Error('Experiment id is required');
  }
  return httpClient.delete(`/admin/growth/experiments/${id}`, { token }).then((response) => response?.data ?? null);
}

export function getGrowthMetrics({ token, signal } = {}) {
  return httpClient.get('/admin/growth/metrics', { token, signal }).then((response) => response?.data ?? {});
}

const adminGrowthApi = {
  listExperiments,
  createExperiment,
  updateExperiment,
  deleteExperiment,
  getGrowthMetrics
};

export default adminGrowthApi;
