import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

const storage = new AsyncLocalStorage();

export function runWithRequestContext(context, callback) {
  return storage.run(context, callback);
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

export function generateSpanId() {
  return randomUUID().replace(/-/g, '').slice(0, 16);
}

export async function withTelemetrySpan(name, handler) {
  const parentContext = getRequestContext();
  const spanContext = {
    ...(parentContext ?? {}),
    spanId: generateSpanId(),
    parentSpanId: parentContext?.spanId ?? null,
    spanName: name,
    spanStartedAt: process.hrtime.bigint()
  };

  return runWithRequestContext(spanContext, async () => {
    try {
      return await handler(spanContext);
    } finally {
      spanContext.spanEndedAt = process.hrtime.bigint();
    }
  });
}

export function createRequestContext({ traceId, spanId, ip, method, path }) {
  return {
    traceId,
    spanId,
    ip,
    method,
    path,
    startedAt: process.hrtime.bigint()
  };
}
