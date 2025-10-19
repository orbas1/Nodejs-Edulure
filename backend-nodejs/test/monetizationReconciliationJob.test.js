import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node-cron', () => ({
  default: {
    validate: vi.fn().mockReturnValue(true),
    schedule: vi.fn().mockReturnValue({ start: vi.fn(), stop: vi.fn(), destroy: vi.fn() })
  }
}));

vi.mock('knex', () => ({
  default: () => ({
    client: { config: { client: 'mysql2' } },
    transaction: async (handler) => handler({}),
    raw: vi.fn(),
    fn: { now: () => new Date().toISOString() }
  })
}));

vi.mock('../src/services/MonetizationFinanceService.js', () => ({
  default: {}
}));

vi.mock('../src/observability/metrics.js', () => ({
  updateMonetizationCatalogMetrics: vi.fn(),
  recordMonetizationUsage: vi.fn(),
  recordRevenueRecognition: vi.fn(),
  updateDeferredRevenueBalance: vi.fn()
}));

vi.mock('../src/config/env.js', () => ({
  env: {
    monetization: {
      reconciliation: {
        enabled: true,
        cronExpression: '5 * * * *',
        timezone: 'Etc/UTC',
        runOnStartup: false,
        recognitionWindowDays: 30,
        tenants: [],
        tenantCacheMinutes: 10
      }
    },
    database: {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      name: 'test',
      poolMin: 1,
      poolMax: 1
    },
    security: {
      dataEncryption: {
        activeKeyId: 'test-key',
        keys: { 'test-key': 'local-secret' },
        defaultClassification: 'general'
      }
    }
  }
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

import { MonetizationReconciliationJob } from '../src/jobs/monetizationReconciliationJob.js';

describe('MonetizationReconciliationJob', () => {
  let service;
  let scheduler;

  beforeEach(() => {
    service = {
      recognizeDeferredRevenue: vi.fn(),
      runReconciliation: vi.fn(),
      listActiveTenants: vi.fn()
    };

    scheduler = {
      validate: vi.fn().mockReturnValue(true),
      schedule: vi.fn()
    };
  });

  it('normalises tenant allow list from configuration', async () => {
    const job = new MonetizationReconciliationJob({
      service,
      scheduler,
      config: {
        enabled: true,
        tenants: ['Global', 'TENANT-BETA', ''],
        tenantCacheMinutes: 5,
        recognitionWindowDays: 7
      }
    });

    const tenants = await job.resolveTenants();
    expect(tenants).toEqual(['global', 'tenant-beta']);
  });

  it('discovers tenants and executes reconciliation per tenant', async () => {
    service.listActiveTenants.mockResolvedValue(['global', 'tenant-b']);
    service.recognizeDeferredRevenue.mockImplementation(({ tenantId }) =>
      Promise.resolve({ status: 'recognized', processed: 1, amount: tenantId === 'global' ? 5000 : 2000 })
    );
    service.runReconciliation.mockImplementation(({ tenantId }) =>
      Promise.resolve({ tenantId, invoicedCents: tenantId === 'global' ? 5000 : 2100 })
    );

    const job = new MonetizationReconciliationJob({
      service,
      scheduler,
      config: {
        enabled: true,
        tenantCacheMinutes: 1,
        recognitionWindowDays: 7
      }
    });

    const summary = await job.runCycle('manual');

    expect(service.listActiveTenants).toHaveBeenCalledTimes(1);
    expect(service.recognizeDeferredRevenue).toHaveBeenCalledTimes(2);
    expect(service.runReconciliation).toHaveBeenCalledTimes(2);
    expect(summary.tenants).toHaveLength(2);
    expect(summary.tenants[0]).toMatchObject({ tenantId: 'global' });
    expect(job.consecutiveFailures).toBe(0);
    expect(job.pausedUntil).toBeNull();
  });

  it('aggregates tenant failures and increments failure counter', async () => {
    service.listActiveTenants.mockResolvedValue(['global', 'tenant-b']);
    service.recognizeDeferredRevenue.mockResolvedValue({ status: 'idle', processed: 0, amount: 0 });
    service.runReconciliation.mockImplementation(({ tenantId }) => {
      if (tenantId === 'tenant-b') {
        return Promise.reject(new Error('tenant failure'));
      }
      return Promise.resolve({ tenantId, invoicedCents: 1000 });
    });

    const job = new MonetizationReconciliationJob({
      service,
      scheduler,
      config: {
        enabled: true,
        tenantCacheMinutes: 1,
        recognitionWindowDays: 7
      }
    });

    await expect(job.runCycle('manual')).rejects.toMatchObject({
      name: 'MonetizationReconciliationError'
    });

    expect(job.consecutiveFailures).toBe(1);
    expect(service.recognizeDeferredRevenue).toHaveBeenCalledTimes(2);
    expect(service.runReconciliation).toHaveBeenCalledTimes(2);
  });

  it('caches discovered tenants until the cache expires', async () => {
    service.listActiveTenants.mockResolvedValue(['global']);
    service.recognizeDeferredRevenue.mockResolvedValue({ status: 'idle', processed: 0, amount: 0 });
    service.runReconciliation.mockResolvedValue({ tenantId: 'global', invoicedCents: 0 });

    const job = new MonetizationReconciliationJob({
      service,
      scheduler,
      config: {
        enabled: true,
        tenantCacheMinutes: 1,
        recognitionWindowDays: 7
      }
    });

    await job.runCycle('manual');
    expect(service.listActiveTenants).toHaveBeenCalledTimes(1);

    service.listActiveTenants.mockResolvedValue(['global', 'tenant-new']);
    // Cache still valid, so runCycle should not call listActiveTenants again
    await job.runCycle('manual');
    expect(service.listActiveTenants).toHaveBeenCalledTimes(1);

    // Expire cache manually and ensure refresh occurs
    job.tenantCache.expiresAt = new Date(Date.now() - 1000);
    await job.runCycle('manual');
    expect(service.listActiveTenants).toHaveBeenCalledTimes(2);
  });
});
