import { httpClient } from './httpClient.js';

export async function fetchMarketingLandingContent(params = {}) {
  const response = await httpClient.get('/content/marketing/blocks', { params });
  return response?.data ?? { blocks: [], plans: [], invites: [] };
}

export async function submitMarketingLead(payload) {
  const response = await httpClient.post('/content/marketing/leads', payload);
  return response?.data ?? null;
}
