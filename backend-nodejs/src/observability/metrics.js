import onFinished from 'on-finished';
import * as promClient from 'prom-client';
import ipaddr from 'ipaddr.js';

import { env } from '../config/env.js';
import { getRequestContext } from './requestContext.js';
import { recordHttpSloObservation } from './sloRegistry.js';

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

const featureGateDecisionsTotal = new promClient.Counter({
  name: 'edulure_feature_flag_gate_decisions_total',
  help: 'Feature flag gate outcomes for API routes',
  labelNames: ['flag_key', 'result', 'route', 'audience', 'reason']
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

const paymentsProcessedTotal = new promClient.Counter({
  name: 'edulure_payments_processed_total',
  help: 'Count of payment intents processed grouped by provider, status, and currency',
  labelNames: ['provider', 'status', 'currency']
});

const paymentsRevenueCentsTotal = new promClient.Counter({
  name: 'edulure_payments_revenue_cents_total',
  help: 'Total payment volume captured (in cents) grouped by provider and currency',
  labelNames: ['provider', 'currency']
});

const paymentsTaxCentsTotal = new promClient.Counter({
  name: 'edulure_payments_tax_cents_total',
  help: 'Total tax collected for successful payments (in cents)',
  labelNames: ['currency']
});

const paymentsRefundCentsTotal = new promClient.Counter({
  name: 'edulure_payments_refund_cents_total',
  help: 'Total refund volume issued (in cents) grouped by provider and currency',
  labelNames: ['provider', 'currency']
});

const searchOperationDurationSeconds = new promClient.Histogram({
  name: 'edulure_search_operation_duration_seconds',
  help: 'Duration histogram for Meilisearch administrative operations',
  labelNames: ['operation', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

const searchNodeHealthGauge = new promClient.Gauge({
  name: 'edulure_search_node_health',
  help: 'Health state of Meilisearch nodes (1 healthy, 0 unhealthy)',
  labelNames: ['host', 'role']
});

const searchNodeLastCheckGauge = new promClient.Gauge({
  name: 'edulure_search_node_last_check_timestamp',
  help: 'Unix timestamp of the last successful Meilisearch healthcheck per node',
  labelNames: ['host', 'role']
});

const searchIndexReadyGauge = new promClient.Gauge({
  name: 'edulure_search_index_ready',
  help: 'Indicates whether explorer indexes are provisioned (1 ready, 0 pending)',
  labelNames: ['index']
});

const searchIngestionDurationSeconds = new promClient.Histogram({
  name: 'edulure_search_ingestion_duration_seconds',
  help: 'Duration histogram for search ingestion runs',
  labelNames: ['index', 'result'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300]
});

const searchIngestionDocumentsTotal = new promClient.Counter({
  name: 'edulure_search_ingestion_documents_total',
  help: 'Documents processed during search ingestion grouped by index and result',
  labelNames: ['index', 'result']
});

const searchIngestionErrorsTotal = new promClient.Counter({
  name: 'edulure_search_ingestion_errors_total',
  help: 'Count of search ingestion failures grouped by index and reason',
  labelNames: ['index', 'reason']
});

const searchIngestionLastRunTimestamp = new promClient.Gauge({
  name: 'edulure_search_ingestion_last_run_timestamp',
  help: 'Unix timestamp of the last successful ingestion per index',
  labelNames: ['index']
});

const explorerSearchEventsTotal = new promClient.Counter({
  name: 'edulure_explorer_search_events_total',
  help: 'Count of explorer search executions grouped by entity and result type',
  labelNames: ['entity', 'result']
});

const explorerSearchDisplayedResults = new promClient.Histogram({
  name: 'edulure_explorer_displayed_results',
  help: 'Histogram of displayed results count per explorer search by entity',
  labelNames: ['entity'],
  buckets: [0, 1, 3, 5, 10, 20, 40, 80]
});

const explorerSearchLatencyMs = new promClient.Histogram({
  name: 'edulure_explorer_search_latency_ms',
  help: 'Histogram of search latency per explorer entity',
  labelNames: ['entity'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 750, 1000, 1500, 2000]
});

const explorerSearchInteractionsTotal = new promClient.Counter({
  name: 'edulure_explorer_interactions_total',
  help: 'Count of explorer interactions grouped by entity and interaction type',
  labelNames: ['entity', 'interaction_type']
});

registry.registerMetric(httpRequestsTotal);
registry.registerMetric(httpRequestDurationSeconds);
registry.registerMetric(httpActiveRequests);
registry.registerMetric(httpRequestErrors);
registry.registerMetric(featureGateDecisionsTotal);
registry.registerMetric(storageOperationDurationSeconds);
registry.registerMetric(storageOperationsInFlight);
registry.registerMetric(storageTransferredBytes);
registry.registerMetric(antivirusScanDurationSeconds);
registry.registerMetric(antivirusScanBytes);
registry.registerMetric(antivirusDetectionsTotal);
registry.registerMetric(unhandledExceptionsTotal);
registry.registerMetric(paymentsProcessedTotal);
registry.registerMetric(paymentsRevenueCentsTotal);
registry.registerMetric(paymentsTaxCentsTotal);
registry.registerMetric(paymentsRefundCentsTotal);
registry.registerMetric(searchOperationDurationSeconds);
registry.registerMetric(searchNodeHealthGauge);
registry.registerMetric(searchNodeLastCheckGauge);
registry.registerMetric(searchIndexReadyGauge);
registry.registerMetric(searchIngestionDurationSeconds);
registry.registerMetric(searchIngestionDocumentsTotal);
registry.registerMetric(searchIngestionErrorsTotal);
registry.registerMetric(searchIngestionLastRunTimestamp);
registry.registerMetric(explorerSearchEventsTotal);
registry.registerMetric(explorerSearchDisplayedResults);
registry.registerMetric(explorerSearchLatencyMs);
registry.registerMetric(explorerSearchInteractionsTotal);

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
  const metricsEnabled = env.observability.metrics.enabled;
  const startTime = process.hrtime.bigint();

  const endTimer = metricsEnabled
    ? httpRequestDurationSeconds.startTimer({
        method: req.method,
        route: 'pending',
        status_code: 'pending'
      })
    : null;

  if (metricsEnabled) {
    httpActiveRequests.inc({ route: 'pending' });
  }

  onFinished(res, () => {
    const statusCode = res.statusCode || 500;
    const resolvedRoute = normalizeRoute(req);
    const labels = {
      method: req.method,
      route: resolvedRoute,
      status_code: String(statusCode)
    };

    if (metricsEnabled) {
      endTimer?.(labels);
      httpRequestsTotal.inc(labels);
      if (statusCode >= 500) {
        httpRequestErrors.inc(labels);
      }
      httpActiveRequests.dec({ route: 'pending' });
    }

    const durationNs = process.hrtime.bigint() - startTime;
    const durationMs = Number(durationNs) / 1e6;
    recordHttpSloObservation({
      route: resolvedRoute,
      method: req.method,
      statusCode,
      durationMs,
      timestamp: Date.now()
    });
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

export async function recordSearchOperation(operation, handler) {
  if (!env.observability.metrics.enabled) {
    return handler();
  }

  const endTimer = searchOperationDurationSeconds.startTimer({ operation, status: 'pending' });
  try {
    const result = await handler();
    endTimer({ operation, status: 'success' });
    return result;
  } catch (error) {
    endTimer({ operation, status: 'error' });
    throw error;
  }
}

export function updateSearchNodeHealth({ host, role, healthy }) {
  if (!env.observability.metrics.enabled) {
    return;
  }

  searchNodeHealthGauge.set({ host, role }, healthy ? 1 : 0);
  if (healthy) {
    searchNodeLastCheckGauge.set({ host, role }, Date.now() / 1000);
  }
}

export function updateSearchIndexStatus(index, ready) {
  if (!env.observability.metrics.enabled) {
    return;
  }

  searchIndexReadyGauge.set({ index }, ready ? 1 : 0);
}

export function recordSearchIngestionRun({ index, documentCount, durationSeconds, status, error }) {
  if (!env.observability.metrics.enabled) {
    return;
  }

  const result = status === 'success' ? 'success' : 'error';
  if (Number.isFinite(durationSeconds) && durationSeconds >= 0) {
    searchIngestionDurationSeconds.observe({ index, result }, durationSeconds);
  }
  if (Number.isFinite(documentCount) && documentCount >= 0) {
    searchIngestionDocumentsTotal.inc({ index, result }, documentCount);
  }
  if (result === 'success') {
    searchIngestionLastRunTimestamp.set({ index }, Date.now() / 1000);
    return;
  }

  const reason = error?.code ?? error?.name ?? error?.message ?? 'unknown';
  searchIngestionErrorsTotal.inc({ index, reason });
}

export function recordExplorerSearchEvent({ entityType, zeroResult, displayedHits, latencyMs }) {
  if (!env.observability.metrics.enabled) {
    return;
  }

  const safeEntity = entityType ?? 'unknown';
  explorerSearchEventsTotal.inc({ entity: safeEntity, result: zeroResult ? 'zero' : 'matched' });
  if (Number.isFinite(displayedHits) && displayedHits >= 0) {
    explorerSearchDisplayedResults.observe({ entity: safeEntity }, displayedHits);
  }
  if (Number.isFinite(latencyMs) && latencyMs >= 0) {
    explorerSearchLatencyMs.observe({ entity: safeEntity }, latencyMs);
  }
}

export function recordExplorerInteraction({ entityType, interactionType }) {
  if (!env.observability.metrics.enabled) {
    return;
  }

  explorerSearchInteractionsTotal.inc({
    entity: entityType ?? 'unknown',
    interaction_type: interactionType ?? 'unknown'
  });
}

export function trackPaymentCaptureMetrics({ provider, status, currency, amountTotal, taxAmount }) {
  if (!env.observability.metrics.enabled) {
    return;
  }

  const resolvedProvider = provider ?? 'unknown';
  const resolvedCurrency = (currency ?? env.payments.defaultCurrency).toUpperCase();
  const resolvedStatus = status ?? 'unknown';

  paymentsProcessedTotal.inc({ provider: resolvedProvider, status: resolvedStatus, currency: resolvedCurrency });
  if (Number.isFinite(amountTotal) && amountTotal > 0) {
    paymentsRevenueCentsTotal.inc({ provider: resolvedProvider, currency: resolvedCurrency }, amountTotal);
  }
  if (Number.isFinite(taxAmount) && taxAmount > 0) {
    paymentsTaxCentsTotal.inc({ currency: resolvedCurrency }, taxAmount);
  }
}

export function trackPaymentRefundMetrics({ provider, currency, amount }) {
  if (!env.observability.metrics.enabled) {
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }

  paymentsRefundCentsTotal.inc(
    {
      provider: provider ?? 'unknown',
      currency: (currency ?? env.payments.defaultCurrency).toUpperCase()
    },
    amount
  );
}

export function recordUnhandledException(error) {
  const type = error?.name ?? 'Error';
  unhandledExceptionsTotal.inc({ type });
}

export function recordFeatureGateDecision({ flagKey, result, route, audience, reason }) {
  const resolvedFlag = flagKey ?? 'unknown';
  const resolvedResult = result ?? 'unknown';
  const resolvedRoute = route ?? 'unknown';
  const resolvedAudience = audience ?? 'public';
  const resolvedReason = reason ?? 'unspecified';

  featureGateDecisionsTotal.inc({
    flag_key: resolvedFlag,
    result: resolvedResult,
    route: resolvedRoute,
    audience: resolvedAudience,
    reason: resolvedReason
  });
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
