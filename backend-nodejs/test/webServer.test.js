import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('startWebServer', () => {
  let startWebServer;
  let createServiceRuntime;
  let resolveRuntimeToggles;
  let startBackgroundJobs;
  let attachRealtimeGateway;
  let readiness;
  let runtimeDispose;
  let registerReadinessProbe;
  let httpServer;
  let jobRunnerStop;
  let realtimeAttachment;

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
    registerReadinessProbe = vi.fn();
    jobRunnerStop = vi.fn().mockResolvedValue();
    realtimeAttachment = {
      markListening: vi.fn(),
      stop: vi.fn().mockResolvedValue()
    };

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
      jobGroups: 'all',
      preset: 'full'
    }));

    startBackgroundJobs = vi.fn(async () => ({ stop: jobRunnerStop }));
    attachRealtimeGateway = vi.fn(async () => realtimeAttachment);

    const createServer = vi.fn(() => httpServer);
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

    vi.doMock('node:http', () => ({
      default: { createServer },
      createServer
    }));
    vi.doMock('../src/app.js', () => ({
      default: vi.fn(),
      registerReadinessProbe
    }));
    vi.doMock('../src/config/env.js', () => ({
      env: { services: { web: { port: 4000 } } }
    }));
    vi.doMock('../src/servers/runtimeEnvironment.js', () => ({
      createServiceRuntime
    }));
    vi.doMock('../src/servers/runtimeToggles.js', () => ({
      default: resolveRuntimeToggles,
      resolveRuntimeToggles
    }));
    vi.doMock('../src/servers/workerRoutines.js', () => ({
      BACKGROUND_JOB_TARGETS: ['asset-ingestion'],
      startBackgroundJobs
    }));
    vi.doMock('../src/servers/realtimeGateway.js', () => ({
      default: attachRealtimeGateway
    }));

    ({ startWebServer } = await import('../src/servers/webServer.js'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts web server with embedded jobs and realtime when enabled', async () => {
    const instance = await startWebServer({ withSignalHandlers: false });

    expect(createServiceRuntime).toHaveBeenCalledWith({
      serviceName: 'web-service',
      readinessTargets: [
        'database',
        'feature-flags',
        'runtime-config',
        'search-cluster',
        'http-server',
        'socket-gateway',
        'asset-ingestion'
      ],
      runMigrations: true
    });
    expect(registerReadinessProbe).toHaveBeenCalledWith(expect.any(Function));
    expect(startBackgroundJobs).toHaveBeenCalledWith({ readiness, logger: expect.any(Object) });
    expect(attachRealtimeGateway).toHaveBeenCalledWith({ httpServer, readiness, logger: expect.any(Object) });
    expect(httpServer.listen).toHaveBeenCalledWith(4000, expect.any(Function));
    expect(realtimeAttachment.markListening).toHaveBeenCalledWith(4000);

    await instance.stop();

    expect(httpServer.close).toHaveBeenCalled();
    expect(jobRunnerStop).toHaveBeenCalled();
    expect(realtimeAttachment.stop).toHaveBeenCalledWith('manual');
    expect(runtimeDispose).toHaveBeenCalledWith({ reason: 'manual', exitProcess: false, exitCode: 0 });
  });

  it('marks jobs and realtime as disabled when toggles are off', async () => {
    resolveRuntimeToggles.mockReturnValue({
      enableJobs: false,
      enableRealtime: false,
      jobGroups: 'core',
      preset: 'lite'
    });

    const instance = await startWebServer({ withSignalHandlers: false });

    expect(readiness.markDegraded).toHaveBeenCalledWith('asset-ingestion', 'Background jobs disabled by preset');
    expect(readiness.markDegraded).toHaveBeenCalledWith('socket-gateway', 'Realtime gateway disabled by preset');
    expect(startBackgroundJobs).not.toHaveBeenCalled();
    expect(attachRealtimeGateway).not.toHaveBeenCalled();

    await instance.stop();
  });

  it('cleans up runtime when HTTP server fails to start', async () => {
    const listenError = new Error('bind failure');
    httpServer.listen.mockImplementation(() => {
      httpServer.__errorHandler?.(listenError);
    });

    await expect(startWebServer({ withSignalHandlers: false })).rejects.toThrow(listenError);

    expect(readiness.markFailed).toHaveBeenCalledWith('http-server', listenError);
    expect(jobRunnerStop).toHaveBeenCalled();
    expect(realtimeAttachment.stop).toHaveBeenCalledWith('startup-failure');
    expect(runtimeDispose).toHaveBeenCalledWith({ reason: 'startup-failure' });
  });
});
