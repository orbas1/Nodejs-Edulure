import { describe, expect, it } from 'vitest';

import { resolveHttpLogLevel } from '../../src/observability/httpLogLevel.js';

describe('resolveHttpLogLevel', () => {
  const createResponse = (statusCode) => ({ statusCode });

  it('returns info for successful responses without errors', () => {
    const level = resolveHttpLogLevel({ statusCode: createResponse(200).statusCode });

    expect(level).toBe('info');
  });

  it('returns warn for client error responses', () => {
    const level = resolveHttpLogLevel({ statusCode: createResponse(404).statusCode });

    expect(level).toBe('warn');
  });

  it('silences successful health check requests', () => {
    const level = resolveHttpLogLevel({
      statusCode: createResponse(200).statusCode,
      req: { originalUrl: '/health', method: 'GET' }
    });

    expect(level).toBe('silent');
  });

  it('continues logging health checks when they fail', () => {
    const level = resolveHttpLogLevel({
      statusCode: createResponse(503).statusCode,
      req: { originalUrl: '/health', method: 'GET' },
      error: Object.assign(new Error('unhealthy'), { statusCode: 503 })
    });

    expect(level).toBe('error');
  });

  it('returns error for server error responses', () => {
    const level = resolveHttpLogLevel({ statusCode: createResponse(503).statusCode });

    expect(level).toBe('error');
  });

  it('prioritises error status code when present', () => {
    const error = new Error('boom');
    error.statusCode = 502;
    const level = resolveHttpLogLevel({ statusCode: 200, error });

    expect(level).toBe('error');
  });

  it('normalises numeric error codes expressed as strings', () => {
    const error = new Error('teapot');
    error.code = '418';

    const level = resolveHttpLogLevel({ statusCode: 200, error });

    expect(level).toBe('warn');
  });

  it('downgrades unknown errors on successful responses to warnings', () => {
    const error = new Error('timeout');
    const level = resolveHttpLogLevel({ statusCode: 200, error });

    expect(level).toBe('warn');
  });
});
