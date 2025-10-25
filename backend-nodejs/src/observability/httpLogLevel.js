const DEFAULT_SUCCESS_STATUS = 200;

function normaliseStatusCode(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function isHealthCheckRoute(request) {
  if (!request || typeof request !== 'object') {
    return false;
  }

  const url =
    typeof request.originalUrl === 'string'
      ? request.originalUrl
      : typeof request.url === 'string'
        ? request.url
        : null;

  if (!url) {
    return false;
  }

  return url === '/health' || url.startsWith('/health?');
}

function extractErrorStatusCode(error) {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const candidates = [error.statusCode, error.status, error.code];

  for (const candidate of candidates) {
    const statusCode = normaliseStatusCode(candidate);
    if (statusCode !== undefined) {
      return statusCode;
    }
  }

  return undefined;
}

export function resolveHttpLogLevel({ req, statusCode = DEFAULT_SUCCESS_STATUS, error } = {}) {
  const normalisedStatusCode = normaliseStatusCode(statusCode);
  const errorStatusCode = extractErrorStatusCode(error);
  const finalStatusCode =
    errorStatusCode ?? normalisedStatusCode ?? DEFAULT_SUCCESS_STATUS;

  if (!error && finalStatusCode < 500 && isHealthCheckRoute(req)) {
    return 'silent';
  }

  if (finalStatusCode >= 500) {
    return 'error';
  }

  if (finalStatusCode >= 400) {
    return 'warn';
  }

  return error ? 'warn' : 'info';
}
