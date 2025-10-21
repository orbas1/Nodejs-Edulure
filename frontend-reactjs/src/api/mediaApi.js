import { httpClient } from './httpClient.js';

function ensureUploadPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('A payload is required to request a media upload session');
  }
  if (!payload.filename) {
    throw new Error('A filename is required to request a media upload session');
  }
  if (!payload.mimeType) {
    throw new Error('A MIME type is required to request a media upload session');
  }
  if (typeof payload.size !== 'number') {
    throw new Error('A file size must be provided to request a media upload session');
  }

  return payload;
}

export function requestMediaUpload({ token, payload, signal } = {}) {
  const body = ensureUploadPayload(payload);

  return httpClient
    .post('/media/uploads', body, {
      token,
      signal
    })
    .then((response) => response?.data ?? null);
}

export function completeMediaUpload({ token, uploadId, payload, signal } = {}) {
  if (!uploadId) {
    throw new Error('An upload identifier is required to complete the upload');
  }

  return httpClient.post(`/media/uploads/${encodeURIComponent(uploadId)}/complete`, payload ?? {}, {
    token,
    signal,
    invalidateTags: [`media:upload:${uploadId}`]
  });
}

export function pollMediaUploadStatus({ token, uploadId, signal } = {}) {
  if (!uploadId) {
    throw new Error('An upload identifier is required to check the status');
  }

  return httpClient.get(`/media/uploads/${encodeURIComponent(uploadId)}/status`, {
    token,
    signal,
    cache: {
      ttl: 5_000,
      tags: [`media:upload:${uploadId}:status`],
      varyByToken: true
    }
  });
}

export function cancelMediaUpload({ token, uploadId, reason, signal } = {}) {
  if (!uploadId) {
    throw new Error('An upload identifier is required to cancel the upload');
  }

  return httpClient.post(
    `/media/uploads/${encodeURIComponent(uploadId)}/cancel`,
    reason ? { reason } : {},
    {
      token,
      signal,
      invalidateTags: [`media:upload:${uploadId}`]
    }
  );
}

export default {
  requestMediaUpload,
  completeMediaUpload,
  pollMediaUploadStatus,
  cancelMediaUpload
};
