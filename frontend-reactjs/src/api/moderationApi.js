import { httpClient } from './httpClient.js';

function mapPaginatedResponse(response = {}) {
  const pagination = response?.meta?.pagination ?? {};
  return {
    items: Array.isArray(response?.data) ? response.data : [],
    pagination: {
      page: Number(pagination.page ?? 1),
      perPage: Number(pagination.perPage ?? 25),
      total: Number(pagination.total ?? (response?.data?.length ?? 0)),
      pageCount: Number(pagination.pageCount ?? 1)
    }
  };
}

export async function listScamReports({ token, params, signal } = {}) {
  const response = await httpClient.get('/community-moderation/scam-reports', {
    token,
    params,
    signal
  });
  return mapPaginatedResponse(response);
}

export async function updateScamReport({ token, reportId, payload, signal } = {}) {
  if (!reportId) {
    throw new Error('A scam report identifier is required to update the record');
  }
  const response = await httpClient.patch(`/community-moderation/scam-reports/${encodeURIComponent(reportId)}`, payload, {
    token,
    signal
  });
  return response?.data ?? null;
}

export const moderationApi = {
  listScamReports,
  updateScamReport
};

export default moderationApi;
