import slugify from 'slugify';

import logger from '../config/logger.js';

const modelUtilsLogger = logger.child?.({ scope: 'model-utils' }) ?? logger;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function safeJsonParse(value, fallback = {}) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    modelUtilsLogger.warn(
      { error: error?.message, sample: value.slice?.(0, 120) },
      'Failed to parse JSON payload for model hydration'
    );
    return fallback;
  }
}

export function safeJsonStringify(value, fallback = '{}') {
  const normalisedFallback = typeof fallback === 'string' ? fallback : JSON.stringify(fallback ?? {});

  if (value === undefined || value === null) {
    return normalisedFallback;
  }

  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch (error) {
      modelUtilsLogger.warn(
        { error: error?.message, sample: value.slice?.(0, 120) },
        'Discarding invalid JSON string during model serialisation'
      );
      return normalisedFallback;
    }
  }

  try {
    return JSON.stringify(value);
  } catch (error) {
    modelUtilsLogger.warn(
      { error: error?.message },
      'Failed to serialise model payload to JSON'
    );
    return normalisedFallback;
  }
}

export function normaliseSlug(rawValue, { maxLength = 80, strict = true } = {}) {
  const candidate = rawValue === undefined || rawValue === null ? '' : String(rawValue);
  const condensed = slugify(candidate, {
    lower: true,
    strict: true,
    trim: true
  })
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!condensed) {
    throw new Error('Slug is required');
  }

  const slug = condensed.slice(0, maxLength).replace(/^-+|-+$/g, '');

  if (!slug) {
    throw new Error('Slug is required');
  }

  if (strict && !SLUG_PATTERN.test(slug)) {
    throw new Error(`Slug contains invalid characters: ${slug}`);
  }

  return slug;
}

export function ensureNonEmptyString(value, { fieldName = 'value', maxLength = 255 } = {}) {
  const stringValue = value === undefined || value === null ? '' : String(value).trim();

  if (!stringValue) {
    throw new Error(`${fieldName} is required`);
  }

  if (maxLength && stringValue.length > maxLength) {
    throw new Error(`${fieldName} must be at most ${maxLength} characters`);
  }

  return stringValue;
}

export function normaliseOptionalString(value, { maxLength = 255 } = {}) {
  if (value === undefined || value === null) {
    return null;
  }

  const stringValue = String(value).trim();

  if (!stringValue) {
    return null;
  }

  if (maxLength && stringValue.length > maxLength) {
    throw new Error(`Value must be at most ${maxLength} characters`);
  }

  return stringValue;
}

export function ensureIntegerInRange(
  value,
  { fieldName = 'value', min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, defaultValue = 0 } = {}
) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    throw new Error(`${fieldName} must be a finite number`);
  }

  const integer = Math.trunc(numeric);

  if (integer < min || integer > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }

  return integer;
}

export function normaliseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) {
    return Boolean(defaultValue);
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return Boolean(defaultValue);
    }
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    if (!normalised) {
      return Boolean(defaultValue);
    }
    if (['true', '1', 'yes', 'y', 'on'].includes(normalised)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalised)) {
      return false;
    }
    return Boolean(defaultValue);
  }

  return Boolean(value);
}

export function readJsonColumn(value, fallback = {}) {
  const parsed = safeJsonParse(value, fallback);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed;
  }
  return fallback;
}

export function writeJsonColumn(value, fallback = {}) {
  if (value === undefined) {
    return safeJsonStringify(fallback, fallback);
  }

  if (typeof value === 'string') {
    const parsed = safeJsonParse(value, fallback);
    return safeJsonStringify(parsed, fallback);
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return safeJsonStringify(value, fallback);
  }

  return safeJsonStringify(fallback, fallback);
}

export function readJsonArrayColumn(value, fallback = []) {
  const parsed = safeJsonParse(value, fallback);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  return fallback;
}

export function writeJsonArrayColumn(value, fallback = []) {
  if (value === undefined || value === null) {
    return safeJsonStringify(fallback, fallback);
  }

  if (Array.isArray(value)) {
    return safeJsonStringify(value, fallback);
  }

  if (typeof value === 'string') {
    const parsed = safeJsonParse(value, fallback);
    return safeJsonStringify(Array.isArray(parsed) ? parsed : fallback, fallback);
  }

  return safeJsonStringify(fallback, fallback);
}

