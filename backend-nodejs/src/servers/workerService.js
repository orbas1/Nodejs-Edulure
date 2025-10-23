import http from 'node:http';

import { createProbeApp } from '../observability/probes.js';
import { createServiceRuntime } from './runtimeEnvironment.js';
import { BACKGROUND_JOB_TARGETS, startBackgroundJobs } from './workerRoutines.js';

export async function startWorkerService({ withSignalHandlers = true } = {}) {
  const runtime = await createServiceRuntime({
    serviceName: 'worker-service',
    readinessTargets: [
      'database',
      'feature-flags',
      'runtime-config',
      'search-cluster',
      ...BACKGROUND_JOB_TARGETS,
      'probe-server'
    ],
    runMigrations: false
  });

  const { readiness, registry, logger: serviceLogger } = runtime;

  const probeApp = createProbeApp({
    service: 'worker-service',
    readinessCheck: () => readiness.snapshot(),
    livenessCheck: () => ({ alive: true })
  });

  const probeServer = http.createServer(probeApp);
  let probeServerPending = false;
  let jobRunner;

  try {
    jobRunner = await startBackgroundJobs({ readiness, logger: serviceLogger });

    readiness.markPending('probe-server', 'Starting probe server');
    probeServerPending = true;
    await new Promise((resolve, reject) => {
      probeServer.once('error', (error) => {
        readiness.markFailed('probe-server', error);
        reject(error);
      });

      probeServer.listen(env.services.worker.probePort, () => {
        readiness.markReady('probe-server', `Listening on port ${env.services.worker.probePort}`);
        serviceLogger.info({ port: env.services.worker.probePort }, 'Worker probe server listening');
        probeServerPending = false;
        resolve();
      });
    });
  } catch (error) {
    if (probeServerPending) {
      readiness.markFailed('probe-server', error);
    }

    serviceLogger.error({ err: error }, 'Worker service failed to complete startup; initiating rollback');

    await new Promise((resolve) => {
      if (!probeServer.listening) {
        resolve();
        return;
      }

      probeServer.close(() => resolve());
    }).catch(() => {});

    if (jobRunner) {
      await jobRunner.stop().catch((stopError) => {
        serviceLogger.error({ err: stopError }, 'Failed to stop background jobs after startup error');
      });
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
    readiness.markPending('probe-server', `Shutting down (${signal})`);

    await new Promise((resolve) => {
      probeServer.close(() => {
        readiness.markDegraded('probe-server', 'Stopped');
        resolve();
      });
    });

    if (jobRunner) {
      await jobRunner.stop();
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
      readiness.markFailed('probe-server', error);
      shutdown('uncaughtException', { exitProcess: true, exitCode: 1 }).catch(() => {
        process.exit(1);
      });
    });
  }

  return {
    port: env.services.worker.probePort,
    readiness,
    async stop() {
      await shutdown('manual');
    }
  };
}
