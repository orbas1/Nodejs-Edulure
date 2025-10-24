import { httpClient } from './httpClient.js';

export async function fetchSetupStatus({ historyLimit, signal } = {}) {
  const search = typeof historyLimit === 'number' ? `?history_limit=${encodeURIComponent(historyLimit)}` : '';
  const response = await httpClient.get(`/setup/status${search}`, { cache: false, signal });
  return response?.data ?? {};
}

export async function startSetupRun(payload) {
  const response = await httpClient.post('/setup/runs', payload, { cache: false });
  return response?.data ?? {};
}

export default {
  fetchSetupStatus,
  startSetupRun
};
