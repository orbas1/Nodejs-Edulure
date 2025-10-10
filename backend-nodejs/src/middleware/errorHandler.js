import logger from '../config/logger.js';

export default function errorHandler(err, _req, res, _next) {
  logger.error({ err }, 'Unhandled error');
  const status = err.status ?? 500;
  res.status(status).json({
    message: err.message ?? 'Internal server error',
    details: err.details ?? undefined
  });
}
