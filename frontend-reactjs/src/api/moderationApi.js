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

function ensureCommunityIdentifier(communityId) {
  return ensureIdentifier(communityId, 'A community identifier is required for moderation operations');
}

function ensureCaseIdentifier(caseId) {
  return ensureIdentifier(caseId, 'A moderation case identifier is required');
}

export async function listModerationCases({ token, communityId, params, signal } = {}) {
  ensureToken(token);
  const safeCommunityId = ensureCommunityIdentifier(communityId);

  const response = await httpClient.get(`/community-moderation/communities/${safeCommunityId}/cases`, {
    token,
    params,
    signal,
    cache: {
      ttl: 10_000,
      tags: [`moderation:cases:${safeCommunityId}`],
      varyByToken: true
    }
  });
  return mapPaginatedResponse(response);
}

export async function getModerationCase({ token, communityId, caseId, signal } = {}) {
  ensureToken(token);
  const safeCommunityId = ensureCommunityIdentifier(communityId);
  const safeCaseId = ensureCaseIdentifier(caseId);

  const response = await httpClient.get(
    `/community-moderation/communities/${safeCommunityId}/cases/${safeCaseId}`,
    {
      token,
      signal,
      cache: {
        ttl: 10_000,
        tags: [`moderation:case:${safeCaseId}`],
        varyByToken: true
      }
    }
  );
  return response?.data ?? response;
}

export async function listModerationCaseActions({ token, communityId, caseId, signal } = {}) {
  ensureToken(token);
  const safeCommunityId = ensureCommunityIdentifier(communityId);
  const safeCaseId = ensureCaseIdentifier(caseId);

  const response = await httpClient.get(
    `/community-moderation/communities/${safeCommunityId}/cases/${safeCaseId}/actions`,
    {
      token,
      signal,
      cache: {
        ttl: 5_000,
        tags: [`moderation:case-actions:${safeCaseId}`],
        varyByToken: true
      }
    }
  );
  return Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
}

export async function applyModerationCaseAction({
  token,
  communityId,
  caseId,
  payload,
  signal
} = {}) {
  ensureToken(token);
  const safeCommunityId = ensureCommunityIdentifier(communityId);
  const safeCaseId = ensureCaseIdentifier(caseId);

  const response = await httpClient.post(
    `/community-moderation/communities/${safeCommunityId}/cases/${safeCaseId}/actions`,
    payload ?? {},
    {
      token,
      signal,
      invalidateTags: [
        `moderation:cases:${safeCommunityId}`,
        `moderation:case:${safeCaseId}`,
        `moderation:case-actions:${safeCaseId}`
      ]
    }
  );
  return response?.data ?? response;
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
  listModerationCases,
  getModerationCase,
  listModerationCaseActions,
  applyModerationCaseAction,
  listScamReports,
  updateScamReport,
  escalateScamReport,
  listContentAppeals,
  resolveContentAppeal
};

export default moderationApi;
