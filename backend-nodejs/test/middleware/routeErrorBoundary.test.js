import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import createRouteErrorBoundary from '../../src/middleware/routeErrorBoundary.js';
import { env } from '../../src/config/env.js';

const logger = {
  error: vi.fn(),
  child: vi.fn()
};
logger.child.mockReturnValue(logger);

const recordUnhandledException = vi.hoisted(() => vi.fn());

vi.mock('../../src/observability/metrics.js', () => ({
  recordUnhandledException
}));

describe('routeErrorBoundary middleware', () => {
  let originalProduction;

  beforeEach(() => {
    originalProduction = env.isProduction;
    logger.error.mockClear();
    recordUnhandledException.mockClear();
  });

  afterEach(() => {
    env.isProduction = originalProduction;
  });

  const createRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.headersSent = false;
    return res;
  };

  it('returns structured error responses in non-production environments', () => {
    env.isProduction = false;
    const boundary = createRouteErrorBoundary({ loggerInstance: logger, includeStack: false });
    const err = Object.assign(new Error('bad request'), { status: 400, code: 'validation_error' });
    const req = { originalUrl: '/test', method: 'POST', activeFeatureFlags: {} };
    const res = createRes();
    const next = vi.fn();

    boundary(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'bad request', code: 'validation_error' })
    );
    expect(recordUnhandledException).toHaveBeenCalledWith(err);
    expect(next).not.toHaveBeenCalled();
  });

  it('hides internal error details in production', () => {
    env.isProduction = true;
    const boundary = createRouteErrorBoundary({ loggerInstance: logger, includeStack: false });
    const err = Object.assign(new Error('database exploded'), { status: 500 });
    const res = createRes();

    boundary(err, { originalUrl: '/secure', method: 'GET' }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'An unexpected error occurred while processing this request.',
        code: 'route_error'
      })
    );
  });
});
