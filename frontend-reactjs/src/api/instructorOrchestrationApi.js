import { httpClient } from './httpClient.js';

export function generateCourseOutline({ token, payload } = {}) {
  return httpClient
    .post('/instructor/orchestration/course-outline', payload ?? {}, { token })
    .then((response) => response.data);
}

export function importFromNotion({ token, payload } = {}) {
  return httpClient
    .post('/instructor/orchestration/notion-import', payload ?? {}, { token })
    .then((response) => response.data);
}

export function syncFromLms({ token, payload } = {}) {
  return httpClient
    .post('/instructor/orchestration/lms-sync', payload ?? {}, { token })
    .then((response) => response.data);
}

export function routeTutorRequest({ token, payload } = {}) {
  return httpClient
    .post('/instructor/orchestration/tutor-routing', payload ?? {}, { token })
    .then((response) => response.data);
}

export function sendMentorInvite({ token, payload } = {}) {
  return httpClient
    .post('/instructor/orchestration/mentor-invite', payload ?? {}, { token })
    .then((response) => response.data);
}

export function exportPricing({ token, payload } = {}) {
  return httpClient
    .post('/instructor/orchestration/pricing-export', payload ?? {}, { token })
    .then((response) => response.data);
}
