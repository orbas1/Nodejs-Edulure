import { describe, expect, it, vi } from 'vitest';

const createRequestContext = vi.hoisted(() => vi.fn((context) => context));
const runWithRequestContext = vi.hoisted(() => vi.fn((context, handler) => handler()));

vi.mock('../../src/observability/requestContext.js', () => ({
  createRequestContext,
  runWithRequestContext
}));

import requestContextMiddleware from '../../src/middleware/requestContext.js';

describe('requestContext middleware', () => {
  it('propagates upstream trace identifiers when present', () => {
    const req = {
      headers: { 'x-request-id': 'trace-1234567890abcd' },
      ip: '127.0.0.1',
      method: 'GET',
      originalUrl: '/health'
    };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    requestContextMiddleware(req, res, next);

    expect(req.traceId).toBe('trace-1234567890abcd');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'trace-1234567890abcd');
    expect(createRequestContext).toHaveBeenCalledWith(
      expect.objectContaining({ traceId: 'trace-1234567890abcd', method: 'GET', path: '/health' })
    );
    expect(runWithRequestContext).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('generates identifiers when absent and stores them on the request', () => {
    const req = { headers: {}, ip: '127.0.0.1', method: 'POST', originalUrl: '/submit' };
    const res = { setHeader: vi.fn() };
    const next = vi.fn();

    requestContextMiddleware(req, res, next);

    expect(req.traceId).toBeDefined();
    expect(req.spanId).toHaveLength(16);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.traceId);
  });
});
