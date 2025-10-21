import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const logger = {
  info: vi.fn(),
  fatal: vi.fn()
};

vi.mock('../../src/config/logger.js', () => ({
  default: logger
}));

const startWebServer = vi.fn();
const startWorkerService = vi.fn();
const startRealtimeServer = vi.fn();

vi.mock('../../src/servers/webServer.js', () => ({
  startWebServer
}));

vi.mock('../../src/servers/workerService.js', () => ({
  startWorkerService
}));

vi.mock('../../src/servers/realtimeServer.js', () => ({
  startRealtimeServer
}));

let exitSpy;

beforeEach(() => {
  exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
  logger.info.mockReset();
  logger.fatal.mockReset();
  startWebServer.mockReset();
  startWorkerService.mockReset();
  startRealtimeServer.mockReset();
});

afterEach(() => {
  exitSpy.mockRestore();
});

async function importFresh(modulePath) {
  vi.resetModules();
  return import(modulePath);
}

describe('service entrypoints', () => {
  it('starts the web server and logs readiness', async () => {
    startWebServer.mockResolvedValueOnce();
    await importFresh('../../src/bin/web.js');
    expect(startWebServer).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Web service bootstrap complete');
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('exits the process when the web server fails', async () => {
    startWebServer.mockRejectedValueOnce(new Error('boom'));
    await importFresh('../../src/bin/web.js');
    expect(logger.fatal).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('boots the worker service', async () => {
    startWorkerService.mockResolvedValueOnce();
    await importFresh('../../src/bin/worker.js');
    expect(startWorkerService).toHaveBeenCalled();
  });

  it('shuts down on worker bootstrap failures', async () => {
    startWorkerService.mockRejectedValueOnce(new Error('fail'));
    await importFresh('../../src/bin/worker.js');
    expect(logger.fatal).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('boots the realtime service', async () => {
    startRealtimeServer.mockResolvedValueOnce();
    await importFresh('../../src/bin/realtime.js');
    expect(startRealtimeServer).toHaveBeenCalled();
  });

  it('exits when realtime bootstrap fails', async () => {
    startRealtimeServer.mockRejectedValueOnce(new Error('no socket'));
    await importFresh('../../src/bin/realtime.js');
    expect(logger.fatal).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
