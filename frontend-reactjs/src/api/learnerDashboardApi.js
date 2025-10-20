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

export async function listTutorBookings({ token, signal } = {}) {
  ensureToken(token);
  const response = await httpClient.get('/dashboard/learner/tutor-bookings', {
    token,
    signal,
    cache: {
      ttl: 5_000,
      tags: [`dashboard:me:${token}:tutor-bookings`]
    }
  });
  return response?.data?.bookings ?? response?.data ?? [];
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

export async function updateTutorBooking({ token, bookingId, payload, signal } = {}) {
  ensureToken(token);
  if (!bookingId) {
    throw new Error('A tutor booking identifier is required to update the request');
  }
  return httpClient.patch(`/dashboard/learner/tutor-bookings/${bookingId}`, payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function cancelTutorBooking({ token, bookingId, payload, signal } = {}) {
  ensureToken(token);
  if (!bookingId) {
    throw new Error('A tutor booking identifier is required to cancel the request');
  }
  return httpClient.post(`/dashboard/learner/tutor-bookings/${bookingId}/cancel`, payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
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

export async function createLearnerLibraryEntry({ token, payload, signal } = {}) {
  ensureToken(token);
  return httpClient.post('/dashboard/learner/ebooks', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function updateLearnerLibraryEntry({ token, ebookId, payload, signal } = {}) {
  ensureToken(token);
  if (!ebookId) {
    throw new Error('An e-book identifier is required to update the library entry');
  }
  return httpClient.patch(`/dashboard/learner/ebooks/${ebookId}`, payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function deleteLearnerLibraryEntry({ token, ebookId, signal } = {}) {
  ensureToken(token);
  if (!ebookId) {
    throw new Error('An e-book identifier is required to remove the library entry');
  }
  return httpClient.delete(`/dashboard/learner/ebooks/${ebookId}`, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
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

export async function createPaymentMethod({ token, payload, signal } = {}) {
  ensureToken(token);
  return httpClient.post('/dashboard/learner/financial/payment-methods', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function updatePaymentMethod({ token, methodId, payload, signal } = {}) {
  ensureToken(token);
  if (!methodId) {
    throw new Error('A payment method identifier is required to update the record');
  }
  return httpClient.patch(`/dashboard/learner/financial/payment-methods/${methodId}`, payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function removePaymentMethod({ token, methodId, signal } = {}) {
  ensureToken(token);
  if (!methodId) {
    throw new Error('A payment method identifier is required to remove the record');
  }
  return httpClient.delete(`/dashboard/learner/financial/payment-methods/${methodId}`, {
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

export async function createSupportTicket({ token, payload, signal } = {}) {
  ensureToken(token);
  return httpClient.post('/dashboard/learner/support/tickets', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function fetchSupportTickets({ token, signal } = {}) {
  ensureToken(token);
  return httpClient.get('/dashboard/learner/support/tickets', {
    token,
    signal,
    cache: { enabled: false }
  });
}

export async function updateSupportTicket({ token, ticketId, payload, signal } = {}) {
  ensureToken(token);
  if (!ticketId) {
    throw new Error('A support ticket identifier is required to update');
  }
  return httpClient.put(`/dashboard/learner/support/tickets/${ticketId}`, payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function replyToSupportTicket({ token, ticketId, payload, signal } = {}) {
  ensureToken(token);
  if (!ticketId) {
    throw new Error('A support ticket identifier is required to send a reply');
  }
  return httpClient.post(`/dashboard/learner/support/tickets/${ticketId}/messages`, payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function closeSupportTicket({ token, ticketId, payload, signal } = {}) {
  ensureToken(token);
  if (!ticketId) {
    throw new Error('A support ticket identifier is required to close the case');
  }
  return httpClient.post(`/dashboard/learner/support/tickets/${ticketId}/close`, payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function createFieldServiceAssignment({ token, payload, signal } = {}) {
  ensureToken(token);
  return httpClient.post('/dashboard/learner/field-services/assignments', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function updateFieldServiceAssignment({ token, assignmentId, payload, signal } = {}) {
  ensureToken(token);
  if (!assignmentId) {
    throw new Error('A field service assignment identifier is required to update');
  }
  return httpClient.patch(`/dashboard/learner/field-services/assignments/${assignmentId}`, payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function closeFieldServiceAssignment({ token, assignmentId, payload, signal } = {}) {
  ensureToken(token);
  if (!assignmentId) {
    throw new Error('A field service assignment identifier is required to close the job');
  }
  return httpClient.post(
    `/dashboard/learner/field-services/assignments/${assignmentId}/close`,
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
  updateTutorBooking,
  cancelTutorBooking,
  createCourseGoal,
  resumeEbook,
  shareEbookHighlight,
  createLearnerLibraryEntry,
  updateLearnerLibraryEntry,
  deleteLearnerLibraryEntry,
  downloadInvoice,
  updateBillingPreferences,
  createPaymentMethod,
  updatePaymentMethod,
  removePaymentMethod,
  joinLiveSession,
  checkInToLiveSession,
  triggerCommunityAction,
  createSupportTicket,
  fetchSupportTickets,
  updateSupportTicket,
  replyToSupportTicket,
  closeSupportTicket,
  createFieldServiceAssignment,
  updateFieldServiceAssignment,
  closeFieldServiceAssignment
};

export default learnerDashboardApi;
