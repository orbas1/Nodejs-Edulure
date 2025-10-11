import onFinished from 'on-finished';
import * as promClient from 'prom-client';
import ipaddr from 'ipaddr.js';

import { env } from '../config/env.js';
import { getRequestContext } from './requestContext.js';

const registry = new promClient.Registry();
export const metricsRegistry = registry;
registry.setDefaultLabels({
  service: env.logging.serviceName,
  environment: env.nodeEnv
});

promClient.collectDefaultMetrics({
  register: registry,
  prefix: 'edulure_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 0.5, 1, 2]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'edulure_http_requests_total',
  help: 'Count of HTTP requests received',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDurationSeconds = new promClient.Histogram({
  name: 'edulure_http_request_duration_seconds',
  help: 'Duration histogram for completed HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10]
});

const httpActiveRequests = new promClient.Gauge({
  name: 'edulure_http_active_requests',
  help: 'Number of in-flight HTTP requests',
  labelNames: ['route']
});

const httpRequestErrors = new promClient.Counter({
  name: 'edulure_http_request_errors_total',
  help: 'Count of HTTP responses with error status codes (>=500)',
  labelNames: ['method', 'route', 'status_code']
});

const storageOperationDurationSeconds = new promClient.Histogram({
  name: 'edulure_storage_operation_duration_seconds',
  help: 'Duration histogram for R2 storage operations',
  labelNames: ['operation', 'visibility', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

const storageOperationsInFlight = new promClient.Gauge({
  name: 'edulure_storage_operations_in_flight',
  help: 'Number of active R2 storage operations',
  labelNames: ['operation']
});

const storageTransferredBytes = new promClient.Histogram({
  name: 'edulure_storage_transferred_bytes',
  help: 'Histogram of payload sizes processed by storage operations',
  labelNames: ['operation', 'visibility', 'status'],
  buckets: [1024, 8192, 32768, 131072, 524288, 1048576, 5242880, 10485760, 52428800]
});

const antivirusScanDurationSeconds = new promClient.Histogram({
  name: 'edulure_antivirus_scan_duration_seconds',
  help: 'Duration histogram for antivirus scans',
  labelNames: ['status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 20, 30]
});

const antivirusScanBytes = new promClient.Histogram({
  name: 'edulure_antivirus_scan_bytes',
  help: 'Histogram of bytes inspected by antivirus scans',
  labelNames: ['status'],
  buckets: [1024, 4096, 8192, 32768, 131072, 524288, 1048576, 5242880, 10485760, 52428800, 104857600]
});

const antivirusDetectionsTotal = new promClient.Counter({
  name: 'edulure_antivirus_detections_total',
  help: 'Count of antivirus detections grouped by signature and bucket source',
  labelNames: ['signature', 'bucket']
});

const unhandledExceptionsTotal = new promClient.Counter({
  name: 'edulure_unhandled_exceptions_total',
  help: 'Number of unhandled errors returned to clients',
  labelNames: ['type']
});

registry.registerMetric(httpRequestsTotal);
registry.registerMetric(httpRequestDurationSeconds);
registry.registerMetric(httpActiveRequests);
registry.registerMetric(httpRequestErrors);
registry.registerMetric(storageOperationDurationSeconds);
registry.registerMetric(storageOperationsInFlight);
registry.registerMetric(storageTransferredBytes);
registry.registerMetric(antivirusScanDurationSeconds);
registry.registerMetric(antivirusScanBytes);
registry.registerMetric(antivirusDetectionsTotal);
registry.registerMetric(unhandledExceptionsTotal);

function normalizeRoute(req) {
  if (req.route?.path) {
    return req.baseUrl ? `${req.baseUrl}${req.route.path}` : req.route.path;
  }
  if (req.originalUrl) {
    return req.originalUrl.split('?')[0];
  }
  return 'unmatched';
}

export function httpMetricsMiddleware(req, res, next) {
  if (!env.observability.metrics.enabled) {
    return next();
  }

  const endTimer = httpRequestDurationSeconds.startTimer({
    method: req.method,
    route: 'pending',
    status_code: 'pending'
  });

  httpActiveRequests.inc({ route: 'pending' });

  onFinished(res, () => {
    const statusCode = res.statusCode || 500;
    const resolvedRoute = normalizeRoute(req);
    const labels = {
      method: req.method,
      route: resolvedRoute,
      status_code: String(statusCode)
    };

    endTimer(labels);
    httpRequestsTotal.inc(labels);
    if (statusCode >= 500) {
      httpRequestErrors.inc(labels);
    }
    httpActiveRequests.dec({ route: 'pending' });
  });

  next();
}

function parseIpList(entries) {
  return entries
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.toLowerCase());
}

function isIpAllowed(address, allowedEntries) {
  if (!allowedEntries.length) {
    return true;
  }

  if (!address) {
    return false;
  }

  const normalized = address.includes(':') && address.includes('.') ? address.split(':').pop() : address;

  let client;
  try {
    client = ipaddr.parse(normalized);
  } catch (_error) {
    return false;
  }

  return allowedEntries.some((entry) => {
    if (entry === '*' || entry === 'any') {
      return true;
    }

    if (entry.includes('/')) {
      try {
        const cidr = ipaddr.parseCIDR(entry);
        return client.match(cidr);
      } catch (_error) {
        return false;
      }
    }

    try {
      return client.toNormalizedString() === ipaddr.parse(entry).toNormalizedString();
    } catch (_error) {
      return false;
    }
  });
}

function validateMetricsAuth(req) {
  const { metrics } = env.observability;
  if (!metrics.enabled) {
    const error = new Error('Metrics collection disabled');
    error.status = 503;
    throw error;
  }

  if (metrics.allowedIps.length && !isIpAllowed(req.ip, metrics.allowedIps)) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }

  if (metrics.bearerToken) {
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      const error = new Error('Metrics bearer token required');
      error.status = 401;
      error.headers = { 'WWW-Authenticate': 'Bearer realm="metrics"' };
      throw error;
    }

    const token = header.slice(7).trim();
    if (token !== metrics.bearerToken) {
      const error = new Error('Invalid metrics bearer token');
      error.status = 401;
      error.headers = { 'WWW-Authenticate': 'Bearer realm="metrics"' };
      throw error;
    }

    return;
  }

  if (metrics.username && metrics.password) {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Basic ')) {
      const error = new Error('Metrics basic authentication required');
      error.status = 401;
      error.headers = { 'WWW-Authenticate': 'Basic realm="metrics"' };
      throw error;
    }

    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const [user, pass] = decoded.split(':');
    if (user !== metrics.username || pass !== metrics.password) {
      const error = new Error('Invalid metrics credentials');
      error.status = 401;
      error.headers = { 'WWW-Authenticate': 'Basic realm="metrics"' };
      throw error;
    }
  }
}

export async function metricsHandler(req, res, next) {
  try {
    validateMetricsAuth(req);
    res.setHeader('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  } catch (error) {
    if (!error.status) {
      error.status = 500;
    }
    if (error.headers) {
      Object.entries(error.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }
    next(error);
  }
}

export async function recordStorageOperation(operation, visibility, handler) {
  const labels = { operation, visibility };
  storageOperationsInFlight.inc({ operation });
  const endTimer = storageOperationDurationSeconds.startTimer({
    operation,
    visibility,
    status: 'pending'
  });

  try {
    const result = await handler();
    const size = Number(result?.size ?? result?.bytes ?? result?.buffer?.length ?? result?.contentLength ?? 0);
    if (!Number.isNaN(size) && size > 0) {
      storageTransferredBytes.observe({ ...labels, status: 'success' }, size);
    }
    endTimer({ ...labels, status: 'success' });
    return result;
  } catch (error) {
    endTimer({ ...labels, status: 'error' });
    storageTransferredBytes.observe({ ...labels, status: 'error' }, 0);
    throw error;
  } finally {
    storageOperationsInFlight.dec({ operation });
  }
}

export function recordUnhandledException(error) {
  const type = error?.name ?? 'Error';
  unhandledExceptionsTotal.inc({ type });
}

export function recordAntivirusScan({ status, bytesScanned, durationSeconds, signature, bucket }) {
  const resolvedStatus = status ?? 'unknown';
  const bytes = Number(bytesScanned ?? 0);
  const duration = Number(durationSeconds ?? 0);
  const sourceBucket = bucket ?? 'unknown';

  antivirusScanDurationSeconds.observe({ status: resolvedStatus }, duration);
  antivirusScanBytes.observe({ status: resolvedStatus }, bytes);

  if (resolvedStatus === 'infected' && signature) {
    antivirusDetectionsTotal.inc({ signature, bucket: sourceBucket });
  }
}

export function annotateLogContextFromRequest(req) {
  const context = getRequestContext();
  if (!context) {
    return;
  }

  context.method = req.method;
  context.path = normalizeRoute(req);
  if (!context.ip) {
    context.ip = req.ip;
  }
}

export function getMetricsRegistry() {
  return registry;
}

const allowedIpEntries = parseIpList(env.observability.metrics.allowedIps);
env.observability.metrics.allowedIps = allowedIpEntries;
