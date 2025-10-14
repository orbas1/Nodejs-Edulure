import { randomUUID } from 'node:crypto';

import logger from '../config/logger.js';
import { env } from '../config/env.js';
import { recordUnhandledException } from '../observability/metrics.js';

export function createRouteErrorBoundary({
  loggerInstance = logger,
  scope = 'api-route',
  includeStack = !env.isProduction,
  defaultStatus = 500
} = {}) {
  const boundaryLogger = loggerInstance.child?.({ scope }) ?? loggerInstance;

  return function routeErrorBoundary(err, req, res, next) {
    if (!err) {
      return next();
    }

    const status = Number.isInteger(err.status) ? err.status : defaultStatus;
    const correlationId = err.correlationId ?? randomUUID();
    const path = req.originalUrl ?? req.url ?? 'unknown';
    const featureFlags = req.activeFeatureFlags ?? undefined;

    boundaryLogger.error(
      {
        err,
        status,
        path,
        correlationId,
        featureFlags,
        method: req.method
      },
      'Route error captured by boundary'
    );

    recordUnhandledException(err);

    if (res.headersSent) {
      return next(err);
    }

    const message =
      status >= 500 && env.isProduction
        ? 'An unexpected error occurred while processing this request.'
        : err.message ?? 'Request failed.';

    const response = {
      success: false,
      code: err.code ?? 'route_error',
      message,
      correlationId
    };

    if (err.details && (Array.isArray(err.details) || typeof err.details === 'object')) {
      response.details = err.details;
    }

    if (includeStack && err.stack) {
      response.stack = err.stack;
    }

    return res.status(status).json(response);
  };
}

export default createRouteErrorBoundary;
