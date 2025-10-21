import { httpClient } from './httpClient.js';

function buildRequestOptions({ token, signal, idempotencyKey } = {}) {
  const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
  return {
    token,
    signal,
    headers,
    cache: false
  };
}

async function postOrchestrationAction(endpoint, { token, payload, signal, idempotencyKey } = {}) {
  const body = payload ?? {};
  const response = await httpClient.post(endpoint, body, buildRequestOptions({ token, signal, idempotencyKey }));
  return response?.data ?? response;
}

export function generateCourseOutline(options = {}) {
  return postOrchestrationAction('/instructor/orchestration/course-outline', options);
}

export function importFromNotion(options = {}) {
  return postOrchestrationAction('/instructor/orchestration/notion-import', options);
}

export function syncFromLms(options = {}) {
  return postOrchestrationAction('/instructor/orchestration/lms-sync', options);
}

export function routeTutorRequest(options = {}) {
  return postOrchestrationAction('/instructor/orchestration/tutor-routing', options);
}

export function sendMentorInvite(options = {}) {
  return postOrchestrationAction('/instructor/orchestration/mentor-invite', options);
}

export function exportPricing(options = {}) {
  return postOrchestrationAction('/instructor/orchestration/pricing-export', options);
}

export function simulateCurriculumAudit(options = {}) {
  return postOrchestrationAction('/instructor/orchestration/curriculum-audit', options);
}

export function scheduleWorkshopRun(options = {}) {
  return postOrchestrationAction('/instructor/orchestration/workshops/schedule', options);
}

export function cancelWorkshopRun({ workshopId, ...options } = {}) {
  if (!workshopId || (typeof workshopId === 'string' && !workshopId.trim())) {
    throw new Error('A workshop identifier is required to cancel a run.');
  }

  const endpoint = `/instructor/orchestration/workshops/${encodeURIComponent(String(workshopId).trim())}/cancel`;
  return postOrchestrationAction(endpoint, options);
}

export const instructorOrchestrationApi = {
  generateCourseOutline,
  importFromNotion,
  syncFromLms,
  routeTutorRequest,
  sendMentorInvite,
  exportPricing,
  simulateCurriculumAudit,
  scheduleWorkshopRun,
  cancelWorkshopRun
};

export default instructorOrchestrationApi;
