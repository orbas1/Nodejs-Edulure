import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeatureFlagService } from '../src/services/FeatureFlagService.js';

function createLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis()
  };
}

describe('FeatureFlagService tenant overrides', () => {
  let service;

  beforeEach(() => {
    service = new FeatureFlagService({
      loadFlags: () => [],
      cacheTtlMs: 60000,
      refreshIntervalMs: 0,
      loggerInstance: createLogger(),
      skipInitialRefresh: true
    });
  });

  it('forces a flag off when tenant override is disabled', () => {
    service.applyFlags([
      {
        key: 'test.flag',
        enabled: true,
        killSwitch: false,
        rolloutStrategy: 'boolean',
        rolloutPercentage: 100,
        environments: ['production'],
        segmentRules: {},
        variants: [],
        tenantOverrides: [
          {
            tenantId: 'tenant-a',
            environment: 'production',
            state: 'forced_off',
            metadata: { reason: 'qa-disable' }
          }
        ]
      }
    ]);

    const result = service.evaluate('test.flag', { tenantId: 'tenant-a', environment: 'production' });
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe('tenant-override-disabled');
    expect(result.override).toMatchObject({ state: 'forced_off', tenantId: 'tenant-a' });
  });

  it('forces a flag on with a variant when tenant override is enabled', () => {
    service.applyFlags([
      {
        key: 'test.flag',
        enabled: false,
        killSwitch: false,
        rolloutStrategy: 'percentage',
        rolloutPercentage: 0,
        environments: ['production'],
        segmentRules: {},
        variants: [
          { key: 'control', weight: 50 },
          { key: 'beta', weight: 50 }
        ],
        tenantOverrides: [
          {
            tenantId: 'tenant-b',
            environment: 'production',
            state: 'forced_on',
            variantKey: 'beta',
            metadata: { requestedBy: 'ops' }
          }
        ]
      }
    ]);

    const result = service.evaluate('test.flag', { tenantId: 'tenant-b', environment: 'production' });
    expect(result.enabled).toBe(true);
    expect(result.variant).toBe('beta');
    expect(result.reason).toBe('tenant-override-enabled');
    expect(result.override).toMatchObject({ state: 'forced_on', tenantId: 'tenant-b', variantKey: 'beta' });
  });

  it('applies wildcard overrides when tenant specific entry is missing', () => {
    service.applyFlags([
      {
        key: 'test.flag',
        enabled: false,
        killSwitch: false,
        rolloutStrategy: 'boolean',
        rolloutPercentage: 0,
        environments: ['staging', 'production'],
        segmentRules: {},
        variants: [],
        tenantOverrides: [
          {
            tenantId: '*',
            environment: 'all',
            state: 'forced_on',
            metadata: { managed: true }
          }
        ]
      }
    ]);

    const result = service.evaluate('test.flag', { tenantId: 'tenant-c', environment: 'staging' });
    expect(result.enabled).toBe(true);
    expect(result.reason).toBe('tenant-override-enabled');
    expect(result.override).toMatchObject({ state: 'forced_on', tenantId: '*', environment: 'all' });
  });
});
