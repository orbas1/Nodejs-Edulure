import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

const storage = new AsyncLocalStorage();

function generateTraceId() {
  return randomUUID();
}

export function generateSpanId() {
  return randomUUID().replace(/-/g, '').slice(0, 16);
}

function normaliseTraceId(candidate) {
  if (typeof candidate !== 'string') {
    return generateTraceId();
  }

  const trimmed = candidate.trim();
  if (!trimmed) {
    return generateTraceId();
  }

  if (/^[A-Za-z0-9-]{1,128}$/.test(trimmed)) {
    return trimmed.slice(0, 128);
  }

  return generateTraceId();
}

function normaliseSpanId(candidate) {
  if (typeof candidate === 'string' && /^[A-Fa-f0-9]{16}$/.test(candidate)) {
    return candidate.toLowerCase();
  }

  return generateSpanId();
}

function normaliseMethod(method) {
  if (typeof method === 'string' && method.trim()) {
    return method.trim().toUpperCase().slice(0, 16);
  }
  return 'GET';
}

function normalisePath(path) {
  if (typeof path === 'string' && path.trim()) {
    return path.trim().slice(0, 2048);
  }
  return '/';
}

function ensureMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  return { ...metadata };
}

function ensureContextObject(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return {};
  }
  return candidate;
}

export function createRequestContext({ traceId, spanId, ip, method, path, metadata, startedAt, ...rest } = {}) {
  const context = ensureContextObject(rest);
  context.traceId = normaliseTraceId(traceId ?? rest.traceId);
  context.spanId = normaliseSpanId(spanId ?? rest.spanId);
  context.parentSpanId = rest.parentSpanId ?? null;
  context.ip = typeof ip === 'string' ? ip : rest.ip;
  context.method = normaliseMethod(method ?? rest.method);
  context.path = normalisePath(path ?? rest.path);
  context.metadata = ensureMetadata(metadata ?? rest.metadata);
  context.startedAt = typeof startedAt === 'bigint' ? startedAt : rest.startedAt ?? process.hrtime.bigint();
  return context;
}

export function runWithRequestContext(context, callback) {
  if (typeof callback !== 'function') {
    throw new Error('runWithRequestContext requires a callback function.');
  }

  const resolvedContext = createRequestContext(context);
  return storage.run(resolvedContext, callback);
}

export function getRequestContext() {
  return storage.getStore();
}

export function updateRequestContext(updates) {
  const context = storage.getStore();
  if (context && updates && typeof updates === 'object') {
    Object.assign(context, updates);
  }
}

export async function withTelemetrySpan(name, handler) {
  if (typeof handler !== 'function') {
    throw new Error('withTelemetrySpan requires a handler function.');
  }

  const spanName = typeof name === 'string' && name.trim() ? name.trim() : 'anonymous';
  const parentContext = getRequestContext();
  const spanContext = {
    ...(parentContext ?? {}),
    spanId: generateSpanId(),
    parentSpanId: parentContext?.spanId ?? null,
    spanName,
    spanStartedAt: process.hrtime.bigint(),
    metadata: ensureMetadata(parentContext?.metadata)
  };

  return runWithRequestContext(spanContext, async () => {
    try {
      const result = await handler(spanContext);
      return result;
    } catch (error) {
      spanContext.spanError = error;
      throw error;
    } finally {
      spanContext.spanEndedAt = process.hrtime.bigint();
      spanContext.spanDurationNs = spanContext.spanEndedAt - spanContext.spanStartedAt;
    }
  });
}
