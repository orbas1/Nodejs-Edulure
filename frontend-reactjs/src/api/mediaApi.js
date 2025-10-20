import { httpClient } from './httpClient.js';

export function requestMediaUpload({ token, payload, signal } = {}) {
  if (!payload?.filename) {
    throw new Error('A filename is required to request a media upload session');
  }
  if (!payload?.mimeType) {
    throw new Error('A MIME type is required to request a media upload session');
  }
  if (typeof payload.size !== 'number') {
    throw new Error('A file size must be provided to request a media upload session');
  }

  return httpClient
    .post('/media/uploads', payload, {
      token,
      signal
    })
    .then((response) => response?.data ?? null);
}

export default {
  requestMediaUpload
};
