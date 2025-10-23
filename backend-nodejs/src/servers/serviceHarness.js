import http from 'node:http';

import { ensureDatabaseConnection, startCoreInfrastructure } from '../bootstrap/bootstrap.js';
import logger from '../config/logger.js';
import { createProbeApp } from '../observability/probes.js';
import { createReadinessTracker } from '../observability/readiness.js';
import { createProcessSignalRegistry } from './processSignalRegistry.js';

export async function createServiceRuntime({
  serviceName,
  readinessKeys = [],
  withSignalHandlers = true,
  loggerInstance = logger,
  livenessCheck
} = {}) {
  if (!serviceName) {
    throw new Error('createServiceRuntime requires a serviceName.');
  }

  const readiness = createReadinessTracker(serviceName, readinessKeys);
  const serviceLogger = loggerInstance.child({ service: serviceName });
  const registry = createProcessSignalRegistry();
  const cleanupTasks = [];
  let shuttingDown = false;

  const registerCleanup = (name, fn) => {
    cleanupTasks.push({ name, fn });
  };

  const databaseHandle = await ensureDatabaseConnection({ runMigrations: false, readiness });
  registerCleanup('database', () => databaseHandle.close());

  const infrastructure = await startCoreInfrastructure({ readiness });
  registerCleanup('infrastructure', () => infrastructure.stop());

  const probeApp = createProbeApp({
    service: serviceName,
    readinessCheck: () => readiness.snapshot(),
    livenessCheck: async () => {
      if (typeof livenessCheck === 'function') {
        return livenessCheck();
      }
      return { alive: true };
    }
  });

  const probeServer = http.createServer(probeApp);
  registerCleanup('probe-server', () =>
    new Promise((resolve) => {
      probeServer.close(() => resolve());
    })
  );

  const startProbeServer = async (port) => {
    if (!port) {
      serviceLogger.warn('Probe port not provided; skipping probe server start.');
      return;
    }

    readiness.markPending('probe-server', `Listening on port ${port}`);
    await new Promise((resolve, reject) => {
      probeServer.once('error', (error) => {
        readiness.markFailed('probe-server', error);
        reject(error);
      });
      probeServer.listen(port, () => {
        readiness.markReady('probe-server', `Listening on port ${port}`);
        serviceLogger.info({ port }, 'Probe server listening');
        resolve();
      });
    });
  };

  const shutdown = async (signal = 'manual', { exitProcess = false, exitCode = 0 } = {}) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    serviceLogger.info({ signal }, 'Service shutdown initiated');

    for (const { name, fn } of [...cleanupTasks].reverse()) {
      try {
        await Promise.resolve(fn());
        readiness.markDegraded(name, 'Stopped');
        serviceLogger.debug({ component: name }, 'Cleanup task complete');
      } catch (error) {
        serviceLogger.error({ err: error, component: name }, 'Cleanup task failed');
      }
    }

    registry.cleanup();

    if (exitProcess) {
      process.exit(exitCode);
    }
  };

  if (withSignalHandlers) {
    const handleTermination = (signal) => {
      serviceLogger.warn({ signal }, 'Termination signal received');
      shutdown(signal, { exitProcess: true, exitCode: 0 }).catch((error) => {
        serviceLogger.error({ err: error }, 'Shutdown failed after termination signal');
        process.exit(1);
      });
    };

    registry.add('SIGINT', handleTermination, { once: true });
    registry.add('SIGTERM', handleTermination, { once: true });

    registry.add('unhandledRejection', (reason) => {
      serviceLogger.error({ err: reason }, 'Unhandled promise rejection detected');
    });

    registry.add('uncaughtException', (error) => {
      serviceLogger.fatal({ err: error }, 'Uncaught exception detected');
      shutdown('uncaughtException', { exitProcess: true, exitCode: 1 }).catch(() => {
        process.exit(1);
      });
    });
  }

  return {
    logger: serviceLogger,
    readiness,
    registerCleanup,
    startProbeServer,
    shutdown,
    probeApp,
    probeServer,
    registry
  };
}

export default createServiceRuntime;
