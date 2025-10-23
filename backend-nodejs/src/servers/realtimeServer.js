import { env } from '../config/env.js';
import { healthcheck } from '../config/database.js';
import logger from '../config/logger.js';
import realtimeService from '../services/RealtimeService.js';
import createServiceRuntime from './serviceHarness.js';
import { formatLog, resolveRuntimeOptions } from './runtimeOptions.js';

const STATUS_READY = 'status:ready';

export async function startRealtimeServer({ withSignalHandlers = true } = {}) {
  const runtimeOptions = resolveRuntimeOptions();
  const readinessKeys = ['database', 'feature-flags', 'runtime-config', 'socket-gateway', 'probe-server'];

  const runtime = await createServiceRuntime({
    serviceName: 'realtime-service',
    readinessKeys,
    withSignalHandlers,
    loggerInstance: logger,
    livenessCheck: async () => {
      await healthcheck();
      return { alive: true };
    }
  });

  const { readiness, registerCleanup, probeApp, probeServer, logger: runtimeLogger } = runtime;
  const realtimePrefix = runtimeOptions.logPrefixes?.realtime;
  const annotate = (message) => formatLog(realtimePrefix, message);

  runtimeLogger.info(
    { preset: runtimeOptions.preset },
    annotate('Realtime runtime initialised')
  );

  probeApp.get('/health', async (_req, res) => {
    try {
      await healthcheck();
      res.status(200).json({ status: 'ok', checkedAt: new Date().toISOString() });
    } catch (error) {
      res.status(503).json({ status: 'degraded', error: error.message ?? String(error) });
    }
  });

  readiness.markPending('socket-gateway', 'Initialising realtime gateway');
  try {
    await realtimeService.start(probeServer);
    registerCleanup('socket-gateway', () => realtimeService.stop());
    readiness.markReady('socket-gateway', `${STATUS_READY} Realtime gateway initialised`);
  } catch (error) {
    readiness.markFailed('socket-gateway', error);
    runtimeLogger.error({ err: error }, annotate('Failed to start realtime service'));
    await runtime.shutdown('bootstrap-failure');
    throw error;
  }

  await runtime.startProbeServer(env.services.realtime.port);
  runtimeLogger.info({ port: env.services.realtime.port }, annotate('Realtime service listening'));

  return {
    async stop() {
      await runtime.shutdown('manual');
    }
  };
}

export default startRealtimeServer;
