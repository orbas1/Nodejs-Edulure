import { httpClient } from './httpClient.js';

export function requestTutorBooking({ token, payload } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to request a tutor booking');
  }
  return httpClient.post('/dashboard/learner/bookings', payload ?? {}, { token });
}

export function exportTutorBookings({ token } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to export tutor bookings');
  }
  return httpClient.post('/dashboard/learner/bookings/export', {}, { token });
}

export function syncCourseGoal({ token, payload } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to sync course goals');
  }
  return httpClient.post('/dashboard/learner/courses/goals', payload ?? {}, { token });
}

export function syncCourseCalendar({ token, payload } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to sync the course calendar');
  }
  return httpClient.post('/dashboard/learner/courses/calendar-sync', payload ?? {}, { token });
}

export function resumeEbook({ token, ebookId, payload } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to resume an e-book');
  }
  if (!ebookId) {
    throw new Error('E-book identifier is required');
  }
  return httpClient.post(`/dashboard/learner/ebooks/${ebookId}/resume`, payload ?? {}, { token });
}

export function shareEbookHighlight({ token, ebookId, payload } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to share e-book highlights');
  }
  if (!ebookId) {
    throw new Error('E-book identifier is required');
  }
  return httpClient.post(`/dashboard/learner/ebooks/${ebookId}/share`, payload ?? {}, { token });
}

export function downloadBillingStatement({ token, invoiceId } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to download billing statements');
  }
  if (!invoiceId) {
    throw new Error('Invoice identifier is required');
  }
  return httpClient.post(`/dashboard/learner/financial/statements/${invoiceId}/download`, {}, { token });
}

export function joinLiveSession({ token, sessionId, payload } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to join live sessions');
  }
  if (!sessionId) {
    throw new Error('Session identifier is required');
  }
  return httpClient.post(`/dashboard/learner/live-sessions/${sessionId}/join`, payload ?? {}, { token });
}

export function checkInLiveSession({ token, sessionId, payload } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to check in to live sessions');
  }
  if (!sessionId) {
    throw new Error('Session identifier is required');
  }
  return httpClient.post(`/dashboard/learner/live-sessions/${sessionId}/check-in`, payload ?? {}, { token });
}

export function createCommunityInitiative({ token, communityId, payload } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to create community initiatives');
  }
  if (!communityId) {
    throw new Error('Community identifier is required');
  }
  return httpClient.post(`/dashboard/learner/communities/${communityId}/initiatives`, payload ?? {}, { token });
}

export function exportCommunityHealthReport({ token, communityId } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to export community health reports');
  }
  if (!communityId) {
    throw new Error('Community identifier is required');
  }
  return httpClient.post(`/dashboard/learner/communities/${communityId}/health-report`, {}, { token });
}

export function createCommunityPipelineStage({ token, payload } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to manage community pipelines');
  }
  return httpClient.post('/dashboard/learner/communities/pipelines', payload ?? {}, { token });
}

export const learnerDashboardApi = {
  requestTutorBooking,
  exportTutorBookings,
  syncCourseGoal,
  syncCourseCalendar,
  resumeEbook,
  shareEbookHighlight,
  downloadBillingStatement,
  joinLiveSession,
  checkInLiveSession,
  createCommunityInitiative,
  exportCommunityHealthReport,
  createCommunityPipelineStage
};

export default learnerDashboardApi;
