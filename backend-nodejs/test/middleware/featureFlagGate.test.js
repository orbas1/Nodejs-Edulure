import { beforeEach, describe, expect, it, vi } from 'vitest';

import createFeatureFlagGate from '../../src/middleware/featureFlagGate.js';

const evaluate = vi.hoisted(() => vi.fn());
const recordFeatureGateDecision = vi.hoisted(() => vi.fn());
const loggerRef = vi.hoisted(() => ({ current: null }));

vi.mock('../../src/services/FeatureFlagService.js', () => ({
  featureFlagService: {
    evaluate,
    evaluateAll: vi.fn()
  }
}));

vi.mock('../../src/config/logger.js', () => {
  const instance = {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    child: vi.fn()
  };
  instance.child.mockReturnValue(instance);
  loggerRef.current = instance;
  return { default: instance };
});

vi.mock('../../src/observability/metrics.js', () => ({
  recordFeatureGateDecision
}));

const createRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('featureFlagGate middleware', () => {
  beforeEach(() => {
    evaluate.mockReset();
    recordFeatureGateDecision.mockReset();
    const loggerInstance = loggerRef.current;
    loggerInstance.warn.mockClear();
    loggerInstance.error.mockClear();
    loggerInstance.info.mockClear();
    loggerInstance.child.mockClear();
    loggerInstance.child.mockReturnValue(loggerInstance);
  });

  it('allows requests when flag evaluation resolves enabled', () => {
    evaluate.mockReturnValue({ key: 'feature.test', enabled: true, reason: 'target-match' });
    const gate = createFeatureFlagGate({ featureFlag: 'feature.test' });
    const req = { originalUrl: '/resource', method: 'GET' };
    const res = createRes();
    const next = vi.fn();

    gate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.activeFeatureFlags?.['feature.test']).toEqual(
      expect.objectContaining({ enabled: true, reason: 'target-match' })
    );
    expect(recordFeatureGateDecision).toHaveBeenCalledWith(
      expect.objectContaining({ flagKey: 'feature.test', result: 'allowed' })
    );
  });

  it('blocks requests when flag is disabled', () => {
    evaluate.mockReturnValue({ key: 'feature.test', enabled: false, reason: 'disabled' });
    const gate = createFeatureFlagGate({ featureFlag: 'feature.test', fallbackStatus: 403 });
    const req = { originalUrl: '/resource', method: 'GET' };
    const res = createRes();

    gate(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'feature_disabled', flag: 'feature.test' })
    );
    expect(recordFeatureGateDecision).toHaveBeenCalledWith(
      expect.objectContaining({ flagKey: 'feature.test', result: 'blocked' })
    );
  });

  it('surfaces evaluation errors to the error handler', () => {
    evaluate.mockImplementation(() => {
      throw Object.assign(new Error('evaluation failed'), { status: 500, code: 'flag_error' });
    });
    const gate = createFeatureFlagGate({ featureFlag: 'feature.test' });
    const req = { originalUrl: '/resource', method: 'GET' };
    const res = createRes();
    const next = vi.fn();

    gate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'flag_error' }));
  });
});
