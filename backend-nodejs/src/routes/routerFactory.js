import { Router } from 'express';

import { env } from '../config/env.js';
import { createCorsMiddleware } from '../config/corsPolicy.js';

const DEFAULT_ALLOWED_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

function normaliseMethods(methods) {
  if (!Array.isArray(methods) || methods.length === 0) {
    return DEFAULT_ALLOWED_METHODS;
  }

  const unique = new Set();
  for (const method of methods) {
    if (typeof method !== 'string') {
      continue;
    }

    const trimmed = method.trim().toUpperCase();
    if (trimmed.length === 0) {
      continue;
    }

    unique.add(trimmed);
  }

  if (unique.size === 0) {
    return DEFAULT_ALLOWED_METHODS;
  }

  if (!unique.has('OPTIONS')) {
    unique.add('OPTIONS');
  }

  return Array.from(unique);
}

function buildSecurityHeadersMiddleware() {
  return function applySecurityHeaders(_req, res, next) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.append('Vary', 'Origin');
    next();
  };
}

export function createApiRouter(rawOptions = {}) {
  const runtimeEnv = env ?? {};
  const {
    allowedOrigins,
    allowedMethods,
    allowCredentials = true,
    allowedHeaders,
    exposedHeaders = ['content-type', 'content-length', 'x-request-id', 'x-correlation-id'],
    maxAgeSeconds = 600,
    preflightContinue = false,
    allowDevelopmentOrigins
  } = rawOptions;

  const effectiveOrigins =
    allowedOrigins ??
    runtimeEnv.app?.corsOrigins ??
    process.env.CORS_ALLOWED_ORIGINS ??
    [];

  const allowDevOrigins =
    typeof allowDevelopmentOrigins === 'boolean'
      ? allowDevelopmentOrigins
      : runtimeEnv.isProduction !== undefined
        ? !runtimeEnv.isProduction
        : process.env.NODE_ENV !== 'production';

  const methods = normaliseMethods(allowedMethods);
  const router = Router({ mergeParams: true });

  const { middleware: corsMiddleware } = createCorsMiddleware(effectiveOrigins, {
    policyOptions: { allowDevelopmentOrigins: allowDevOrigins },
    credentials: allowCredentials,
    methods: methods.join(','),
    allowedHeaders,
    exposedHeaders,
    maxAge: maxAgeSeconds,
    preflightContinue,
    optionsSuccessStatus: 204
  });

  router.use(buildSecurityHeadersMiddleware());
  router.use(corsMiddleware);
  router.options('*', corsMiddleware);

  return router;
}

export default createApiRouter;
