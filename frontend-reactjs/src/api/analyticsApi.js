import { API_BASE_URL, httpClient } from './httpClient.js';

export async function fetchExplorerSummary({ range = '7d', token, signal } = {}) {
  return httpClient.get('/analytics/explorer/summary', {
    params: { range },
    token,
    signal,
    cache: {
      ttl: 1000 * 60 * 5,
      tags: [`analytics:explorer:summary:${range}`]
    }
  });
}

export async function fetchExplorerAlerts({ includeResolved = false, token, signal } = {}) {
  return httpClient.get('/analytics/explorer/alerts', {
    params: { includeResolved },
    token,
    signal,
    cache: {
      ttl: 1000 * 60 * 2,
      tags: [`analytics:explorer:alerts:${includeResolved}`]
    }
  });
}

export async function recordExplorerInteraction(payload, { token } = {}) {
  const url = `${API_BASE_URL}/analytics/explorer/interactions`;
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const body = JSON.stringify(payload);
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
    return { success: true };
  }
  return httpClient.post('/analytics/explorer/interactions', payload, { token });
}
