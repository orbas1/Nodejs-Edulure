import { API_BASE_URL, httpClient } from './httpClient.js';
import { assertToken, createListCacheConfig } from './apiUtils.js';
import {
  attachEnvironmentToInteraction,
  normaliseExplorerAlert,
  normaliseExplorerSummary,
  normaliseRevenueSavedView
} from './analyticsContracts.js';
import { getEnvironmentContext } from '../utils/environment.js';

export async function fetchExplorerSummary({ range = '7d', token, signal } = {}) {
  assertToken(token, 'load explorer summary analytics');
  const response = await httpClient.get('/analytics/explorer/summary', {
    params: { range },
    token,
    signal,
    cache: createListCacheConfig(`analytics:explorer:summary:${range}`)
  });
  return normaliseExplorerSummary(response?.data ?? response);
}

export async function fetchExplorerAlerts({ includeResolved = false, token, signal } = {}) {
  assertToken(token, 'load explorer alerts');
  const response = await httpClient.get('/analytics/explorer/alerts', {
    params: { includeResolved },
    token,
    signal,
    cache: createListCacheConfig(`analytics:explorer:alerts:${includeResolved}`, { ttl: 120_000 })
  });
  const alerts = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
  return alerts.map((alert) => normaliseExplorerAlert(alert));
}

export async function recordExplorerInteraction(payload, { token } = {}) {
  assertToken(token, 'record explorer interactions');
  const url = `${API_BASE_URL}/analytics/explorer/interactions`;
  const environment = getEnvironmentContext();
  const bodyPayload = attachEnvironmentToInteraction(payload, environment);
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const body = JSON.stringify(bodyPayload);
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
    return { success: true };
  }
  return httpClient.post('/analytics/explorer/interactions', bodyPayload, { token, cache: false });
}

export async function fetchRevenueSavedViews({ range = '30d', token, signal } = {}) {
  assertToken(token, 'load revenue saved views');
  const response = await httpClient.get('/analytics/bi/revenue/saved-views', {
    params: { range },
    token,
    signal,
    cache: createListCacheConfig(`analytics:bi:revenue:saved-views:${range}`, {
      ttl: 60_000
    })
  });
  const views = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
  return views.map((view) => normaliseRevenueSavedView(view));
}
