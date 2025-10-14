import { httpClient } from './httpClient.js';

function unwrap(response) {
  return response?.data ?? null;
}

export async function fetchVerificationSummary({ token, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to load verification status');
  }
  const response = await httpClient.get('/verification/me', {
    token,
    signal,
    cache: {
      ttl: 1000 * 60,
      tags: [`verification:summary:${token}`]
    }
  });
  return unwrap(response);
}

export async function requestVerificationUpload({ token, payload, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to request uploads');
  }
  const response = await httpClient.post('/verification/me/upload-requests', payload, {
    token,
    signal,
    cache: {
      invalidateTags: [`verification:summary:${token}`]
    }
  });
  return unwrap(response);
}

export async function attachVerificationDocument({ token, payload, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to attach documents');
  }
  const response = await httpClient.post('/verification/me/documents', payload, {
    token,
    signal,
    cache: {
      invalidateTags: [`verification:summary:${token}`]
    }
  });
  return unwrap(response);
}

export async function submitVerificationPackage({ token, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to submit verification');
  }
  const response = await httpClient.post('/verification/me/submit', null, {
    token,
    signal,
    cache: {
      invalidateTags: [`verification:summary:${token}`]
    }
  });
  return unwrap(response);
}

export async function fetchVerificationOverview({ token, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to load compliance overview');
  }
  const response = await httpClient.get('/verification/admin/overview', {
    token,
    signal,
    cache: {
      ttl: 1000 * 60,
      tags: ['verification:admin:overview']
    }
  });
  return unwrap(response);
}

export async function reviewVerificationCase({ token, verificationId, body, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to review verification cases');
  }
  if (!verificationId) {
    throw new Error('Verification identifier is required');
  }
  const response = await httpClient.post(`/verification/${verificationId}/review`, body, {
    token,
    signal,
    cache: {
      invalidateTags: ['verification:admin:overview', `verification:audit:${verificationId}`]
    }
  });
  return unwrap(response);
}

export async function fetchVerificationAudit({ token, verificationId, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to view verification audits');
  }
  if (!verificationId) {
    throw new Error('Verification identifier is required');
  }
  const response = await httpClient.get(`/verification/${verificationId}/audit`, {
    token,
    signal,
    cache: {
      ttl: 1000 * 60,
      tags: [`verification:audit:${verificationId}`]
    }
  });
  return unwrap(response);
}

export const verificationApi = {
  fetchVerificationSummary,
  requestVerificationUpload,
  attachVerificationDocument,
  submitVerificationPackage,
  fetchVerificationOverview,
  reviewVerificationCase,
  fetchVerificationAudit
};

export default verificationApi;
