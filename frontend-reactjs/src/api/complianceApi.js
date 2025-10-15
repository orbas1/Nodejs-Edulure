import { httpClient } from './httpClient.js';

export async function fetchDsrQueue({ token, status, dueBefore, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to load DSR queue');
  }
  const params = {};
  if (status) params.status = status;
  if (dueBefore) params.dueBefore = dueBefore;
  const response = await httpClient.get('/compliance/dsr/requests', {
    token,
    params,
    signal,
    cache: { enabled: false }
  });
  return response?.data ?? response;
}

export async function assignDsrRequest({ token, requestId, assigneeId }) {
  if (!token) {
    throw new Error('Authentication token is required to assign DSR requests');
  }
  return httpClient.post(`/compliance/dsr/requests/${requestId}/assign`, { assigneeId }, { token, cache: false });
}

export async function updateDsrStatus({ token, requestId, status, resolutionNotes }) {
  if (!token) {
    throw new Error('Authentication token is required to update DSR status');
  }
  return httpClient.post(
    `/compliance/dsr/requests/${requestId}/status`,
    { status, resolutionNotes },
    { token, cache: false }
  );
}

export async function fetchUserConsents({ token, userId, signal }) {
  if (!token) {
    throw new Error('Authentication token is required to load user consents');
  }
  const response = await httpClient.get(`/compliance/consents/${userId}`, { token, signal, cache: { enabled: false } });
  return response?.data ?? response;
}

export async function createConsent({ token, payload }) {
  if (!token) {
    throw new Error('Authentication token is required to create consent records');
  }
  return httpClient.post('/compliance/consents', payload, {
    token,
    cache: false,
    invalidateTags: ['consents']
  });
}

export async function revokeConsent({ token, consentId, reason }) {
  if (!token) {
    throw new Error('Authentication token is required to revoke consent');
  }
  return httpClient.post(
    `/compliance/consents/${consentId}/revoke`,
    { reason },
    { token, cache: false, invalidateTags: ['consents'] }
  );
}

export async function fetchPolicyTimeline({ token, policyKey, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to load policy timeline');
  }
  const params = policyKey ? { policyKey } : undefined;
  const response = await httpClient.get('/compliance/policies', { token, signal, params, cache: { enabled: false } });
  return response?.data ?? response;
}

export const complianceApi = {
  fetchDsrQueue,
  assignDsrRequest,
  updateDsrStatus,
  fetchUserConsents,
  createConsent,
  revokeConsent,
  fetchPolicyTimeline
};

export default complianceApi;
