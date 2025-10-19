import { httpClient } from './httpClient.js';

export async function fetchCurrentUser({ token, signal } = {}) {
  return httpClient.get('/users/me', {
    token,
    signal,
    cache: { tags: ['user:me'], ttl: 30_000 }
  });
}

export async function updateCurrentUser({ token, payload, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to update profile');
  }

  return httpClient.put('/users/me', payload ?? {}, {
    token,
    signal,
    cache: { enabled: false },
    invalidateTags: ['user:me']
  });
}
