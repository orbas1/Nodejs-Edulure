import { httpClient } from './httpClient.js';

export async function fetchIntegrationDashboard({ token, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to load integration dashboard data');
  }

  const response = await httpClient.get('/admin/integrations/dashboard', {
    token,
    signal,
    cache: { enabled: false }
  });

  return response?.data ?? response;
}

export async function triggerIntegrationRun({ token, integration, windowStartAt, windowEndAt } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to trigger integration runs');
  }
  if (!integration) {
    throw new Error('Integration identifier is required');
  }

  const payload = {};
  if (windowStartAt) payload.windowStartAt = windowStartAt;
  if (windowEndAt) payload.windowEndAt = windowEndAt;

  return httpClient.post(`/admin/integrations/${integration}/runs`, payload, {
    token,
    cache: false,
    invalidateTags: [`integration-dashboard-${integration}`]
  });
}

export const integrationAdminApi = {
  fetchIntegrationDashboard,
  triggerIntegrationRun
};

export default integrationAdminApi;

