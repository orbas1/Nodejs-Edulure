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

export async function deleteBillingContact({ token, contactId, signal } = {}) {
  ensureToken(token);
  if (!contactId) {
    throw new Error('A billing contact identifier is required to remove the record');
  }
  return httpClient.delete(`/dashboard/learner/financial/billing-contacts/${contactId}`, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function fetchSystemPreferences({ token, signal } = {}) {
  ensureToken(token);
  return httpClient.get('/dashboard/learner/settings/system', { token, signal });
}

export async function updateSystemPreferences({ token, payload, signal } = {}) {
  ensureToken(token);
  return httpClient.put('/dashboard/learner/settings/system', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function fetchFinanceSettings({ token, signal } = {}) {
  ensureToken(token);
  return httpClient.get('/dashboard/learner/settings/finance', { token, signal });
}

export async function updateFinanceSettings({ token, payload, signal } = {}) {
  ensureToken(token);
  return httpClient.put('/dashboard/learner/settings/finance', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function createFinancePurchase({ token, payload, signal } = {}) {
  ensureToken(token);
  return httpClient.post('/dashboard/learner/settings/finance/purchases', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function updateFinancePurchase({ token, purchaseId, payload, signal } = {}) {
  ensureToken(token);
  if (!purchaseId) {
    throw new Error('A finance purchase identifier is required to update the record');
  }
  return httpClient.patch(`/dashboard/learner/settings/finance/purchases/${purchaseId}`, payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function deleteFinancePurchase({ token, purchaseId, signal } = {}) {
  ensureToken(token);
  if (!purchaseId) {
    throw new Error('A finance purchase identifier is required to remove the record');
  }
  return httpClient.delete(`/dashboard/learner/settings/finance/purchases/${purchaseId}`, {
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

export async function createGrowthInitiative({ token, payload, signal } = {}) {
  ensureToken(token);
  return httpClient.post('/dashboard/learner/growth/initiatives', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function updateGrowthInitiative({ token, initiativeId, payload, signal } = {}) {
  ensureToken(token);
  if (!initiativeId) {
    throw new Error('A growth initiative identifier is required to update the record');
  }
  return httpClient.patch(`/dashboard/learner/growth/initiatives/${initiativeId}`, payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function deleteGrowthInitiative({ token, initiativeId, signal } = {}) {
  ensureToken(token);
  if (!initiativeId) {
    throw new Error('A growth initiative identifier is required to remove the record');
  }
  return httpClient.delete(`/dashboard/learner/growth/initiatives/${initiativeId}`, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function createGrowthExperiment({ token, initiativeId, payload, signal } = {}) {
  ensureToken(token);
  if (!initiativeId) {
    throw new Error('A growth initiative identifier is required to add an experiment');
  }
  return httpClient.post(
    `/dashboard/learner/growth/initiatives/${initiativeId}/experiments`,
    payload ?? {},
    {
      token,
      signal,
      invalidateTags: [`dashboard:me:${token}`]
    }
  );
}

export async function updateGrowthExperiment({
  token,
  initiativeId,
  experimentId,
  payload,
  signal
} = {}) {
  ensureToken(token);
  if (!initiativeId || !experimentId) {
    throw new Error('Both initiative and experiment identifiers are required to update the record');
  }
  return httpClient.patch(
    `/dashboard/learner/growth/initiatives/${initiativeId}/experiments/${experimentId}`,
    payload ?? {},
    {
      token,
      signal,
      invalidateTags: [`dashboard:me:${token}`]
    }
  );
}

export async function deleteGrowthExperiment({ token, initiativeId, experimentId, signal } = {}) {
  ensureToken(token);
  if (!initiativeId || !experimentId) {
    throw new Error('Both initiative and experiment identifiers are required to remove the record');
  }
  return httpClient.delete(
    `/dashboard/learner/growth/initiatives/${initiativeId}/experiments/${experimentId}`,
    {
      token,
      signal,
      invalidateTags: [`dashboard:me:${token}`]
    }
  );
}

export async function createAffiliateChannel({ token, payload, signal } = {}) {
  ensureToken(token);
  return httpClient.post('/dashboard/learner/affiliate/channels', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function updateAffiliateChannel({ token, channelId, payload, signal } = {}) {
  ensureToken(token);
  if (!channelId) {
    throw new Error('An affiliate channel identifier is required to update the record');
  }
  return httpClient.patch(`/dashboard/learner/affiliate/channels/${channelId}`, payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function deleteAffiliateChannel({ token, channelId, signal } = {}) {
  ensureToken(token);
  if (!channelId) {
    throw new Error('An affiliate channel identifier is required to remove the record');
  }
  return httpClient.delete(`/dashboard/learner/affiliate/channels/${channelId}`, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function recordAffiliatePayout({ token, channelId, payload, signal } = {}) {
  ensureToken(token);
  if (!channelId) {
    throw new Error('An affiliate channel identifier is required to record the payout');
  }
  return httpClient.post(`/dashboard/learner/affiliate/channels/${channelId}/payouts`, payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function createAdCampaign({ token, payload, signal } = {}) {
  ensureToken(token);
  return httpClient.post('/dashboard/learner/ads/campaigns', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function updateAdCampaign({ token, campaignId, payload, signal } = {}) {
  ensureToken(token);
  if (!campaignId) {
    throw new Error('An ad campaign identifier is required to update the record');
  }
  return httpClient.patch(`/dashboard/learner/ads/campaigns/${campaignId}`, payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function deleteAdCampaign({ token, campaignId, signal } = {}) {
  ensureToken(token);
  if (!campaignId) {
    throw new Error('An ad campaign identifier is required to remove the record');
  }
  return httpClient.delete(`/dashboard/learner/ads/campaigns/${campaignId}`, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
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

export async function fetchInstructorApplication({ token, signal } = {}) {
  ensureToken(token);
  return httpClient.get('/dashboard/learner/teach/application', {
    token,
    signal,
    cache: { enabled: false }
  });
}

export async function saveInstructorApplication({ token, payload, signal } = {}) {
  ensureToken(token);
  return httpClient.put('/dashboard/learner/teach/application', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function submitInstructorApplication({ token, payload, signal } = {}) {
  ensureToken(token);
  return httpClient.post('/dashboard/learner/teach/application/submit', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

function normaliseLearnerOverviewPayload(response) {
  const payload = response?.data ?? response ?? {};
  return {
    stats: payload.stats ?? {},
    recommendations: Array.isArray(payload.recommendations) ? payload.recommendations : [],
    upcoming: Array.isArray(payload.upcoming) ? payload.upcoming : [],
    alerts: Array.isArray(payload.alerts) ? payload.alerts : []
  };
}

export async function fetchLearnerOverview({ token, signal } = {}) {
  ensureToken(token);

  const response = await httpClient.get('/dashboard/learner/overview', {
    token,
    signal,
    cache: {
      ttl: 30_000,
      tags: [`dashboard:me:${token}:overview`],
      varyByToken: true
    }
  });

  return normaliseLearnerOverviewPayload(response);
}

export async function updateNotificationPreferences({ token, payload, signal } = {}) {
  ensureToken(token);

  return httpClient.put('/dashboard/learner/settings/notifications', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}`]
  });
}

export async function exportLearningPath({ token, format = 'pdf', signal } = {}) {
  ensureToken(token);

  const params = {};
  if (format) {
    params.format = format;
  }

  const binaryFormats = new Set(['pdf', 'csv']);
  const responseType = binaryFormats.has(String(format).toLowerCase()) ? 'blob' : 'json';

  return httpClient.get('/dashboard/learner/learning-path/export', {
    token,
    signal,
    params,
    responseType,
    cache: false
  });
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
  deleteBillingContact,
  joinLiveSession,
  checkInToLiveSession,
  triggerCommunityAction,
  createGrowthInitiative,
  updateGrowthInitiative,
  deleteGrowthInitiative,
  createGrowthExperiment,
  updateGrowthExperiment,
  deleteGrowthExperiment,
  createAffiliateChannel,
  updateAffiliateChannel,
  deleteAffiliateChannel,
  recordAffiliatePayout,
  createAdCampaign,
  updateAdCampaign,
  deleteAdCampaign,
  createSupportTicket,
  fetchSupportTickets,
  updateSupportTicket,
  replyToSupportTicket,
  closeSupportTicket,
  createFieldServiceAssignment,
  updateFieldServiceAssignment,
  closeFieldServiceAssignment,
  fetchInstructorApplication,
  saveInstructorApplication,
  submitInstructorApplication,
  fetchLearnerOverview,
  updateNotificationPreferences,
  exportLearningPath
};

export default learnerDashboardApi;
