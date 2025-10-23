import { httpClient } from './httpClient.js';
import { assertToken } from './apiUtils.js';

function buildUploadPayload({ file, kind, visibility }) {
  if (!file) {
    throw new Error('A file is required to request an upload');
  }
  const payload = {
    kind: kind ?? 'image',
    filename: file.name ?? 'upload',
    mimeType: file.type || 'application/octet-stream',
    size: file.size ?? 0
  };
  if (visibility) {
    payload.visibility = visibility;
  }
  return payload;
}

export async function requestMediaUpload({ token, file, kind = 'image', visibility }) {
  assertToken(token, 'request a media upload');
  const payload = buildUploadPayload({ file, kind, visibility });
  const response = await httpClient.post('/media/uploads', payload, { token });
  return response?.data?.data ?? response?.data ?? response;
}

export async function performDirectUpload({ upload, file }) {
  if (!upload?.url) {
    throw new Error('Upload URL is required');
  }
  const method = upload.method ?? 'PUT';
  const headers = upload.headers ?? { 'Content-Type': file.type || 'application/octet-stream' };
  const result = await fetch(upload.url, {
    method,
    headers,
    body: file
  });
  if (!result.ok) {
    const error = new Error('Failed to upload media asset');
    error.status = result.status;
    throw error;
  }
  return result;
}
