import { afterEach, describe, expect, it } from 'vitest';

import { RuntimeConfigService } from '../src/services/FeatureFlagService.js';

const logger = {
  debug: () => {},
  error: () => {},
  info: () => {}
};

const entries = [
  {
    id: 1,
    key: 'support.contact-email',
    environmentScope: 'global',
    valueType: 'string',
    value: 'support@edulure.com',
    description: 'Primary support contact',
    exposureLevel: 'public',
    sensitive: false,
    metadata: {}
  },
  {
    id: 2,
    key: 'admin.console.escalation-channel',
    environmentScope: 'production',
    valueType: 'string',
    value: '#admin-escalations',
    description: 'Ops escalation channel',
    exposureLevel: 'ops',
    sensitive: false,
    metadata: {}
  },
  {
    id: 3,
    key: 'billing.stripe.secret-key',
    environmentScope: 'production',
    valueType: 'string',
    value: 'sk_live_sensitive',
    description: 'Stripe live key',
    exposureLevel: 'private',
    sensitive: true,
    metadata: {}
  }
];

function createService(dataset = entries) {
  return new RuntimeConfigService({
    loadEntries: async () => dataset,
    cacheTtlMs: 60_000,
    refreshIntervalMs: 0,
    loggerInstance: logger
  });
}

describe('RuntimeConfigService', () => {
  let service;

  afterEach(() => {
    service?.stop();
  });

  it('returns typed configuration values with environment fallback', async () => {
    service = createService();
    await service.start();

    const value = service.getValue('support.contact-email', {
      environment: 'development',
      audience: 'public'
    });

    expect(value).toBe('support@edulure.com');
  });

  it('filters exposure by audience when listing config entries', async () => {
    service = createService();
    await service.start();

    const opsSnapshot = service.listForAudience('production', { audience: 'ops' });
    expect(opsSnapshot['admin.console.escalation-channel'].value).toBe('#admin-escalations');
    expect(opsSnapshot['billing.stripe.secret-key']).toBeUndefined();
  });

  it('returns sensitive values only when explicitly requested by internal audience', async () => {
    service = createService();
    await service.start();

    const redacted = service.getValue('billing.stripe.secret-key', {
      environment: 'production',
      audience: 'internal',
      includeSensitive: false
    });
    expect(redacted).toBeNull();

    const unredacted = service.getValue('billing.stripe.secret-key', {
      environment: 'production',
      audience: 'internal',
      includeSensitive: true
    });
    expect(unredacted).toBe('sk_live_sensitive');
  });
});
