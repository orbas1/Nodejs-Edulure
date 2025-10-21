import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('startWebServer', () => {
  let startWebServer;
  let ensureDatabaseConnection;
  let startCoreInfrastructure;
  let readiness;
  let registerReadinessProbe;
  let httpServer;
  let closeDatabase;
  let stopInfrastructure;

  beforeEach(async () => {
    vi.resetModules();

    closeDatabase = vi.fn().mockResolvedValue();
    ensureDatabaseConnection = vi.fn().mockResolvedValue({ close: closeDatabase });

    stopInfrastructure = vi.fn().mockResolvedValue();
    startCoreInfrastructure = vi.fn().mockResolvedValue({ stop: stopInfrastructure });

    readiness = {
      markPending: vi.fn(),
      markReady: vi.fn(),
      markFailed: vi.fn(),
      markDegraded: vi.fn(),
      snapshot: vi.fn(() => ({ status: 'ok' }))
    };

    registerReadinessProbe = vi.fn();

    const createServer = vi.fn(() => httpServer);
    httpServer = {
      listening: true,
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

    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(() => logger)
    };

    vi.doMock('node:http', () => ({ createServer }));
    vi.doMock('../src/app.js', () => ({
      default: vi.fn(),
      registerReadinessProbe
    }));
    vi.doMock('../src/bootstrap/bootstrap.js', () => ({
      ensureDatabaseConnection,
      startCoreInfrastructure
    }));
    vi.doMock('../src/config/env.js', () => ({
      env: { services: { web: { port: 4000 } } }
    }));
    vi.doMock('../src/config/logger.js', () => ({
      default: logger
    }));
    vi.doMock('../src/observability/readiness.js', () => ({
      createReadinessTracker: vi.fn(() => readiness)
    }));

    ({ startWebServer } = await import('../src/servers/webServer.js'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts and stops the web server with dependency cleanup', async () => {
    const instance = await startWebServer({ withSignalHandlers: false });

    expect(ensureDatabaseConnection).toHaveBeenCalledWith({ runMigrations: true, readiness });
    expect(startCoreInfrastructure).toHaveBeenCalledWith({ readiness });
    expect(registerReadinessProbe).toHaveBeenCalledWith(expect.any(Function));
    expect(httpServer.listen).toHaveBeenCalledWith(4000, expect.any(Function));

    await instance.stop();

    expect(httpServer.close).toHaveBeenCalled();
    expect(stopInfrastructure).toHaveBeenCalled();
    expect(closeDatabase).toHaveBeenCalled();
    expect(readiness.markDegraded).toHaveBeenCalledWith('http-server', 'Stopped');
  });

  it('bubbles database initialisation failures', async () => {
    const dbError = new Error('db offline');
    ensureDatabaseConnection.mockRejectedValue(dbError);

    await expect(startWebServer({ withSignalHandlers: false })).rejects.toThrow(dbError);

    expect(readiness.markFailed).toHaveBeenCalledWith('database', dbError);
    expect(startCoreInfrastructure).not.toHaveBeenCalled();
    expect(closeDatabase).not.toHaveBeenCalled();
  });

  it('rolls back on HTTP server start failure', async () => {
    const listenError = new Error('bind failure');

    httpServer.listen.mockImplementation(() => {
      httpServer.__errorHandler?.(listenError);
    });

    await expect(startWebServer({ withSignalHandlers: false })).rejects.toThrow(listenError);

    expect(readiness.markFailed).toHaveBeenCalledWith('http-server', listenError);
    expect(stopInfrastructure).toHaveBeenCalled();
    expect(closeDatabase).toHaveBeenCalled();
  });
});
