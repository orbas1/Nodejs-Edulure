import http from 'node:http';

import { env } from '../config/env.js';
import { healthcheck } from '../config/database.js';
import { createProbeApp } from '../observability/probes.js';
import { createServiceRuntime } from './runtimeEnvironment.js';
import attachRealtimeGateway from './realtimeGateway.js';

export async function startRealtimeServer({ withSignalHandlers = true } = {}) {
  const runtime = await createServiceRuntime({
    serviceName: 'realtime-service',
    readinessTargets: [
      'database',
      'feature-flags',
      'runtime-config',
      'search-cluster',
      'socket-gateway',
      'probe-server'
    ],
    runMigrations: false
  });

  const { readiness, registry, logger: serviceLogger } = runtime;

  const probeApp = createProbeApp({
    service: 'realtime-service',
    readinessCheck: () => readiness.snapshot(),
    livenessCheck: async () => {
      await healthcheck();
      return { alive: true };
    }
  });

  probeApp.get('/health', async (_req, res) => {
    try {
      await healthcheck();
      res.status(200).json({ status: 'ok', checkedAt: new Date().toISOString() });
    } catch (error) {
      res.status(503).json({ status: 'degraded', error: error.message ?? String(error) });
    }
  });

  const httpServer = http.createServer(probeApp);

  let socketGatewayPending = false;
  let realtimeAttachment;

  readiness.markPending('socket-gateway', 'Initialising realtime gateway');
  socketGatewayPending = true;
  try {
    realtimeAttachment = await attachRealtimeGateway({ httpServer, readiness, logger: serviceLogger });
    await new Promise((resolve, reject) => {
      httpServer.once('error', (error) => {
        readiness.markFailed('socket-gateway', error);
        reject(error);
      });

      httpServer.listen(env.services.realtime.port, () => {
        realtimeAttachment.markListening(env.services.realtime.port);
        socketGatewayPending = false;
        resolve();
      });
    });
  } catch (error) {
    if (socketGatewayPending) {
      readiness.markFailed('socket-gateway', error);
    }

    serviceLogger.error({ err: error }, 'Failed to start realtime service');

    if (realtimeAttachment) {
      await realtimeAttachment.stop('startup-failure');
    }

    await runtime.dispose({ reason: 'startup-failure' });
    throw error;
  }

  let isShuttingDown = false;

  async function shutdown(signal = 'manual', { exitProcess = false, exitCode = 0 } = {}) {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    readiness.markPending('socket-gateway', `Shutting down (${signal})`);

    await new Promise((resolve) => {
      httpServer.close(() => {
        readiness.markDegraded('socket-gateway', 'Stopped');
        resolve();
      });
    });

    if (realtimeAttachment) {
      await realtimeAttachment.stop(signal);
    }

    await runtime.dispose({ reason: signal, exitProcess, exitCode });
  }

  if (withSignalHandlers) {
    const terminate = (signal) => {
      serviceLogger.warn({ signal }, 'Received termination signal');
      shutdown(signal, { exitProcess: true, exitCode: 0 }).catch((error) => {
        serviceLogger.error({ err: error }, 'Error during shutdown');
        process.exit(1);
      });
    };

    registry.add('SIGINT', terminate, { once: true });
    registry.add('SIGTERM', terminate, { once: true });

    registry.add('unhandledRejection', (reason) => {
      serviceLogger.error({ err: reason }, 'Unhandled promise rejection');
    });

    registry.add('uncaughtException', (error) => {
      serviceLogger.fatal({ err: error }, 'Uncaught exception');
      readiness.markFailed('socket-gateway', error);
      shutdown('uncaughtException', { exitProcess: true, exitCode: 1 }).catch(() => {
        process.exit(1);
      });
    });
  }

  return {
    port: env.services.realtime.port,
    readiness,
    async stop() {
      await shutdown('manual');
    }
  };
}
