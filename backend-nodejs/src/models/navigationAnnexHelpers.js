import { safeJsonParse } from '../utils/modelUtils.js';

export function normaliseRoleScope(value) {
  if (!value) {
    return [];
  }
  const parsed = safeJsonParse(value, []);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : null))
    .filter(Boolean);
}

export function normaliseStringArray(value) {
  if (!value) {
    return [];
  }
  const parsed = safeJsonParse(value, []);
  if (Array.isArray(parsed)) {
    return parsed
      .map((entry) => (typeof entry === 'string' ? entry.trim() : null))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

export function ensureTinyInt(value, fallback = 0) {
  if (value === null || value === undefined) {
    return fallback;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  const clamped = Math.max(0, Math.min(255, Math.round(numeric)));
  return clamped;
}
