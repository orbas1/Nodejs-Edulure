import { httpClient } from './httpClient.js';

export function fetchCoursePlayer(courseId, { token, signal } = {}) {
  return httpClient.get(`/courses/${courseId}/player`, { token, signal });
}

export function fetchCourseLiveStatus(courseId, { token, signal } = {}) {
  return httpClient.get(`/courses/${courseId}/live`, { token, signal });
}

export function fetchCourseLiveChat(courseId, { token, signal, limit } = {}) {
  return httpClient.get(`/courses/${courseId}/live/chat`, { token, signal, params: { limit } });
}

export function postCourseLiveChat(courseId, payload, { token } = {}) {
  return httpClient.post(`/courses/${courseId}/live/chat`, payload, { token });
}

