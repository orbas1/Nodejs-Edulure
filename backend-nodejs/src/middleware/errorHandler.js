import logger from '../config/logger.js';
import { env } from '../config/env.js';

// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, _req, res, _next) {
  const status = Number.isInteger(err.status) ? err.status : 500;
  const response = {
    success: false,
    message:
      status >= 500 && env.isProduction
        ? 'An unexpected error occurred. Please try again later.'
        : err.message || 'Internal server error',
    code: err.code ?? undefined,
    errors: err.details ?? undefined
  };

  if (!env.isProduction && err.stack) {
    response.stack = err.stack;
  }

  logger.error({ err, status }, 'Unhandled error');
  res.status(status).json(response);
}
