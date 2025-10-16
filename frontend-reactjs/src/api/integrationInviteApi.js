import { httpClient } from './httpClient.js';

export async function fetchIntegrationInvite({ token, signal } = {}) {
  if (!token) {
    throw new Error('Invitation token is required');
  }

  const encodedToken = encodeURIComponent(token.trim());

  const response = await httpClient.get(`/integration-invites/${encodedToken}`, {
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
  if (!token) {
    throw new Error('Invitation token is required to submit credentials');
  }
  if (!key) {
    throw new Error('API key value is required');
  }

  const encodedToken = encodeURIComponent(token.trim());

  const payload = { key, rotationIntervalDays, keyExpiresAt, actorEmail, actorName, reason };

  const response = await httpClient.post(`/integration-invites/${encodedToken}`, payload, {
    signal,
    cache: false
  });

  return response?.data ?? response;
}

export const integrationInviteApi = {
  fetchIntegrationInvite,
  submitIntegrationInvite
};

export default integrationInviteApi;
