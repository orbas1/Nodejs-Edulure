import { ensureDatabaseConnection, startCoreInfrastructure } from '../bootstrap/bootstrap.js';
import logger from '../config/logger.js';
import { createReadinessTracker } from '../observability/readiness.js';
import { createProcessSignalRegistry } from './processSignalRegistry.js';

export async function createServiceRuntime({
  serviceName,
  readinessTargets = [],
  runMigrations = false,
  loggerInstance = logger
} = {}) {
  if (!serviceName) {
    throw new Error('createServiceRuntime requires a serviceName');
  }

  const serviceLogger = loggerInstance.child({ service: serviceName });
  const readiness = createReadinessTracker(serviceName, readinessTargets);
  const registry = createProcessSignalRegistry();

  let databaseHandle = null;
  let infrastructure = null;
  let disposed = false;

  try {
    databaseHandle = await ensureDatabaseConnection({ runMigrations, readiness });
  } catch (error) {
    serviceLogger.error({ err: error }, 'Failed to initialise database connection');
    readiness.markFailed('database', error);
    registry.cleanup();
    throw error;
  }

  try {
    infrastructure = await startCoreInfrastructure({ readiness });
  } catch (error) {
    serviceLogger.error({ err: error }, 'Failed to start core infrastructure services');
    if (databaseHandle) {
      await Promise.resolve(databaseHandle.close()).catch((closeError) => {
        serviceLogger.error({ err: closeError }, 'Error closing database connection after infrastructure failure');
      });
    }
    registry.cleanup();
    throw error;
  }

  async function dispose({
    reason = 'manual',
    exitProcess = false,
    exitCode = 0
  } = {}) {
    if (disposed) {
      return;
    }
    disposed = true;

    registry.cleanup();

    if (infrastructure) {
      await Promise.resolve(infrastructure.stop()).catch((error) => {
        serviceLogger.error({ err: error, reason }, 'Error stopping core infrastructure');
      });
    }

    if (databaseHandle) {
      await Promise.resolve(databaseHandle.close()).catch((error) => {
        serviceLogger.error({ err: error, reason }, 'Error closing database connection');
      });
    }

    if (exitProcess) {
      process.exit(exitCode);
    }
  }

  return {
    readiness,
    registry,
    logger: serviceLogger,
    infrastructure,
    databaseHandle,
    async dispose(options) {
      await dispose(options);
    }
  };
}

export default createServiceRuntime;
