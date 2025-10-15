import crypto from 'crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeatureFlagService } from '../src/services/FeatureFlagService.js';

const logger = {
  debug: () => {},
  error: () => {},
  info: () => {},
  warn: () => {}
};

function computeBucket(flagKey, identifier) {
  const hash = crypto.createHash('sha1').update(`${flagKey}:${identifier}`).digest('hex');
  const bucket = parseInt(hash.slice(0, 8), 16) % 100;
  return bucket + 1;
}

function createService(flags) {
  return new FeatureFlagService({
    loadFlags: async () => flags,
    recordAudit: () => Promise.resolve(),
    cacheTtlMs: 60_000,
    refreshIntervalMs: 0,
    loggerInstance: logger
  });
}

describe('FeatureFlagService', () => {
  let service;

  afterEach(() => {
    service?.stop();
  });

  it('disables flags when kill switch is engaged', async () => {
    const flags = [
      {
        key: 'test.flag',
        name: 'Test Flag',
        description: 'Kill switch test',
        enabled: true,
        killSwitch: true,
        rolloutStrategy: 'boolean',
        rolloutPercentage: 100,
        segmentRules: {},
        environments: ['development']
      }
    ];

    service = createService(flags);
    await service.start();

    const evaluation = service.evaluate('test.flag');
    expect(evaluation.enabled).toBe(false);
    expect(evaluation.reason).toBe('kill-switch');
  });

  it('honours rollout percentage using deterministic buckets', async () => {
    const flagKey = 'percentage.flag';
    const targetId = 'user-123';
    const bucket = computeBucket(flagKey, targetId);
    const flags = [
      {
        key: flagKey,
        name: 'Checkout v2',
        description: 'Percentage rollout flag',
        enabled: true,
        killSwitch: false,
        rolloutStrategy: 'percentage',
        rolloutPercentage: bucket - 1,
        segmentRules: {},
        environments: ['development']
      }
    ];

    service = createService(flags);
    await service.start();

    const evaluation = service.evaluate(flagKey, { targetId });
    expect(evaluation.enabled).toBe(false);
    expect(evaluation.reason).toBe('percentage-threshold');
  });

  it('enables flags when segment rules match user context', async () => {
    const flags = [
      {
        key: 'segment.flag',
        name: 'Live classrooms',
        description: 'Segment rollout flag',
        enabled: true,
        killSwitch: false,
        rolloutStrategy: 'segment',
        rolloutPercentage: 100,
        segmentRules: {
          allowedRoles: ['admin', 'instructor'],
          allowedTenants: ['learning-ops-guild']
        },
        environments: ['development'],
        variants: [
          { key: 'core', weight: 50 },
          { key: 'beta', weight: 50 }
        ]
      }
    ];

    service = createService(flags);
    await service.start();

    const evaluation = service.evaluate('segment.flag', {
      role: 'instructor',
      tenantId: 'learning-ops-guild',
      targetId: 'tenant-user-55'
    });

    expect(evaluation.enabled).toBe(true);
    expect(['core', 'beta']).toContain(evaluation.variant);
  });

  it('returns disabled when environment is not allowed', async () => {
    const flags = [
      {
        key: 'env.flag',
        name: 'Env flag',
        description: 'Environment gating',
        enabled: true,
        killSwitch: false,
        rolloutStrategy: 'boolean',
        rolloutPercentage: 100,
        segmentRules: {},
        environments: ['production']
      }
    ];

    service = createService(flags);
    await service.start();

    const evaluation = service.evaluate('env.flag', { environment: 'development' });
    expect(evaluation.enabled).toBe(false);
    expect(evaluation.reason).toBe('environment-not-allowed');
  });

  it('disables scheduled flags outside of the rollout window', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const flags = [
      {
        key: 'schedule.flag',
        name: 'Scheduled flag',
        description: 'Schedule gating',
        enabled: true,
        killSwitch: false,
        rolloutStrategy: 'segment',
        rolloutPercentage: 100,
        segmentRules: {
          schedule: { start: futureDate }
        },
        environments: ['development']
      }
    ];

    service = createService(flags);
    await service.start();

    const evaluation = service.evaluate('schedule.flag');
    expect(evaluation.enabled).toBe(false);
    expect(evaluation.reason).toBe('outside-schedule');
  });

  it('hydrates from distributed cache snapshot when available', async () => {
    const flags = [
      {
        key: 'distributed.flag',
        name: 'Distributed flag',
        description: 'Loaded from redis snapshot',
        enabled: true,
        killSwitch: false,
        rolloutStrategy: 'boolean',
        rolloutPercentage: 100,
        segmentRules: {},
        environments: ['development']
      }
    ];

    const distributedCache = {
      readFeatureFlags: vi.fn().mockResolvedValue({ value: flags, version: 123 }),
      acquireFeatureFlagLock: vi.fn(),
      releaseFeatureFlagLock: vi.fn(),
      writeFeatureFlags: vi.fn()
    };

    const loadFlags = vi.fn().mockResolvedValue(flags);

    service = new FeatureFlagService({
      loadFlags,
      cacheTtlMs: 60_000,
      refreshIntervalMs: 0,
      loggerInstance: logger,
      distributedCache
    });

    await service.start();

    expect(distributedCache.readFeatureFlags).toHaveBeenCalledTimes(1);
    expect(loadFlags).not.toHaveBeenCalled();

    const evaluation = service.evaluate('distributed.flag');
    expect(evaluation.enabled).toBe(true);
  });
});
