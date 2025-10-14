import { httpClient } from './httpClient.js';

function normaliseSettings(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return {
    commissions: payload.commissions ?? null,
    subscriptions: payload.subscriptions ?? null,
    payments: payload.payments ?? null,
    affiliate: payload.affiliate ?? null,
    workforce: payload.workforce ?? null
  };
}

export async function fetchMonetizationSettings({ token, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to load monetization settings');
  }

  const response = await httpClient.get('/admin/monetization/settings', { token, signal });
  return normaliseSettings(response?.data);
}

export async function updateMonetizationSettings({ token, payload }) {
  if (!token) {
    throw new Error('Authentication token is required to update monetization settings');
  }

  const response = await httpClient.put('/admin/monetization/settings', payload, { token });
  return normaliseSettings(response?.data);
}

export const adminApi = {
  fetchMonetizationSettings,
  updateMonetizationSettings
};

export default adminApi;
