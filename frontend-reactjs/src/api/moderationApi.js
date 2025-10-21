import { httpClient } from './httpClient.js';

function ensureToken(token) {
  if (!token) {
    throw new Error('Authentication token is required for moderation requests');
  }
}

function ensureIdentifier(value, message) {
  if (!value) {
    throw new Error(message);
  }
  return encodeURIComponent(String(value).trim());
}

function mapPaginatedResponse(response = {}) {
  const pagination = response?.meta?.pagination ?? response?.pagination ?? {};
  return {
    items: Array.isArray(response?.data) ? response.data : Array.isArray(response?.items) ? response.items : [],
    pagination: {
      page: Number(pagination.page ?? 1),
      perPage: Number(pagination.perPage ?? pagination.per_page ?? 25),
      total: Number(pagination.total ?? (response?.data?.length ?? 0)),
      pageCount: Number(pagination.pageCount ?? pagination.page_count ?? 1)
    }
  };
}

export async function listScamReports({ token, params, signal } = {}) {
  ensureToken(token);

  const response = await httpClient.get('/community-moderation/scam-reports', {
    token,
    params,
    signal
  });
  return mapPaginatedResponse(response);
}

export async function updateScamReport({ token, reportId, payload, signal } = {}) {
  ensureToken(token);

  if (!reportId) {
    throw new Error('A scam report identifier is required to update the record');
  }
  const safeId = encodeURIComponent(reportId);
  const response = await httpClient.patch(`/community-moderation/scam-reports/${safeId}`, payload ?? {}, {
    token,
    signal
  });
  return response?.data ?? null;
}

export async function escalateScamReport({ token, reportId, reason, signal } = {}) {
  ensureToken(token);
  const safeId = ensureIdentifier(reportId, 'A scam report identifier is required to escalate the report');

  return httpClient.post(
    `/community-moderation/scam-reports/${safeId}/escalate`,
    reason ? { reason } : {},
    {
      token,
      signal
    }
  );
}

export async function listContentAppeals({ token, params, signal } = {}) {
  ensureToken(token);

  const response = await httpClient.get('/community-moderation/content-appeals', {
    token,
    params,
    signal,
    cache: {
      ttl: 15_000,
      tags: ['moderation:appeals'],
      varyByToken: true
    }
  });

  return mapPaginatedResponse(response);
}

export async function resolveContentAppeal({ token, appealId, payload, signal } = {}) {
  ensureToken(token);
  const safeId = ensureIdentifier(appealId, 'An appeal identifier is required to resolve the request');

  const response = await httpClient.post(`/community-moderation/content-appeals/${safeId}/resolve`, payload ?? {}, {
    token,
    signal,
    invalidateTags: ['moderation:appeals']
  });

  return response?.data ?? response;
}

export const moderationApi = {
  listScamReports,
  updateScamReport,
  escalateScamReport,
  listContentAppeals,
  resolveContentAppeal
};

export default moderationApi;
