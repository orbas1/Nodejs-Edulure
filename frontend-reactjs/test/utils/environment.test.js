import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildEnvironmentHeaders,
  getEnvironmentAuditStamp,
  getEnvironmentCacheKey,
  getEnvironmentContext,
  resetEnvironmentContext,
  resolveEnvironmentDescriptor,
  setEnvironmentContext
} from '../../src/utils/environment.js';

describe('environment utilities', () => {
  afterEach(() => {
    resetEnvironmentContext();
    vi.unstubAllEnvs();
    if (typeof window !== 'undefined') {
      delete window.__EDULURE_RUNTIME__;
      delete window.__EDULURE_ENVIRONMENT__;
    }
  });

  it('normalises string descriptors into structured context', () => {
    const descriptor = resolveEnvironmentDescriptor('staging');
    expect(descriptor.key).toBe('staging');
    expect(descriptor.name).toBe('Staging');
    expect(descriptor.tier).toBeDefined();
  });

  it('updates the shared context via setEnvironmentContext', () => {
    setEnvironmentContext({ key: 'production', tier: 'production', region: 'eu-west-1', workspace: 'tenant-42' });
    const context = getEnvironmentContext();
    expect(context.key).toBe('production');
    expect(context.region).toBe('eu-west-1');
    expect(context.workspace).toBe('tenant-42');
  });

  it('builds environment headers for parity tracking', () => {
    const headers = buildEnvironmentHeaders({ key: 'qa', tier: 'testing', region: 'us-east-1', workspace: 'sandbox' });
    expect(headers['X-Edulure-Environment']).toBe('qa');
    expect(headers['X-Edulure-Environment-Tier']).toBe('testing');
    expect(headers['X-Edulure-Region']).toBe('us-east-1');
    expect(headers['X-Edulure-Workspace']).toBe('sandbox');
  });

  it('generates cache keys and audit stamps with environment metadata', () => {
    const descriptor = setEnvironmentContext({ key: 'integration', tier: 'preprod', region: 'ap-southeast-2' });
    const cacheKey = getEnvironmentCacheKey(descriptor);
    expect(cacheKey).toContain('integration');
    expect(cacheKey).toContain('ap-southeast-2');

    const auditStamp = getEnvironmentAuditStamp(descriptor);
    expect(auditStamp.environment).toBe('integration');
    expect(auditStamp.region).toBe('ap-southeast-2');
    expect(typeof auditStamp.capturedAt).toBe('string');
  });
});
