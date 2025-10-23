import { httpClient } from './httpClient.js';
import { assertId, assertToken, createInvalidationConfig, createListCacheConfig } from './apiUtils.js';

export async function searchExplorer(payload, { token, signal } = {}) {
  assertToken(token, 'perform explorer search');
  return httpClient.post('/explorer/search', payload, {
    token,
    signal,
    cache: { enabled: false }
  });
}

export async function listSavedSearches({ token, signal } = {}) {
  assertToken(token, 'list saved explorer searches');
  return httpClient.get('/explorer/saved-searches', {
    token,
    signal,
    cache: createListCacheConfig(`explorer:saved-searches:${token}`, { ttl: 30_000 })
  });
}

export async function createSavedSearch(payload, { token } = {}) {
  assertToken(token, 'create an explorer saved search');
  return httpClient.post('/explorer/saved-searches', payload, {
    token,
    cache: createInvalidationConfig(`explorer:saved-searches:${token}`)
  });
}

export async function updateSavedSearch(id, payload, { token } = {}) {
  assertToken(token, 'update an explorer saved search');
  assertId(id, 'Saved search id');
  return httpClient.patch(`/explorer/saved-searches/${id}`, payload, {
    token,
    cache: createInvalidationConfig([
      `explorer:saved-searches:${token}`,
      `explorer:saved-search:${id}`
    ])
  });
}

export async function deleteSavedSearch(id, { token } = {}) {
  assertToken(token, 'delete an explorer saved search');
  assertId(id, 'Saved search id');
  return httpClient.delete(`/explorer/saved-searches/${id}`, {
    token,
    cache: createInvalidationConfig([
      `explorer:saved-searches:${token}`,
      `explorer:saved-search:${id}`
    ])
  });
}

export async function fetchExplorerSuggestions({ token, limit = 12, sinceDays = 14, signal } = {}) {
  assertToken(token, 'load explorer suggestions');
  return httpClient.get('/explorer/suggestions', {
    token,
    signal,
    params: { limit, sinceDays },
    cache: createListCacheConfig(`explorer:suggestions:${limit}:${sinceDays}`, { ttl: 15_000 })
  });
}
