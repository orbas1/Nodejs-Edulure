import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let logger;
let startWebServer;
let startWorkerService;
let startRealtimeServer;
let bootstrapServices;

beforeEach(async () => {
  vi.resetModules();

  logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => logger)
  };

  startWebServer = vi.fn();
  startWorkerService = vi.fn();
  startRealtimeServer = vi.fn();

  vi.doMock('../src/config/logger.js', () => ({
    default: logger
  }));

  vi.doMock('../src/servers/webServer.js', () => ({
    startWebServer
  }));

  vi.doMock('../src/servers/workerService.js', () => ({
    startWorkerService
  }));

  vi.doMock('../src/servers/realtimeServer.js', () => ({
    startRealtimeServer
  }));

  ({ bootstrapServices } = await import('../src/server.js'));
});

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('server bootstrap orchestrator', () => {
  it('starts the web service by default', async () => {
    const stop = vi.fn();
    startWebServer.mockResolvedValue({ stop });

    const orchestrator = await bootstrapServices({ withSignalHandlers: false });

    expect(startWebServer).toHaveBeenCalledWith({ withSignalHandlers: false });
    expect(orchestrator.targets).toEqual(['web']);

    await orchestrator.stop();
    expect(stop).toHaveBeenCalled();
  });

  it('respects SERVICE_TARGET env configuration', async () => {
    const stopWeb = vi.fn();
    const stopWorker = vi.fn();
    startWebServer.mockResolvedValue({ stop: stopWeb });
    startWorkerService.mockResolvedValue({ stop: stopWorker });

    const orchestrator = await bootstrapServices({
      withSignalHandlers: false,
      env: { SERVICE_TARGET: 'web,worker' }
    });

    expect(startWebServer).toHaveBeenCalled();
    expect(startWorkerService).toHaveBeenCalled();
    expect(orchestrator.targets).toEqual(['web', 'worker']);

    await orchestrator.stop();
    expect(stopWeb).toHaveBeenCalled();
    expect(stopWorker).toHaveBeenCalled();
  });

  it('supports CLI target overrides', async () => {
    const stopWorker = vi.fn();
    startWorkerService.mockResolvedValue({ stop: stopWorker });

    const orchestrator = await bootstrapServices({ withSignalHandlers: false, argv: ['worker'] });

    expect(startWebServer).not.toHaveBeenCalled();
    expect(startWorkerService).toHaveBeenCalledWith({ withSignalHandlers: false });
    expect(orchestrator.targets).toEqual(['worker']);

    await orchestrator.stop();
    expect(stopWorker).toHaveBeenCalled();
  });

  it('expands the all target and boots every service', async () => {
    const stopWeb = vi.fn();
    const stopWorker = vi.fn();
    const stopRealtime = vi.fn();
    startWebServer.mockResolvedValue({ stop: stopWeb });
    startWorkerService.mockResolvedValue({ stop: stopWorker });
    startRealtimeServer.mockResolvedValue({ stop: stopRealtime });

    const orchestrator = await bootstrapServices({ withSignalHandlers: false, targets: ['all'] });

    expect(startWebServer).toHaveBeenCalled();
    expect(startWorkerService).toHaveBeenCalled();
    expect(startRealtimeServer).toHaveBeenCalled();
    expect(orchestrator.targets).toEqual(['web', 'worker', 'realtime']);

    await orchestrator.stop();
    expect(stopWeb).toHaveBeenCalled();
    expect(stopWorker).toHaveBeenCalled();
    expect(stopRealtime).toHaveBeenCalled();
  });

  it('throws on unknown service targets', async () => {
    await expect(
      bootstrapServices({ withSignalHandlers: false, targets: ['unknown'] })
    ).rejects.toThrow(/Unknown service target/);

    expect(startWebServer).not.toHaveBeenCalled();
    expect(startWorkerService).not.toHaveBeenCalled();
    expect(startRealtimeServer).not.toHaveBeenCalled();
  });

  it('rolls back previously started services on startup failure', async () => {
    const stopWeb = vi.fn();
    startWebServer.mockResolvedValue({ stop: stopWeb });
    startWorkerService.mockRejectedValue(new Error('boom'));

    await expect(
      bootstrapServices({ withSignalHandlers: false, targets: ['web', 'worker'] })
    ).rejects.toThrow('boom');

    expect(stopWeb).toHaveBeenCalled();
  });
});
