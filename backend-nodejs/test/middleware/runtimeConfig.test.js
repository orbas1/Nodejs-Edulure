import { describe, expect, it, vi } from 'vitest';

const evaluate = vi.hoisted(() => vi.fn());
const evaluateAll = vi.hoisted(() => vi.fn());
const getValue = vi.hoisted(() => vi.fn());
const listForAudience = vi.hoisted(() => vi.fn());

vi.mock('../../src/services/FeatureFlagService.js', () => ({
  featureFlagService: { evaluate, evaluateAll },
  runtimeConfigService: { getValue, listForAudience }
}));

import runtimeConfigMiddleware from '../../src/middleware/runtimeConfig.js';
import { env } from '../../src/config/env.js';

describe('runtimeConfig middleware', () => {
  it('exposes helpers bound to feature flag and runtime config services', () => {
    const req = {
      headers: {
        'x-tenant-id': 'tenant-123',
        'x-geo-country': 'US',
        'x-app-version': '1.4.0',
        'x-platform': 'web'
      },
      user: { id: 'user-88', role: 'instructor' },
      traceId: 'trace-abc'
    };
    const res = {};
    const next = vi.fn();

    runtimeConfigMiddleware(req, res, next);

    req.getFeatureFlag('feature.lesson', { cohort: 'beta' }, { includeDefinition: true });
    expect(evaluate).toHaveBeenCalledWith(
      'feature.lesson',
      expect.objectContaining({
        environment: env.nodeEnv,
        tenantId: 'tenant-123',
        role: 'instructor',
        cohort: 'beta'
      }),
      { includeDefinition: true }
    );

    req.listFeatureFlags({ audience: 'internal' }, { includeDefinition: false });
    expect(evaluateAll).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'internal', tenantId: 'tenant-123' }),
      { includeDefinition: false }
    );

    req.getRuntimeConfig('ui.theme', { audience: 'internal', includeSensitive: true });
    expect(getValue).toHaveBeenCalledWith('ui.theme', {
      environment: env.nodeEnv,
      audience: 'internal',
      includeSensitive: true,
      defaultValue: null
    });

    req.listRuntimeConfig({ audience: 'ops', includeSensitive: false });
    expect(listForAudience).toHaveBeenCalledWith(env.nodeEnv, {
      audience: 'ops',
      includeSensitive: false
    });

    expect(next).toHaveBeenCalled();
  });
});
