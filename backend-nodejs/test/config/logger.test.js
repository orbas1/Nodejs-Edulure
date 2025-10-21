import { beforeAll, describe, expect, it, vi } from 'vitest';

const envMock = {
  logging: {
    level: 'info',
    redactedFields: [],
    serviceName: 'test-service'
  },
  nodeEnv: 'test',
  isDevelopment: false
};

const stubLogger = {
  child: vi.fn(() => stubLogger),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

const pinoFactory = vi.fn(() => stubLogger);
pinoFactory.stdTimeFunctions = { isoTime: vi.fn(() => 'timestamp') };

vi.mock('pino', () => ({
  default: pinoFactory
}));

const getRequestContextMock = vi.fn(() => ({ traceId: 'trace', spanId: 'span', userId: 'user-1' }));

vi.mock('../../src/observability/requestContext.js', () => ({
  getRequestContext: getRequestContextMock
}));

vi.mock('../../src/config/env.js', () => ({
  env: envMock
}));

let logger;
let capturedConfig;

beforeAll(async () => {
  logger = (await import('../../src/config/logger.js')).default;
  capturedConfig = pinoFactory.mock.calls[0][0];
});

describe('logger configuration', () => {
  it('builds a pino logger with redaction and metadata controls', () => {
    expect(capturedConfig.level).toBeDefined();
    expect(capturedConfig.redact.paths).toContain('req.headers.authorization');
    expect(capturedConfig.base).toMatchObject({ service: expect.any(String) });
  });

  it('injects request context through the mixin function', () => {
    const mixin = capturedConfig.mixin;
    expect(mixin()).toEqual({ traceId: 'trace', spanId: 'span', userId: 'user-1' });
    expect(getRequestContextMock).toHaveBeenCalled();
  });

  it('exposes the configured logger instance', () => {
    expect(logger).toBe(stubLogger);
    expect(pinoFactory).toHaveBeenCalledTimes(1);
  });
});
