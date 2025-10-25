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

export function resolveHttpLogLevel({ statusCode = DEFAULT_SUCCESS_STATUS, error } = {}) {
  const errorStatusCode = extractErrorStatusCode(error);
  const finalStatusCode = errorStatusCode ?? statusCode ?? DEFAULT_SUCCESS_STATUS;

  if (finalStatusCode >= 500) {
    return 'error';
  }

  if (finalStatusCode >= 400) {
    return 'warn';
  }

  return error ? 'warn' : 'info';
}
