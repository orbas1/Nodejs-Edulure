import { httpClient } from './httpClient.js';
import { assertId, assertToken, createInvalidationConfig, createListCacheConfig } from './apiUtils.js';

export async function fetchExplorerSuggestions(params = {}, { token, signal } = {}) {
  assertToken(token, 'retrieve explorer suggestions');
  const { query, limit, entityTypes } = params;
  const requestParams = {};
  if (query !== undefined && query !== null) {
    requestParams.query = query;
  }
  if (limit !== undefined && limit !== null) {
    requestParams.limit = limit;
  }
  if (entityTypes !== undefined && entityTypes !== null) {
    requestParams.entityTypes = Array.isArray(entityTypes) ? entityTypes : [entityTypes];
  }

  return httpClient.get('/explorer/suggestions', {
    token,
    signal,
    params: requestParams,
    cache: { enabled: false }
  });
}

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
