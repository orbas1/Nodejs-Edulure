import { httpClient } from './httpClient.js';

function ensureToken(token) {
  if (!token) {
    throw new Error('Authentication token is required for learner dashboard actions');
  }
}

export async function createTutorBookingRequest({ token, payload, signal } = {}) {
  ensureToken(token);
  return httpClient.post('/dashboard/learner/tutor-bookings', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function exportTutorSchedule({ token, signal } = {}) {
  ensureToken(token);
  return httpClient.post(
    '/dashboard/learner/tutor-bookings/export',
    {},
    {
      token,
      signal
    }
  );
}

export async function createCourseGoal({ token, courseId, payload, signal } = {}) {
  ensureToken(token);
  if (!courseId) {
    throw new Error('A course identifier is required to create a learning goal');
  }
  return httpClient.post(
    `/dashboard/learner/courses/${courseId}/goals`,
    payload ?? {},
    {
      token,
      signal,
      invalidateTags: [`dashboard:me:${token}`]
    }
  );
}

export async function resumeEbook({ token, ebookId, signal } = {}) {
  ensureToken(token);
  if (!ebookId) {
    throw new Error('An e-book identifier is required to resume progress');
  }
  return httpClient.post(
    `/dashboard/learner/ebooks/${ebookId}/resume`,
    {},
    {
      token,
      signal,
      invalidateTags: [`dashboard:me:${token}`]
    }
  );
}

export async function shareEbookHighlight({ token, ebookId, payload, signal } = {}) {
  ensureToken(token);
  if (!ebookId) {
    throw new Error('An e-book identifier is required to share highlights');
  }
  return httpClient.post(
    `/dashboard/learner/ebooks/${ebookId}/share`,
    payload ?? {},
    {
      token,
      signal
    }
  );
}

export async function downloadInvoice({ token, invoiceId, signal } = {}) {
  ensureToken(token);
  if (!invoiceId) {
    throw new Error('An invoice identifier is required to download the document');
  }
  return httpClient.get(`/dashboard/learner/financial/invoices/${invoiceId}/download`, {
    token,
    signal
  });
}

export async function updateBillingPreferences({ token, payload, signal } = {}) {
  ensureToken(token);
  return httpClient.put('/dashboard/learner/financial/preferences', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function joinLiveSession({ token, sessionId, signal } = {}) {
  ensureToken(token);
  if (!sessionId) {
    throw new Error('A live session identifier is required to join');
  }
  return httpClient.post(
    `/dashboard/learner/live-sessions/${sessionId}/join`,
    {},
    {
      token,
      signal
    }
  );
}

export async function checkInToLiveSession({ token, sessionId, signal } = {}) {
  ensureToken(token);
  if (!sessionId) {
    throw new Error('A live session identifier is required to check in');
  }
  return httpClient.post(
    `/dashboard/learner/live-sessions/${sessionId}/check-in`,
    {},
    {
      token,
      signal
    }
  );
}

export async function triggerCommunityAction({ token, communityId, payload, signal } = {}) {
  ensureToken(token);
  if (!communityId) {
    throw new Error('A community identifier is required to trigger actions');
  }
  return httpClient.post(
    `/dashboard/learner/communities/${communityId}/actions`,
    payload ?? {},
    {
      token,
      signal,
      invalidateTags: [`dashboard:me:${token}`]
    }
  );
}

export const learnerDashboardApi = {
  createTutorBookingRequest,
  exportTutorSchedule,
  createCourseGoal,
  resumeEbook,
  shareEbookHighlight,
  downloadInvoice,
  updateBillingPreferences,
  joinLiveSession,
  checkInToLiveSession,
  triggerCommunityAction
};

export default learnerDashboardApi;
