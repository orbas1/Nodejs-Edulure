import { httpClient } from './httpClient.js';

function ensureInviteToken(token, action) {
  if (!token || !token.trim()) {
    throw new Error(`Invitation token is required to ${action}.`);
  }

  return encodeURIComponent(token.trim());
}

export async function fetchIntegrationInvite({ token, signal } = {}) {
  const encodedToken = ensureInviteToken(token, 'load invitation details');

  const response = await httpClient.get(`/integration-invites/${encodedToken}`, {
    signal,
    cache: { enabled: false }
  });

  return response?.data ?? response;
}

export async function previewIntegrationInvite({ token, signal } = {}) {
  const encodedToken = ensureInviteToken(token, 'preview the invitation');

  const response = await httpClient.get(`/integration-invites/${encodedToken}/preview`, {
    signal,
    cache: { enabled: false }
  });

  return response?.data ?? response;
}

export async function submitIntegrationInvite({
  token,
  key,
  rotationIntervalDays,
  keyExpiresAt,
  actorEmail,
  actorName,
  reason,
  signal
} = {}) {
  const encodedToken = ensureInviteToken(token, 'submit credentials for the invitation');

  if (!key) {
    throw new Error('API key value is required');
  }

  const payload = { key, rotationIntervalDays, keyExpiresAt, actorEmail, actorName, reason };

  const response = await httpClient.post(`/integration-invites/${encodedToken}`, payload, {
    signal,
    cache: false
  });

  return response?.data ?? response;
}

export async function declineIntegrationInvite({ token, reason, signal } = {}) {
  const encodedToken = ensureInviteToken(token, 'decline the invitation');

  const response = await httpClient.post(
    `/integration-invites/${encodedToken}/decline`,
    reason ? { reason } : {},
    {
      signal,
      cache: false
    }
  );

  return response?.data ?? response;
}

export const integrationInviteApi = {
  fetchIntegrationInvite,
  previewIntegrationInvite,
  submitIntegrationInvite,
  declineIntegrationInvite
};

export default integrationInviteApi;
