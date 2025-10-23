import { API_BASE_URL, httpClient } from './httpClient.js';
import { assertToken, createListCacheConfig } from './apiUtils.js';

export async function fetchExplorerSummary({ range = '7d', token, signal } = {}) {
  assertToken(token, 'load explorer summary analytics');
  return httpClient.get('/analytics/explorer/summary', {
    params: { range },
    token,
    signal,
    cache: createListCacheConfig(`analytics:explorer:summary:${range}`)
  });
}

export async function fetchExplorerAlerts({ includeResolved = false, token, signal } = {}) {
  assertToken(token, 'load explorer alerts');
  return httpClient.get('/analytics/explorer/alerts', {
    params: { includeResolved },
    token,
    signal,
    cache: createListCacheConfig(`analytics:explorer:alerts:${includeResolved}`, { ttl: 120_000 })
  });
}

export async function recordExplorerInteraction(payload, { token } = {}) {
  assertToken(token, 'record explorer interactions');
  const url = `${API_BASE_URL}/analytics/explorer/interactions`;
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const body = JSON.stringify(payload);
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
    return { success: true };
  }
  return httpClient.post('/analytics/explorer/interactions', payload, { token });
}

export async function fetchRevenueSavedViews({ range = '30d', token, signal } = {}) {
  assertToken(token, 'load revenue saved views');
  return httpClient.get('/analytics/bi/revenue/saved-views', {
    params: { range },
    token,
    signal,
    cache: createListCacheConfig(`analytics:bi:revenue:saved-views:${range}`, { ttl: 60_000 })
  });
}
