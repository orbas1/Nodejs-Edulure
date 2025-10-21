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

  const safeIntegration = encodeURIComponent(integration);

  return httpClient.post(`/admin/integrations/${safeIntegration}/runs`, payload, {
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

  const safeId = encodeURIComponent(id);

  const response = await httpClient.post(`/admin/integrations/api-keys/${safeId}/rotate`, payload, {
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

  const safeId = encodeURIComponent(id);

  const response = await httpClient.post(`/admin/integrations/api-keys/${safeId}/disable`, { reason }, {
    token,
    cache: false,
    invalidateTags: ['integration-api-keys']
  });

  return response?.data ?? response;
}

export async function listIntegrationApiKeyInvitations({ token, provider, environment, status, ownerEmail, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to load API key invitations');
  }

  const params = {};
  if (provider) params.provider = provider;
  if (environment) params.environment = environment;
  if (status) params.status = status;
  if (ownerEmail) params.ownerEmail = ownerEmail;

  const response = await httpClient.get('/admin/integrations/api-keys/invitations', {
    token,
    params,
    signal,
    cache: { enabled: false }
  });

  return response?.data ?? response;
}

export async function createIntegrationApiKeyInvitation({
  token,
  provider,
  environment,
  alias,
  ownerEmail,
  rotationIntervalDays,
  keyExpiresAt,
  notes,
  reason,
  apiKeyId,
  requestedByName
} = {}) {
  if (!token) {
    throw new Error('Authentication token is required to request API key invitations');
  }

  const payload = {
    provider,
    environment,
    alias,
    ownerEmail,
    rotationIntervalDays,
    keyExpiresAt,
    notes,
    reason,
    apiKeyId,
    requestedByName
  };

  const response = await httpClient.post('/admin/integrations/api-keys/invitations', payload, {
    token,
    cache: false,
    invalidateTags: ['integration-api-key-invitations']
  });

  return {
    invite: response?.data ?? null,
    claimUrl: response?.claimUrl ?? null
  };
}

export async function resendIntegrationApiKeyInvitation({ token, id, requestedByName } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to resend API key invitations');
  }
  if (!id) {
    throw new Error('Invitation identifier is required');
  }

  const safeId = encodeURIComponent(id);

  const response = await httpClient.post(
    `/admin/integrations/api-keys/invitations/${safeId}/resend`,
    { requestedByName },
    {
      token,
      cache: false,
      invalidateTags: ['integration-api-key-invitations']
    }
  );

  return {
    invite: response?.data ?? null,
    claimUrl: response?.claimUrl ?? null
  };
}

export async function cancelIntegrationApiKeyInvitation({ token, id } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to cancel API key invitations');
  }
  if (!id) {
    throw new Error('Invitation identifier is required');
  }

  const safeId = encodeURIComponent(id);

  const response = await httpClient.post(
    `/admin/integrations/api-keys/invitations/${safeId}/cancel`,
    {},
    {
      token,
      cache: false,
      invalidateTags: ['integration-api-key-invitations']
    }
  );

  return response?.data ?? response;
}

export async function updateIntegrationSettings({ token, integration, payload, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to update integration settings');
  }
  if (!integration) {
    throw new Error('An integration identifier is required to update settings');
  }

  const safeIntegration = encodeURIComponent(integration);

  const response = await httpClient.put(
    `/admin/integrations/${safeIntegration}/settings`,
    payload ?? {},
    {
      token,
      signal,
      cache: false,
      invalidateTags: [`integration-settings-${integration}`]
    }
  );

  return response?.data ?? response;
}

export async function fetchIntegrationHealth({ token, integration, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to fetch integration health');
  }
  if (!integration) {
    throw new Error('An integration identifier is required to fetch health information');
  }

  const safeIntegration = encodeURIComponent(integration);

  const response = await httpClient.get(`/admin/integrations/${safeIntegration}/health`, {
    token,
    signal,
    cache: { enabled: false }
  });

  return response?.data ?? response;
}

export async function downloadIntegrationReport({
  token,
  integration,
  format = 'json',
  signal,
  params = {}
} = {}) {
  if (!token) {
    throw new Error('Authentication token is required to download integration reports');
  }
  if (!integration) {
    throw new Error('An integration identifier is required to download reports');
  }

  const safeIntegration = encodeURIComponent(integration);
  const requestParams = { ...params };
  if (format) {
    requestParams.format = format;
  }

  const binaryFormats = new Set(['csv', 'xlsx', 'zip', 'pdf']);
  const responseType = binaryFormats.has(String(format).toLowerCase()) ? 'blob' : 'json';

  return httpClient.get(`/admin/integrations/${safeIntegration}/report`, {
    token,
    signal,
    params: requestParams,
    responseType,
    cache: { enabled: false }
  });
}

export const integrationAdminApi = {
  fetchIntegrationDashboard,
  triggerIntegrationRun,
  listIntegrationApiKeys,
  createIntegrationApiKey,
  rotateIntegrationApiKey,
  disableIntegrationApiKey,
  listIntegrationApiKeyInvitations,
  createIntegrationApiKeyInvitation,
  resendIntegrationApiKeyInvitation,
  cancelIntegrationApiKeyInvitation,
  updateIntegrationSettings,
  fetchIntegrationHealth,
  downloadIntegrationReport
};

export default integrationAdminApi;

