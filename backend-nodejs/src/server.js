import { fileURLToPath } from 'node:url';
import path from 'node:path';

import logger from './config/logger.js';
import { startRealtimeServer } from './servers/realtimeServer.js';
import { createProcessSignalRegistry } from './servers/processSignalRegistry.js';
import { startWebServer } from './servers/webServer.js';
import { startWorkerService } from './servers/workerService.js';

const SERVICE_STARTERS = new Map([
  ['web', startWebServer],
  ['worker', startWorkerService],
  ['realtime', startRealtimeServer]
]);

const DEFAULT_SERVICE_ORDER = Array.from(SERVICE_STARTERS.keys());

function normaliseTokens(rawTargets = []) {
  const entries = Array.isArray(rawTargets) ? rawTargets : String(rawTargets).split(',');
  const seen = new Set();
  const orderedTargets = [];

  const append = (target) => {
    if (!seen.has(target)) {
      seen.add(target);
      orderedTargets.push(target);
    }
  };

  entries
    .map((token) => String(token).trim().toLowerCase())
    .filter(Boolean)
    .forEach((token) => {
      if (token === 'all') {
        DEFAULT_SERVICE_ORDER.forEach((service) => append(service));
        return;
      }

      if (!SERVICE_STARTERS.has(token)) {
        throw new Error(`Unknown service target "${token}". Supported targets: ${DEFAULT_SERVICE_ORDER.join(', ')}`);
      }

      append(token);
    });

  if (!orderedTargets.length) {
    throw new Error('At least one service target must be specified.');
  }

  return orderedTargets;
}

function resolveTargets({ explicitTargets, argv = [], env = process.env } = {}) {
  if (explicitTargets && explicitTargets.length) {
    return normaliseTokens(explicitTargets);
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

  if (cliTokens.length) {
    return normaliseTokens(cliTokens);
  }

  if (env.SERVICE_TARGET) {
    return normaliseTokens(String(env.SERVICE_TARGET).split(','));
  }

  return normaliseTokens(['web']);
}

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
  const resolvedTargets = resolveTargets({ explicitTargets: targets, argv, env });
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
