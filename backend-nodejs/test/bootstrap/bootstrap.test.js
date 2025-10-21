import { describe, expect, it, vi } from 'vitest';

const delayMock = vi.fn().mockResolvedValue();

vi.mock('node:timers/promises', () => ({
  setTimeout: delayMock
}));

const dbMock = {
  raw: vi.fn().mockResolvedValue(),
  migrate: { latest: vi.fn().mockResolvedValue() },
  destroy: vi.fn().mockResolvedValue()
};

vi.mock('../../src/config/database.js', () => ({
  default: dbMock
}));

const bootstrapLogger = {
  child: () => bootstrapLogger,
  error: vi.fn(),
  warn: vi.fn()
};

vi.mock('../../src/config/logger.js', () => ({
  default: bootstrapLogger
}));

const featureFlagService = { start: vi.fn().mockResolvedValue(), stop: vi.fn().mockResolvedValue() };
const runtimeConfigService = { start: vi.fn().mockResolvedValue(), stop: vi.fn().mockResolvedValue() };

vi.mock('../../src/services/FeatureFlagService.js', () => ({
  featureFlagService,
  runtimeConfigService
}));

const featureFlagGovernanceService = {
  ensureBootstrapSync: vi.fn().mockResolvedValue()
};

vi.mock('../../src/services/FeatureFlagGovernanceService.js', () => ({
  featureFlagGovernanceService
}));

const searchClusterService = { start: vi.fn().mockResolvedValue(), stop: vi.fn().mockResolvedValue() };

vi.mock('../../src/services/SearchClusterService.js', () => ({
  searchClusterService
}));

vi.mock('../../src/config/env.js', () => ({
  env: {
    bootstrap: { maxAttempts: 3, retryDelayMs: 25 },
    featureFlags: { bootstrapActor: 'test-actor' }
  }
}));

async function loadBootstrap() {
  delayMock.mockClear();
  vi.resetModules();
  return import('../../src/bootstrap/bootstrap.js');
}

describe('bootstrap helpers', () => {
  it('retries operations with exponential backoff until success', async () => {
    const { executeWithRetry } = await loadBootstrap();
    const handler = vi
      .fn()
      .mockRejectedValueOnce(new Error('first failure'))
      .mockResolvedValueOnce('ok');

    const result = await executeWithRetry('retry-test', handler, { attempts: 2, delayMs: 50 });
    expect(result).toBe('ok');
    expect(handler).toHaveBeenCalledTimes(2);
    expect(delayMock).toHaveBeenCalledWith(50);
  });

  it('establishes database connections and applies migrations', async () => {
    const { ensureDatabaseConnection } = await loadBootstrap();
    const readiness = { markPending: vi.fn(), markReady: vi.fn(), markDegraded: vi.fn() };

    const connection = await ensureDatabaseConnection({ readiness });
    expect(dbMock.raw).toHaveBeenCalledWith('select 1 as health_check');
    expect(dbMock.migrate.latest).toHaveBeenCalled();

    await connection.close();
    expect(dbMock.destroy).toHaveBeenCalled();
    expect(readiness.markDegraded).toHaveBeenCalledWith('database', 'Closing connection pool');
  });

  it('boots infrastructure services and tears them down', async () => {
    const { startCoreInfrastructure } = await loadBootstrap();
    const readiness = {
      markPending: vi.fn(),
      markReady: vi.fn(),
      markFailed: vi.fn(),
      markDegraded: vi.fn()
    };

    const controller = await startCoreInfrastructure({ readiness });
    expect(featureFlagGovernanceService.ensureBootstrapSync).toHaveBeenCalled();
    expect(featureFlagService.start).toHaveBeenCalled();
    expect(runtimeConfigService.start).toHaveBeenCalled();
    expect(searchClusterService.start).toHaveBeenCalled();

    await controller.stop();
    expect(featureFlagService.stop).toHaveBeenCalled();
    expect(runtimeConfigService.stop).toHaveBeenCalled();
    expect(searchClusterService.stop).toHaveBeenCalled();
  });
});
