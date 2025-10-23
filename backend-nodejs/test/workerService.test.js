import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('startWorkerService', () => {
  let startWorkerService;
  let createServiceRuntime;
  let resolveRuntimeToggles;
  let startBackgroundJobs;
  let readiness;
  let runtimeDispose;
  let jobRunnerStop;
  let createProbeApp;
  let httpServer;

  beforeEach(async () => {
    vi.resetModules();

    readiness = {
      markPending: vi.fn(),
      markReady: vi.fn(),
      markFailed: vi.fn(),
      markDegraded: vi.fn(),
      snapshot: vi.fn(() => ({ status: 'ok' }))
    };

    runtimeDispose = vi.fn();
    jobRunnerStop = vi.fn().mockResolvedValue();

    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(() => logger)
    };

    createServiceRuntime = vi.fn(async () => ({
      readiness,
      registry: {
        add: vi.fn(),
        cleanup: vi.fn()
      },
      logger,
      dispose: runtimeDispose
    }));

    resolveRuntimeToggles = vi.fn(() => ({
      enableJobs: true,
      enableRealtime: true,
      preset: 'full',
      jobGroups: 'all'
    }));

    startBackgroundJobs = vi.fn(async () => ({ stop: jobRunnerStop }));

    createProbeApp = vi.fn(() => {
      const handler = () => {};
      handler.get = vi.fn();
      return handler;
    });

    httpServer = {
      once: vi.fn((event, handler) => {
        if (event === 'error') {
          httpServer.__errorHandler = handler;
        }
      }),
      listen: vi.fn((port, callback) => {
        callback();
      }),
      close: vi.fn((callback) => {
        callback();
      })
    };

    const createServer = vi.fn(() => httpServer);

    vi.doMock('node:http', () => ({
      default: { createServer },
      createServer
    }));

    vi.doMock('../src/config/env.js', () => ({
      env: { services: { worker: { probePort: 4500 } } }
    }));

    vi.doMock('../src/observability/probes.js', () => ({
      createProbeApp
    }));

    vi.doMock('../src/servers/runtimeEnvironment.js', () => ({
      createServiceRuntime
    }));

    vi.doMock('../src/servers/runtimeToggles.js', () => ({
      default: resolveRuntimeToggles
    }));

    vi.doMock('../src/servers/workerRoutines.js', () => ({
      BACKGROUND_JOB_TARGETS: ['asset-ingestion'],
      startBackgroundJobs
    }));

    ({ startWorkerService } = await import('../src/servers/workerService.js'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts worker service and background jobs when enabled', async () => {
    const instance = await startWorkerService({ withSignalHandlers: false });

    expect(createServiceRuntime).toHaveBeenCalledWith({
      serviceName: 'worker-service',
      readinessTargets: [
        'database',
        'feature-flags',
        'runtime-config',
        'search-cluster',
        'asset-ingestion',
        'data-retention',
        'community-reminder',
        'moderation-follow-up',
        'data-partitioning',
        'telemetry-warehouse',
        'monetization-reconciliation',
        'integration-orchestrator',
        'webhook-event-bus',
        'domain-event-dispatcher',
        'probe-server'
      ],
      runMigrations: false
    });

    expect(createProbeApp).toHaveBeenCalledWith({
      service: 'worker-service',
      readinessCheck: expect.any(Function),
      livenessCheck: expect.any(Function)
    });

    expect(startBackgroundJobs).toHaveBeenCalledWith({ readiness, logger: expect.any(Object) });
    expect(httpServer.listen).toHaveBeenCalledWith(4500, expect.any(Function));

    await instance.stop();

    expect(httpServer.close).toHaveBeenCalled();
    expect(jobRunnerStop).toHaveBeenCalled();
    expect(runtimeDispose).toHaveBeenCalledWith({ reason: 'manual', exitProcess: false, exitCode: 0 });
  });

  it('degrades background job targets when toggles disable them', async () => {
    resolveRuntimeToggles.mockReturnValue({
      enableJobs: false,
      enableRealtime: false,
      preset: 'lite',
      jobGroups: 'core'
    });

    const instance = await startWorkerService({ withSignalHandlers: false });

    expect(readiness.markDegraded).toHaveBeenCalledWith(
      'asset-ingestion',
      'Background jobs disabled by preset'
    );
    expect(startBackgroundJobs).not.toHaveBeenCalled();

    await instance.stop();
  });

  it('cleans up when probe server fails to start', async () => {
    const listenError = new Error('port in use');
    httpServer.listen.mockImplementation((_port, _callback) => {
      httpServer.__errorHandler?.(listenError);
    });

    await expect(startWorkerService({ withSignalHandlers: false })).rejects.toThrow(listenError);

    expect(readiness.markFailed).toHaveBeenCalledWith('probe-server', listenError);
    expect(jobRunnerStop).toHaveBeenCalled();
    expect(runtimeDispose).toHaveBeenCalledWith({ reason: 'startup-failure' });
  });
});
