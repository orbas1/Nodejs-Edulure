import { constants } from 'http2';

const RELEASE_CHECK_HEADER = 'x-release-check';
const LOAD_PROBE_VALUE = 'load-probe';

function normaliseHeaderValue(value) {
  if (value == null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.find((entry) => typeof entry === 'string')?.toLowerCase();
  }

  if (typeof value === 'string') {
    return value.toLowerCase();
  }

  return String(value).toLowerCase();
}

function isSuccessful(statusCode) {
  if (typeof statusCode !== 'number') {
    return false;
  }

  return statusCode >= 200 && statusCode < 400;
}

export function isReleaseReadinessProbe(req) {
  if (!req || typeof req !== 'object') {
    return false;
  }

  const headerValue = normaliseHeaderValue(req.headers?.[RELEASE_CHECK_HEADER]);
  return headerValue === LOAD_PROBE_VALUE;
}

export function determineHttpLogLevel(req, res, err) {
  if (err) {
    return 'error';
  }

  const statusCode = res?.statusCode;

  if (typeof statusCode === 'number' && statusCode >= constants.HTTP_STATUS_INTERNAL_SERVER_ERROR) {
    return 'error';
  }

  if (typeof statusCode === 'number' && statusCode >= constants.HTTP_STATUS_BAD_REQUEST) {
    return 'warn';
  }

  if (isReleaseReadinessProbe(req) && isSuccessful(statusCode)) {
    return 'debug';
  }

  return 'info';
}

export default determineHttpLogLevel;
