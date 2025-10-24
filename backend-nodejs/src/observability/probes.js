import express from 'express';

const DEFAULT_LIVENESS_TIMEOUT_MS = 750;
const DEFAULT_READINESS_TIMEOUT_MS = 1500;
const ALLOWED_METHODS = 'GET,HEAD,OPTIONS';

function toServiceName(candidate) {
  if (typeof candidate !== 'string') {
    return 'service';
  }

  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : 'service';
}

function normaliseOrigins(origins) {
  if (!origins) {
    return [];
  }

  if (typeof origins === 'string') {
    return origins
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (Array.isArray(origins)) {
    return origins
      .map((value) => (typeof value === 'string' ? value.trim() : null))
      .filter(Boolean);
  }

  return [];
}

function applyCorsHeaders(req, res, { allowedOrigins, allowCredentials, allowedHeaders }) {
  if (!allowedOrigins.length) {
    return;
  }

  const origin = req.headers.origin;
  if (!origin) {
    return;
  }

  if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    return;
  }

  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.setHeader('Access-Control-Allow-Headers', allowedHeaders);

  if (allowCredentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}

function applySecurityHeaders(req, res) {
  if (!res.getHeader('Content-Type')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
}

function buildTimeoutPromise(timeoutMs, label) {
  if (!timeoutMs || timeoutMs <= 0) {
    return { promise: null, cancel: () => {} };
  }

  let timeoutId;
  const promise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(`${label} check timed out after ${timeoutMs}ms`);
      error.code = 'ETIMEDOUT';
      reject(error);
    }, timeoutMs);
  });

  return {
    promise,
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };
}

async function runProbe(check, { timeoutMs, label }) {
  const timeout = buildTimeoutPromise(timeoutMs, label);

  try {
    if (timeout.promise) {
      return await Promise.race([Promise.resolve(check()), timeout.promise]);
    }

    return await Promise.resolve(check());
  } finally {
    timeout.cancel();
  }
}

function interpretFlag(result, key, fallback) {
  if (typeof result === 'boolean') {
    return result;
  }

  if (result && typeof result === 'object') {
    if (typeof result[key] === 'boolean') {
      return result[key];
    }

    if (typeof result.ok === 'boolean') {
      return result.ok;
    }

    if (typeof result.healthy === 'boolean') {
      return result.healthy;
    }
  }

  return fallback;
}

function sanitiseResult(result) {
  if (!result || typeof result !== 'object') {
    return {};
  }

  const payload = { ...result };
  delete payload.alive;
  delete payload.ready;
  delete payload.status;
  delete payload.service;
  delete payload.checkedAt;
  return payload;
}

function respond(res, payload, statusCode, isHead) {
  res.status(statusCode);
  if (isHead) {
    res.end();
  } else {
    res.json(payload);
  }
}

function createProbeHandler({
  serviceName,
  check,
  key,
  successStatus,
  failureStatus,
  timeoutMs,
  fallbackValue
}) {
  return async (req, res) => {
    const headRequest = req.method === 'HEAD';
    try {
      const result = await runProbe(check, { timeoutMs, label: key });
      const flag = interpretFlag(result, key, fallbackValue);
      const payload = {
        service: serviceName,
        checkedAt: new Date().toISOString(),
        [key]: flag,
        status: flag ? successStatus : failureStatus,
        ...sanitiseResult(result)
      };
      respond(res, payload, flag ? 200 : failureStatus === 'down' ? 500 : 503, headRequest);
    } catch (error) {
      const payload = {
        service: serviceName,
        checkedAt: new Date().toISOString(),
        [key]: false,
        status: failureStatus,
        error: error?.message ?? String(error)
      };
      const statusCode = error?.code === 'ETIMEDOUT' ? 504 : failureStatus === 'down' ? 500 : 503;
      respond(res, payload, statusCode, headRequest);
    }
  };
}

export function createProbeApp({
  service,
  readinessCheck,
  livenessCheck,
  cors = {},
  readinessTimeoutMs = DEFAULT_READINESS_TIMEOUT_MS,
  livenessTimeoutMs = DEFAULT_LIVENESS_TIMEOUT_MS
} = {}) {
  if (typeof readinessCheck !== 'function') {
    throw new Error('createProbeApp requires a readinessCheck function.');
  }

  const serviceName = toServiceName(service);
  const resolvedLivenessCheck = typeof livenessCheck === 'function' ? livenessCheck : () => ({ alive: true });
  const allowedOrigins = normaliseOrigins(cors.allowedOrigins ?? cors.origins ?? cors.origin);
  const allowCredentials = Boolean(cors.allowCredentials);
  const allowedHeaders =
    typeof cors.allowedHeaders === 'string' && cors.allowedHeaders.trim().length > 0
      ? cors.allowedHeaders
      : 'Content-Type, Authorization';

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);

  app.use((req, res, next) => {
    applySecurityHeaders(req, res);
    applyCorsHeaders(req, res, { allowedOrigins, allowCredentials, allowedHeaders });

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      res.setHeader('Allow', ALLOWED_METHODS);
      return respond(
        res,
        {
          service: serviceName,
          checkedAt: new Date().toISOString(),
          status: 'method_not_allowed'
        },
        405,
        req.method === 'HEAD'
      );
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    return next();
  });

  const liveHandler = createProbeHandler({
    serviceName,
    check: resolvedLivenessCheck,
    key: 'alive',
    successStatus: 'alive',
    failureStatus: 'down',
    timeoutMs: livenessTimeoutMs,
    fallbackValue: true
  });

  const readyHandler = createProbeHandler({
    serviceName,
    check: readinessCheck,
    key: 'ready',
    successStatus: 'ready',
    failureStatus: 'not_ready',
    timeoutMs: readinessTimeoutMs,
    fallbackValue: false
  });

  const summaryHandler = async (req, res) => {
    const headRequest = req.method === 'HEAD';
    try {
      const [liveResult, readyResult] = await Promise.all([
        runProbe(resolvedLivenessCheck, { timeoutMs: livenessTimeoutMs, label: 'alive' }),
        runProbe(readinessCheck, { timeoutMs: readinessTimeoutMs, label: 'ready' })
      ]);
      const alive = interpretFlag(liveResult, 'alive', true);
      const ready = interpretFlag(readyResult, 'ready', false);
      const status = ready ? 'ready' : alive ? 'degraded' : 'down';
      const payload = {
        service: serviceName,
        checkedAt: new Date().toISOString(),
        status,
        alive,
        ready,
        liveness: {
          status: alive ? 'alive' : 'down',
          ...sanitiseResult(liveResult)
        },
        readiness: {
          status: ready ? 'ready' : 'not_ready',
          ...sanitiseResult(readyResult)
        }
      };
      const statusCode = ready ? 200 : alive ? 503 : 500;
      respond(res, payload, statusCode, headRequest);
    } catch (error) {
      const payload = {
        service: serviceName,
        checkedAt: new Date().toISOString(),
        status: 'unknown',
        error: error?.message ?? String(error)
      };
      respond(res, payload, 500, headRequest);
    }
  };

  app.get('/live', liveHandler);
  app.head('/live', liveHandler);

  app.get('/ready', readyHandler);
  app.head('/ready', readyHandler);

  app.get('/', summaryHandler);
  app.head('/', summaryHandler);
  app.get('/status', summaryHandler);
  app.head('/status', summaryHandler);

  return app;
}
