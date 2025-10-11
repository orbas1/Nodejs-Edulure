import { randomUUID } from 'crypto';

import { env } from '../config/env.js';
import { createRequestContext, runWithRequestContext } from '../observability/requestContext.js';

function isValidTraceId(value) {
  return typeof value === 'string' && value.trim().length >= 16 && value.trim().length <= 128;
}

export default function requestContextMiddleware(req, res, next) {
  const headerName = env.observability.tracing.headerName;
  const forwardedTraceHeader = req.headers[headerName];
  const candidateTraceId = Array.isArray(forwardedTraceHeader)
    ? forwardedTraceHeader[0]
    : forwardedTraceHeader;

  const traceId = isValidTraceId(candidateTraceId) ? candidateTraceId : randomUUID();
  const spanId = randomUUID().replace(/-/g, '').slice(0, 16);

  req.id = traceId;
  req.traceId = traceId;
  req.spanId = spanId;
  res.setHeader(headerName, traceId);

  const context = createRequestContext({
    traceId,
    spanId,
    ip: req.ip,
    method: req.method,
    path: req.originalUrl
  });

  runWithRequestContext(context, next);
}
