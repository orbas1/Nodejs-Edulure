import { httpClient } from './httpClient.js';

export async function searchExplorer(payload, { token, signal } = {}) {
  return httpClient.post('/explorer/search', payload, { token, signal });
}

export async function listSavedSearches({ token, signal } = {}) {
  return httpClient.get('/explorer/saved-searches', { token, signal });
}

export async function createSavedSearch(payload, { token } = {}) {
  return httpClient.post('/explorer/saved-searches', payload, { token });
}

export async function updateSavedSearch(id, payload, { token } = {}) {
  return httpClient.patch(`/explorer/saved-searches/${id}`, payload, { token });
}

export async function deleteSavedSearch(id, { token } = {}) {
  return httpClient.delete(`/explorer/saved-searches/${id}`, { token });
}
