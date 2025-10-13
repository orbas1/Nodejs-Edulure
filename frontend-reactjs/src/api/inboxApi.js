import { httpClient } from './httpClient.js';

export async function fetchThreads({ token, signal } = {}) {
  return httpClient.get('/chat/threads', { token, signal });
}

export async function fetchThreadMessages(threadId, { token, signal, limit, before, after } = {}) {
  return httpClient.get(`/chat/threads/${threadId}/messages`, {
    token,
    signal,
    params: { limit, before, after }
  });
}

export async function sendThreadMessage(threadId, payload, { token } = {}) {
  return httpClient.post(`/chat/threads/${threadId}/messages`, payload, { token });
}

export async function markThreadRead(threadId, payload = {}, { token } = {}) {
  return httpClient.post(`/chat/threads/${threadId}/read`, payload, { token });
}

