import logger from '../config/logger.js';

const modelUtilsLogger = logger.child?.({ scope: 'model-utils' }) ?? logger;

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

