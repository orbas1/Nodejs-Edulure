import { httpClient } from './httpClient.js';
import {
  assertId,
  assertToken,
  createInvalidationConfig,
  createListCacheConfig
} from './apiUtils.js';

const mapResponse = (response) => response?.data ?? response ?? null;

export function listDirectMessageThreads({ token, params = {}, signal } = {}) {
  assertToken(token, 'list direct message threads');
  return httpClient
    .get('/chat/threads', {
      token,
      params,
      signal,
      cache: createListCacheConfig('direct-messages:threads', { ttl: 15_000 })
    })
    .then(mapResponse);
}

export function createDirectMessageThread({ token, payload }) {
  assertToken(token, 'create direct message thread');
  return httpClient
    .post('/chat/threads', payload, {
      token,
      cache: createInvalidationConfig('direct-messages:threads')
    })
    .then(mapResponse);
}

export function listDirectMessageMessages({ threadId, token, params = {}, signal } = {}) {
  assertToken(token, 'list direct message history');
  assertId(threadId, 'Thread id');
  return httpClient
    .get(`/chat/threads/${threadId}/messages`, {
      token,
      params,
      signal,
      cache: createListCacheConfig(`direct-messages:threads:${threadId}:messages`, { ttl: 5_000 })
    })
    .then(mapResponse);
}

export function sendDirectMessage({ threadId, token, payload }) {
  assertToken(token, 'send direct message');
  assertId(threadId, 'Thread id');
  return httpClient
    .post(`/chat/threads/${threadId}/messages`, payload, {
      token,
      cache: createInvalidationConfig(`direct-messages:threads:${threadId}:messages`)
    })
    .then(mapResponse);
}

export function markDirectMessageThreadRead({ threadId, token, payload = {} }) {
  assertToken(token, 'mark direct message thread read');
  assertId(threadId, 'Thread id');
  return httpClient
    .post(`/chat/threads/${threadId}/read`, payload, {
      token,
      cache: createInvalidationConfig(`direct-messages:threads:${threadId}:messages`)
    })
    .then(mapResponse);
}
