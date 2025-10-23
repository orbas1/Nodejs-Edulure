import { httpClient } from './httpClient.js';

export async function fetchPasswordPolicy() {
  const response = await httpClient.get('/auth/password-policy');
  return response?.data ?? {};
}
