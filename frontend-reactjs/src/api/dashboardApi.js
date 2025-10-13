import { httpClient } from './httpClient.js';
import { dashboardDemo } from './dashboardDemoData.js';

function normaliseDashboardResponse(payload = {}) {
  const container = typeof payload.data === 'object' && payload.data !== null ? payload.data : payload;

  const profile = container.profile ?? null;
  const roles = Array.isArray(container.roles) ? container.roles : [];
  const dashboards =
    typeof container.dashboards === 'object' && container.dashboards !== null ? container.dashboards : {};
  const searchIndex = Array.isArray(container.searchIndex) ? container.searchIndex : [];

  return { profile, roles, dashboards, searchIndex };
}

export async function fetchDashboard({ token, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to fetch dashboard data');
  }

  try {
    const response = await httpClient.get('/dashboard/me', { token, signal });
    const normalised = normaliseDashboardResponse(response);
    if (import.meta.env?.DEV && !normalised.profile) {
      console.warn('Dashboard API returned no profile data, using demo payload instead.');
      return dashboardDemo;
    }
    return normalised;
  } catch (error) {
    if (signal?.aborted || error?.name === 'CanceledError') {
      throw error;
    }
    if (import.meta.env?.DEV) {
      console.warn('Falling back to demo dashboard data due to fetch failure.', error);
      return dashboardDemo;
    }
    throw error;
  }
}

export const dashboardApi = { fetchDashboard };

export default dashboardApi;
