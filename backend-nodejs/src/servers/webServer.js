import http from 'node:http';

import app, { registerReadinessProbe } from '../app.js';
import { ensureDatabaseConnection, startCoreInfrastructure } from '../bootstrap/bootstrap.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { createReadinessTracker } from '../observability/readiness.js';

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

  let databaseHandle = null;
  try {
    databaseHandle = await ensureDatabaseConnection({ runMigrations: true, readiness });
  } catch (error) {
    serviceLogger.error({ err: error }, 'Failed to initialise database connection');
    readiness.markFailed('database', error);
  }

  const infrastructure = await startCoreInfrastructure({ readiness });

  const server = http.createServer(app);
  readiness.markPending('http-server', 'Starting HTTP server');

  await new Promise((resolve, reject) => {
    server.once('error', (error) => {
      readiness.markFailed('http-server', error);
      reject(error);
    });

    server.listen(env.services.web.port, () => {
      readiness.markReady('http-server', `Listening on port ${env.services.web.port}`);
      serviceLogger.info({ port: env.services.web.port }, 'Web service listening');
      resolve();
    });
  });

  let isShuttingDown = false;

  async function shutdown(signal = 'manual', { exitProcess = false, exitCode = 0 } = {}) {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    readiness.markPending('http-server', `Shutting down (${signal})`);

    await new Promise((resolve) => {
      server.close(() => {
        readiness.markDegraded('http-server', 'Stopped');
        resolve();
      });
    });

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
