import { httpClient } from './httpClient.js';
import { assertId, assertToken, createInvalidationConfig, createListCacheConfig } from './apiUtils.js';

export function fetchCoursePlayer(courseId, { token, signal } = {}) {
  assertToken(token, 'load course player');
  assertId(courseId, 'Course id');
  return httpClient.get(`/courses/${courseId}/player`, {
    token,
    signal,
    cache: createListCacheConfig(`course:${courseId}:player`, { ttl: 15_000 })
  });
}

export function fetchCourseLiveStatus(courseId, { token, signal } = {}) {
  assertToken(token, 'load course live status');
  assertId(courseId, 'Course id');
  return httpClient.get(`/courses/${courseId}/live`, {
    token,
    signal,
    cache: createListCacheConfig(`course:${courseId}:live`, { ttl: 10_000 })
  });
}

export function fetchCourseLiveChat(courseId, { token, signal, limit } = {}) {
  assertToken(token, 'load course live chat');
  assertId(courseId, 'Course id');
  return httpClient.get(`/courses/${courseId}/live/chat`, {
    token,
    signal,
    params: { limit },
    cache: createListCacheConfig(`course:${courseId}:live:chat`, { ttl: 5_000 })
  });
}

export function postCourseLiveChat(courseId, payload, { token } = {}) {
  assertToken(token, 'send course live chat messages');
  assertId(courseId, 'Course id');
  return httpClient.post(`/courses/${courseId}/live/chat`, payload, {
    token,
    cache: createInvalidationConfig(`course:${courseId}:live:chat`)
  });
}

export function fetchCourseProgress(courseId, { token, signal } = {}) {
  assertToken(token, 'load course progress');
  assertId(courseId, 'Course id');
  return httpClient.get(`/courses/${courseId}/progress`, {
    token,
    signal,
    cache: createListCacheConfig(`course:${courseId}:progress`, { ttl: 5_000 })
  });
}

export function updateCourseLessonProgress(courseId, lessonSlug, payload, { token } = {}) {
  assertToken(token, 'update course progress');
  assertId(courseId, 'Course id');
  if (!lessonSlug) {
    throw new Error('Lesson slug is required');
  }
  return httpClient.post(`/courses/${courseId}/progress/lessons/${lessonSlug}`, payload, {
    token,
    cache: createInvalidationConfig(`course:${courseId}:progress`)
  });
}

