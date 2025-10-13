import { httpClient } from './httpClient.js';

function normaliseDashboardResponse(payload = {}) {
  const profile = payload.profile ?? null;
  const roles = Array.isArray(payload.roles) ? payload.roles : [];
  const dashboards = typeof payload.dashboards === 'object' && payload.dashboards !== null ? payload.dashboards : {};
  const searchIndex = Array.isArray(payload.searchIndex) ? payload.searchIndex : [];

  return { profile, roles, dashboards, searchIndex };
}

export async function fetchDashboard({ token, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to fetch dashboard data');
  }

  const response = await httpClient.get('/dashboard/me', { token, signal });
  return normaliseDashboardResponse(response);
}

export const dashboardApi = { fetchDashboard };

export default dashboardApi;
