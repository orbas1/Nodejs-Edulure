import { fileURLToPath } from 'node:url';
import path from 'node:path';

import logger from './config/logger.js';
import { startRealtimeServer } from './servers/realtimeServer.js';
import { createProcessSignalRegistry } from './servers/processSignalRegistry.js';
import { startWebServer } from './servers/webServer.js';
import { startWorkerService } from './servers/workerService.js';
import { resolveServiceTargets } from './servers/runtimeOptions.js';

const SERVICE_STARTERS = new Map([
  ['web', startWebServer],
  ['worker', startWorkerService],
  ['realtime', startRealtimeServer]
]);

async function stopServices(services, loggerInstance, signal) {
  const context = { signal, count: services.length };
  loggerInstance.info(context, 'Stopping orchestrated services');

  const errors = [];
  for (const entry of [...services].reverse()) {
    const { name, instance } = entry;
    if (!instance || typeof instance.stop !== 'function') {
      loggerInstance.debug({ service: name }, 'Service does not expose a stop handler');
      continue;
    }

    try {
      await instance.stop();
      loggerInstance.info({ service: name }, 'Service stopped');
    } catch (error) {
      errors.push({ name, error });
      loggerInstance.error({ service: name, err: error }, 'Failed to stop service gracefully');
    }
  }

  if (errors.length) {
    const error = new Error('One or more services failed to stop cleanly');
    error.causes = errors;
    throw error;
  }
}

export async function bootstrapServices({
  targets,
  argv = process.argv.slice(2),
  env = process.env,
  loggerInstance = logger,
  withSignalHandlers = true
} = {}) {
  const { targets: resolvedTargets } = resolveServiceTargets({
    explicitTargets: targets?.length ? targets : undefined,
    envSource: {
      ...env,
      SERVICE_TARGET: (() => {
        if (targets && targets.length) {
          return targets.join(',');
        }
        const cliTokens = [];
        argv.forEach((arg) => {
          if (!arg) {
            return;
          }
          if (arg.startsWith('--')) {
            const [flag, value] = arg.split('=', 2);
            if (!value) {
              return;
            }
            if (['--service', '--services', '--target', '--targets'].includes(flag)) {
              value.split(',').forEach((entry) => cliTokens.push(entry));
            }
            return;
          }
          cliTokens.push(arg);
        });
        return cliTokens.length ? cliTokens.join(',') : env.SERVICE_TARGET;
      })()
    },
    availableTargets: Array.from(SERVICE_STARTERS.keys())
  });
  const startedServices = [];
  let shuttingDown = false;
  const registry = createProcessSignalRegistry();

  const shutdown = async (signal = 'manual', { exitProcess = false, exitCode = 0 } = {}) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    let shutdownError = null;
    let computedExitCode = exitCode;

    try {
      await stopServices(startedServices, loggerInstance, signal);
      loggerInstance.info({ signal }, 'All services stopped');
    } catch (error) {
      loggerInstance.error({ err: error, signal }, 'Errors encountered while stopping services');
      shutdownError = error;
      computedExitCode = Math.max(exitCode, 1);
    }

    registry.cleanup();

    if (exitProcess) {
      process.exit(computedExitCode);
    }

    if (shutdownError) {
      throw shutdownError;
    }
  };

  try {
    for (const target of resolvedTargets) {
      const starter = SERVICE_STARTERS.get(target);
      const instance = await starter({ withSignalHandlers: false });
      startedServices.push({ name: target, instance });
      loggerInstance.info({ service: target }, 'Service bootstrap complete');
    }
  } catch (error) {
    loggerInstance.fatal({ err: error }, 'Service bootstrap failed');
    await stopServices(startedServices, loggerInstance, 'bootstrap-failure').catch((stopError) => {
      loggerInstance.error({ err: stopError }, 'Error while rolling back partially started services');
    });
    throw error;
  }

  if (withSignalHandlers) {
    const handleTermination = (signal) => {
      loggerInstance.warn({ signal }, 'Termination signal received');
      shutdown(signal, { exitProcess: true, exitCode: 0 }).catch((error) => {
        loggerInstance.fatal({ err: error, signal }, 'Shutdown failed after termination signal');
        process.exit(1);
      });
    };

    registry.add('SIGINT', handleTermination, { once: true });
    registry.add('SIGTERM', handleTermination, { once: true });

    registry.add('unhandledRejection', (reason) => {
      loggerInstance.error({ err: reason }, 'Unhandled promise rejection detected');
    });

    registry.add('uncaughtException', (error) => {
      loggerInstance.fatal({ err: error }, 'Uncaught exception detected');
      shutdown('uncaughtException', { exitProcess: true, exitCode: 1 }).catch(() => {
        process.exit(1);
      });
    });
  }

  loggerInstance.info({ services: resolvedTargets }, 'All requested services bootstrapped');

  return {
    services: startedServices,
    targets: resolvedTargets,
    async stop() {
      await shutdown('manual');
    }
  };
}

const isExecutedDirectly = (() => {
  const entry = process.argv[1];
  const currentFile = fileURLToPath(import.meta.url);
  return entry && path.resolve(entry) === currentFile;
})();

if (isExecutedDirectly) {
  bootstrapServices().catch((error) => {
    logger.fatal({ err: error }, 'Failed to bootstrap requested services');
    process.exit(1);
  });
}
