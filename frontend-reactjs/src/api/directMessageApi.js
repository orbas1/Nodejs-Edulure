import { httpClient } from './httpClient.js';
import {
  assertId,
  assertToken,
  createInvalidationConfig,
  createListCacheConfig
} from './apiUtils.js';

const toIso = (value) => (value ? new Date(value).toISOString() : undefined);

const mapResponse = (response) => ({
  data: response?.data ?? null,
  meta: response?.meta ?? null,
  message: response?.message ?? null
});

export async function createDirectThread({ token, payload, signal } = {}) {
  assertToken(token, 'create a direct message thread');
  const response = await httpClient.post('/chat/threads', payload ?? {}, {
    token,
    signal,
    cache: createInvalidationConfig(['chat:threads'])
  });
  return mapResponse(response);
}

export async function listDirectMessages({
  token,
  threadId,
  limit = 50,
  before,
  after,
  signal
} = {}) {
  assertToken(token, 'list direct messages');
  assertId(threadId, 'Thread id');
  const response = await httpClient.get(`/chat/threads/${threadId}/messages`, {
    token,
    signal,
    params: {
      limit,
      before: toIso(before),
      after: toIso(after)
    },
    cache: createListCacheConfig(`chat:threads:${threadId}:messages`, { ttl: 5_000 })
  });
  return mapResponse(response);
}

export async function sendDirectMessage({ token, threadId, payload, signal } = {}) {
  assertToken(token, 'send a direct message');
  assertId(threadId, 'Thread id');
  const response = await httpClient.post(`/chat/threads/${threadId}/messages`, payload ?? {}, {
    token,
    signal,
    cache: createInvalidationConfig([`chat:threads:${threadId}:messages`, 'chat:threads'])
  });
  return mapResponse(response);
}

export async function markDirectThreadRead({ token, threadId, messageId, timestamp, signal } = {}) {
  assertToken(token, 'mark direct message thread read');
  assertId(threadId, 'Thread id');
  const response = await httpClient.post(
    `/chat/threads/${threadId}/read`,
    {
      messageId: messageId ? Number(messageId) : undefined,
      timestamp: toIso(timestamp)
    },
    {
      token,
      signal,
      cache: createInvalidationConfig([`chat:threads:${threadId}:messages`, 'chat:threads'])
    }
  );
  return mapResponse(response);
}

