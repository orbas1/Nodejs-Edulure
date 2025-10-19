import { httpClient } from './httpClient.js';

export async function fetchCurrentUser({ token, signal } = {}) {
  return httpClient.get('/users/me', {
    token,
    signal,
    cache: { tags: ['user:me'], ttl: 30_000 }
  });
}
