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

export async function listIntegrationApiKeys({ token, provider, environment, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to load API keys');
  }

  const params = {};
  if (provider) params.provider = provider;
  if (environment) params.environment = environment;

  const response = await httpClient.get('/admin/integrations/api-keys', {
    token,
    params,
    signal,
    cache: { enabled: false }
  });

  return response?.data ?? response;
}

export async function createIntegrationApiKey({
  token,
  provider,
  environment,
  alias,
  ownerEmail,
  key,
  rotationIntervalDays,
  expiresAt,
  notes
} = {}) {
  if (!token) {
    throw new Error('Authentication token is required to create API keys');
  }

  const payload = {
    provider,
    environment,
    alias,
    ownerEmail,
    key,
    rotationIntervalDays,
    expiresAt,
    notes
  };

  const response = await httpClient.post('/admin/integrations/api-keys', payload, {
    token,
    cache: false,
    invalidateTags: ['integration-api-keys']
  });

  return response?.data ?? response;
}

export async function rotateIntegrationApiKey({
  token,
  id,
  key,
  rotationIntervalDays,
  expiresAt,
  reason,
  notes
} = {}) {
  if (!token) {
    throw new Error('Authentication token is required to rotate API keys');
  }
  if (!id) {
    throw new Error('API key identifier is required');
  }

  const payload = { key, rotationIntervalDays, expiresAt, reason, notes };

  const response = await httpClient.post(`/admin/integrations/api-keys/${id}/rotate`, payload, {
    token,
    cache: false,
    invalidateTags: ['integration-api-keys']
  });

  return response?.data ?? response;
}

export async function disableIntegrationApiKey({ token, id, reason } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to disable API keys');
  }
  if (!id) {
    throw new Error('API key identifier is required');
  }

  const response = await httpClient.post(`/admin/integrations/api-keys/${id}/disable`, { reason }, {
    token,
    cache: false,
    invalidateTags: ['integration-api-keys']
  });

  return response?.data ?? response;
}

export const integrationAdminApi = {
  fetchIntegrationDashboard,
  triggerIntegrationRun,
  listIntegrationApiKeys,
  createIntegrationApiKey,
  rotateIntegrationApiKey,
  disableIntegrationApiKey
};

export default integrationAdminApi;

