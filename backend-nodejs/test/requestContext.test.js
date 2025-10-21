import { describe, expect, it, vi } from 'vitest';

import {
  createRequestContext,
  getRequestContext,
  runWithRequestContext,
  updateRequestContext,
  withTelemetrySpan
} from '../src/observability/requestContext.js';

function createDeterministicContext() {
  return createRequestContext({
    traceId: 'trace-1234567890abcdef',
    spanId: 'abcdefabcdefabcd',
    method: 'post',
    path: '/courses?limit=5',
    ip: '127.0.0.1',
    metadata: { requestId: 'req-1' }
  });
}

describe('requestContext', () => {
  it('normalises context inputs and isolates metadata', () => {
    const metadata = { requestId: 'req-2' };
    const context = createRequestContext({
      traceId: 'trace-abcdefabcdefabcd',
      spanId: 'ABCDEF1234567890',
      method: 'delete',
      path: '/admin/users/123 ',
      metadata
    });

    expect(context.traceId).toBe('trace-abcdefabcdefabcd');
    expect(context.spanId).toBe('abcdef1234567890');
    expect(context.method).toBe('DELETE');
    expect(context.path).toBe('/admin/users/123');
    expect(context.metadata).not.toBe(metadata);
    expect(context.metadata).toEqual({ requestId: 'req-2' });
  });

  it('runs callbacks with hydrated context and allows updates', () => {
    const baseContext = createDeterministicContext();
    const result = runWithRequestContext(baseContext, () => {
      const stored = getRequestContext();
      expect(stored).toMatchObject({
        traceId: baseContext.traceId,
        spanId: baseContext.spanId,
        method: 'POST',
        path: '/courses?limit=5'
      });

      updateRequestContext({ userId: 'user-1', metadata: { tenant: 'acme' } });
      return getRequestContext();
    });

    expect(result.userId).toBe('user-1');
    expect(result.metadata).toEqual({ tenant: 'acme' });
  });

  it('records span lifecycle details and propagates failures', async () => {
    const baseContext = createDeterministicContext();
    const hrSpy = vi.spyOn(process.hrtime, 'bigint');
    hrSpy
      .mockReturnValueOnce(10n) // spanStartedAt
      .mockReturnValueOnce(15n) // request context startedAt
      .mockReturnValueOnce(1010n); // spanEndedAt
    let captured;

    await runWithRequestContext(baseContext, async () => {
      await expect(
        withTelemetrySpan('instructor.load', async (spanContext) => {
          captured = spanContext;
          throw new Error('downstream failure');
        })
      ).rejects.toThrow('downstream failure');
    });

    expect(captured.spanName).toBe('instructor.load');
    expect(captured.parentSpanId).toBe(baseContext.spanId);
    expect(captured.spanError).toBeInstanceOf(Error);
    expect(captured.spanEndedAt).toBeGreaterThan(captured.spanStartedAt);
    expect(captured.spanDurationNs).toBe(captured.spanEndedAt - captured.spanStartedAt);
    expect(hrSpy).toHaveBeenCalled();
    hrSpy.mockRestore();
  });
});
