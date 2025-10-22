import { httpClient } from './httpClient.js';

export async function fetchSetupStatus() {
  const response = await httpClient.get('/setup/status', { cache: false });
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
