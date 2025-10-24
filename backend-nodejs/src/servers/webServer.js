import http from 'node:http';

import app, { registerReadinessProbe } from '../app.js';
import { env } from '../config/env.js';
import { createServiceRuntime } from './runtimeEnvironment.js';
import resolveRuntimeToggles from './runtimeToggles.js';
import attachRealtimeGateway from './realtimeGateway.js';
import { BACKGROUND_JOB_TARGETS, startBackgroundJobs } from './workerRoutines.js';

export async function startWebServer({ withSignalHandlers = true } = {}) {
  const toggles = resolveRuntimeToggles();
  const runtime = await createServiceRuntime({
    serviceName: 'web-service',
    readinessTargets: [
      'database',
      'feature-flags',
      'runtime-config',
      'search-cluster',
      'graphql-gateway',
      'http-server',
      'socket-gateway',
      ...BACKGROUND_JOB_TARGETS
    ],
    runMigrations: true
  });

  const { readiness, registry, logger: serviceLogger } = runtime;
  registerReadinessProbe(() => readiness.snapshot());

  if (!toggles.enableJobs) {
    BACKGROUND_JOB_TARGETS.forEach((target) => {
      readiness.markDegraded(target, 'Background jobs disabled by preset');
    });
  }

  if (!toggles.enableRealtime) {
    readiness.markDegraded('socket-gateway', 'Realtime gateway disabled by preset');
  }

  const server = http.createServer(app);
  const activeConnections = new Set();

  server.on('connection', (socket) => {
    activeConnections.add(socket);
    socket.on('close', () => {
      activeConnections.delete(socket);
    });
  });
  let httpServerPending = false;
  let jobRunner = null;
  let realtimeAttachment = null;

  readiness.markPending('http-server', 'Starting HTTP server');
  httpServerPending = true;

  try {
    if (toggles.enableJobs) {
      jobRunner = await startBackgroundJobs({ readiness, logger: serviceLogger });
    }

    if (toggles.enableRealtime) {
      realtimeAttachment = await attachRealtimeGateway({ httpServer: server, readiness, logger: serviceLogger });
    }

    await new Promise((resolve, reject) => {
      server.once('error', (error) => {
        readiness.markFailed('http-server', error);
        reject(error);
      });

      server.listen(env.services.web.port, () => {
        readiness.markReady('http-server', `Listening on port ${env.services.web.port}`);
        serviceLogger.info({ port: env.services.web.port }, '[web] HTTP server listening');
        if (realtimeAttachment) {
          realtimeAttachment.markListening(env.services.web.port);
        }
        httpServerPending = false;
        resolve();
      });
    });
  } catch (error) {
    if (httpServerPending) {
      readiness.markFailed('http-server', error);
    }

    if (jobRunner) {
      await jobRunner.stop().catch((stopError) => {
        serviceLogger.error({ err: stopError }, 'Failed to stop background jobs after startup error');
      });
    }

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
    readiness.markPending('http-server', `Shutting down (${signal})`);

    await new Promise((resolve) => {
      server.close(() => {
        readiness.markDegraded('http-server', 'Stopped');
        resolve();
      });
      const deadline = Date.now() + 5_000;
      for (const socket of activeConnections) {
        socket.end();
      }
      const interval = setInterval(() => {
        if (!activeConnections.size) {
          clearInterval(interval);
          return;
        }

        if (Date.now() >= deadline) {
          for (const socket of activeConnections) {
            socket.destroy();
          }
          clearInterval(interval);
        }
      }, 100);
    });

    if (jobRunner) {
      await jobRunner.stop();
    }

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
      serviceLogger.error({ err: reason }, 'Unhandled promise rejection detected');
    });

    registry.add('uncaughtException', (error) => {
      serviceLogger.fatal({ err: error }, 'Uncaught exception detected');
      readiness.markFailed('http-server', error);
      shutdown('uncaughtException', { exitProcess: true, exitCode: 1 }).catch(() => {
        process.exit(1);
      });
    });
  }

  serviceLogger.info({
    port: env.services.web.port,
    jobsEnabled: toggles.enableJobs,
    realtimeEnabled: toggles.enableRealtime
  }, 'Web service bootstrapped');

  return {
    port: env.services.web.port,
    readiness,
    async stop() {
      await shutdown('manual');
    }
  };
}

export default startWebServer;
