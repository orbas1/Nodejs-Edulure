import http from 'node:http';

import { ensureDatabaseConnection, startCoreInfrastructure } from '../bootstrap/bootstrap.js';
import { env } from '../config/env.js';
import { healthcheck } from '../config/database.js';
import logger from '../config/logger.js';
import { createProbeApp } from '../observability/probes.js';
import { createReadinessTracker } from '../observability/readiness.js';
import realtimeService from '../services/RealtimeService.js';

const serviceLogger = logger.child({ service: 'realtime-service' });

export async function startRealtimeServer({ withSignalHandlers = true } = {}) {
  const readiness = createReadinessTracker('realtime-service', [
    'database',
    'feature-flags',
    'runtime-config',
    'search-cluster',
    'socket-gateway'
  ]);

  let databaseHandle = null;
  try {
    databaseHandle = await ensureDatabaseConnection({ runMigrations: false, readiness });
  } catch (error) {
    serviceLogger.error({ err: error }, 'Failed to connect to database');
    readiness.markFailed('database', error);
  }

  const infrastructure = await startCoreInfrastructure({ readiness });

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

  readiness.markPending('socket-gateway', 'Initialising realtime gateway');
  try {
    await realtimeService.start(httpServer);
  } catch (error) {
    readiness.markFailed('socket-gateway', error);
    serviceLogger.error({ err: error }, 'Failed to start realtime service');
  }

  await new Promise((resolve, reject) => {
    httpServer.once('error', (error) => {
      readiness.markFailed('socket-gateway', error);
      reject(error);
    });

    httpServer.listen(env.services.realtime.port, () => {
      readiness.markReady('socket-gateway', `Listening on port ${env.services.realtime.port}`);
      serviceLogger.info({ port: env.services.realtime.port }, 'Realtime service listening');
      resolve();
    });
  });

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

    try {
      realtimeService.stop();
    } catch (error) {
      serviceLogger.error({ err: error }, 'Error stopping realtime service');
    }

    await infrastructure.stop();

    if (databaseHandle) {
      try {
        await databaseHandle.close();
      } catch (error) {
        serviceLogger.error({ err: error }, 'Error closing database connection');
      }
    }

    if (exitProcess) {
      process.exit(exitCode);
    }
  }

  if (withSignalHandlers) {
    const terminate = (signal) => {
      serviceLogger.warn({ signal }, 'Received termination signal');
      shutdown(signal, { exitProcess: true, exitCode: 0 }).catch((error) => {
        serviceLogger.error({ err: error }, 'Error during shutdown');
        process.exit(1);
      });
    };

    process.on('SIGINT', terminate);
    process.on('SIGTERM', terminate);

    process.on('unhandledRejection', (reason) => {
      serviceLogger.error({ err: reason }, 'Unhandled promise rejection');
    });

    process.on('uncaughtException', (error) => {
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
