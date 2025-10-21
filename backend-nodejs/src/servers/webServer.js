import http from 'node:http';

import app, { registerReadinessProbe } from '../app.js';
import { ensureDatabaseConnection, startCoreInfrastructure } from '../bootstrap/bootstrap.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { createReadinessTracker } from '../observability/readiness.js';
import { createProcessSignalRegistry } from './processSignalRegistry.js';

const serviceLogger = logger.child({ service: 'web-service' });

export async function startWebServer({ withSignalHandlers = true } = {}) {
  const readiness = createReadinessTracker('web-service', [
    'database',
    'feature-flags',
    'runtime-config',
    'search-cluster',
    'http-server'
  ]);

  registerReadinessProbe(() => readiness.snapshot());

  const registry = createProcessSignalRegistry();

  let databaseHandle = null;
  try {
    databaseHandle = await ensureDatabaseConnection({ runMigrations: true, readiness });
  } catch (error) {
    serviceLogger.error({ err: error }, 'Failed to initialise database connection');
    readiness.markFailed('database', error);
    registry.cleanup();
    throw error;
  }

  let infrastructure;
  try {
    infrastructure = await startCoreInfrastructure({ readiness });
  } catch (error) {
    serviceLogger.error({ err: error }, 'Failed to start core infrastructure services');
    if (databaseHandle) {
      try {
        await databaseHandle.close();
      } catch (closeError) {
        serviceLogger.error({ err: closeError }, 'Error closing database connection after infrastructure failure');
      }
    }
    registry.cleanup();
    throw error;
  }

  const server = http.createServer(app);
  let httpServerPending = false;
  readiness.markPending('http-server', 'Starting HTTP server');
  httpServerPending = true;

  try {
    await new Promise((resolve, reject) => {
      server.once('error', (error) => {
        readiness.markFailed('http-server', error);
        reject(error);
      });

      server.listen(env.services.web.port, () => {
        readiness.markReady('http-server', `Listening on port ${env.services.web.port}`);
        serviceLogger.info({ port: env.services.web.port }, 'Web service listening');
        httpServerPending = false;
        resolve();
      });
    });
  } catch (error) {
    if (httpServerPending) {
      readiness.markFailed('http-server', error);
    }

    if (infrastructure) {
      await infrastructure.stop().catch((infraError) => {
        serviceLogger.error({ err: infraError }, 'Error stopping infrastructure after web server failure');
      });
    }

    if (databaseHandle) {
      await databaseHandle.close().catch((closeError) => {
        serviceLogger.error({ err: closeError }, 'Error closing database connection after web server failure');
      });
    }

    registry.cleanup();
    throw error;
  }

  let isShuttingDown = false;

  async function shutdown(signal = 'manual', { exitProcess = false, exitCode = 0 } = {}) {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    registry.cleanup();
    readiness.markPending('http-server', `Shutting down (${signal})`);

    await new Promise((resolve) => {
      server.close(() => {
        readiness.markDegraded('http-server', 'Stopped');
        resolve();
      });
    });

    try {
      await infrastructure.stop();
    } catch (error) {
      serviceLogger.error({ err: error }, 'Error stopping core infrastructure');
    }

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

    registry.add('SIGINT', terminate, { once: true });
    registry.add('SIGTERM', terminate, { once: true });

    registry.add('unhandledRejection', (reason) => {
      serviceLogger.error({ err: reason }, 'Unhandled promise rejection');
    });

    registry.add('uncaughtException', (error) => {
      serviceLogger.fatal({ err: error }, 'Uncaught exception');
      readiness.markFailed('http-server', error);
      shutdown('uncaughtException', { exitProcess: true, exitCode: 1 }).catch(() => {
        process.exit(1);
      });
    });
  }

  return {
    port: env.services.web.port,
    readiness,
    async stop() {
      await shutdown('manual');
    }
  };
}
