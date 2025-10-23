import { httpClient } from './httpClient.js';

function ensureToken(token) {
  if (!token) {
    throw new Error('Authentication token is required to manage learner settings');
  }
}

function normaliseResponse(payload) {
  if (!payload || typeof payload !== 'object') {
    return { personalisation: {}, notifications: {}, security: {} };
  }

  if (payload.data && typeof payload.data === 'object') {
    return normaliseResponse(payload.data);
  }

  return {
    personalisation: payload.personalisation ?? payload.preferences ?? {},
    notifications: payload.notifications ?? payload.communication ?? {},
    security: payload.security ?? payload.auth ?? {}
  };
}

export async function fetchPersonalisationSettings({ token, signal } = {}) {
  ensureToken(token);
  const response = await httpClient.get('/dashboard/learner/settings/personalisation', {
    token,
    signal,
    cache: { ttl: 30_000, tags: [`dashboard:me:${token}:settings`] }
  });
  return normaliseResponse(response);
}

export async function updatePersonalisationSettings({ token, payload, signal } = {}) {
  ensureToken(token);
  return httpClient.put('/dashboard/learner/settings/personalisation', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}:settings`]
  });
}

export async function updateNotificationSettings({ token, payload, signal } = {}) {
  ensureToken(token);
  return httpClient.put('/dashboard/learner/settings/notifications', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}:settings`]
  });
}

export async function updateSecuritySettings({ token, payload, signal } = {}) {
  ensureToken(token);
  return httpClient.put('/dashboard/learner/settings/security', payload ?? {}, {
    token,
    signal,
    invalidateTags: [`dashboard:me:${token}:settings`]
  });
}
