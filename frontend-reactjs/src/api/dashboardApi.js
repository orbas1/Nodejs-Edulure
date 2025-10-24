import { httpClient } from './httpClient.js';

function normaliseDashboardResponse(payload = {}) {
  const profile = payload.profile ?? null;
  const roles = Array.isArray(payload.roles) ? payload.roles : [];
  const dashboards = typeof payload.dashboards === 'object' && payload.dashboards !== null ? payload.dashboards : {};
  const searchIndex = Array.isArray(payload.searchIndex) ? payload.searchIndex : [];
  const tenantId = payload.tenantId ?? payload.tenant ?? null;
  const surfaceRegistry = typeof payload.surfaceRegistry === 'object' ? payload.surfaceRegistry : {};
  const alerts = Array.isArray(payload.alerts) ? payload.alerts : [];

  return {
    profile,
    roles,
    dashboards,
    searchIndex,
    tenantId,
    surfaceRegistry,
    alerts,
    fetchedAt: new Date().toISOString()
  };
}

export async function fetchDashboard({ token, signal, tenantId, audience } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to fetch dashboard data');
  }

  const response = await httpClient.get('/dashboard/me', {
    token,
    signal,
    params: {
      tenantId,
      audience
    },
    cache: {
      ttl: 1000 * 60,
      tags: [`dashboard:me:${token}`, tenantId ? `dashboard:tenant:${tenantId}` : null].filter(Boolean)
    }
  });
  return normaliseDashboardResponse(response);
}

export const dashboardApi = { fetchDashboard };

export default dashboardApi;
