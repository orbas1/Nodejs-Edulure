import http from 'node:http';

import { ensureDatabaseConnection, startCoreInfrastructure } from '../bootstrap/bootstrap.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { createProbeApp } from '../observability/probes.js';
import { createReadinessTracker } from '../observability/readiness.js';
import assetIngestionService from '../services/AssetIngestionService.js';
import dataRetentionJob from '../jobs/dataRetentionJob.js';
import communityReminderJob from '../jobs/communityReminderJob.js';
import dataPartitionJob from '../jobs/dataPartitionJob.js';
import integrationOrchestratorService from '../services/IntegrationOrchestratorService.js';
import webhookEventBusService from '../services/WebhookEventBusService.js';

const serviceLogger = logger.child({ service: 'worker-service' });

export async function startWorkerService({ withSignalHandlers = true } = {}) {
  const readiness = createReadinessTracker('worker-service', [
    'database',
    'feature-flags',
    'runtime-config',
    'search-cluster',
    'asset-ingestion',
    'data-retention',
    'community-reminder',
    'data-partitioning',
    'integration-orchestrator',
    'webhook-event-bus',
    'probe-server'
  ]);

  let databaseHandle = null;
  try {
    databaseHandle = await ensureDatabaseConnection({ runMigrations: false, readiness });
  } catch (error) {
    serviceLogger.error({ err: error }, 'Failed to connect to database');
    readiness.markFailed('database', error);
  }

  const infrastructure = await startCoreInfrastructure({ readiness });

  readiness.markPending('asset-ingestion', 'Starting asset ingestion poller');
  try {
    assetIngestionService.start();
    if (!env.integrations.cloudConvertApiKey) {
      readiness.markDegraded(
        'asset-ingestion',
        'Running without CloudConvert – PowerPoint conversions will queue until configured'
      );
      serviceLogger.warn('Asset ingestion running without CloudConvert API key; conversions will be retried later.');
    } else {
      readiness.markReady('asset-ingestion', 'Asset ingestion poller active');
    }
  } catch (error) {
    readiness.markFailed('asset-ingestion', error);
    serviceLogger.error({ err: error }, 'Failed to start asset ingestion service');
  }

  readiness.markPending('data-retention', 'Starting data retention scheduler');
  try {
    dataRetentionJob.start();
    if (!env.retention.enabled) {
      readiness.markDegraded('data-retention', 'Data retention scheduler disabled by configuration');
    } else {
      readiness.markReady('data-retention', 'Data retention scheduler active');
    }
  } catch (error) {
    readiness.markFailed('data-retention', error);
    serviceLogger.error({ err: error }, 'Failed to start data retention job');
  }

  readiness.markPending('data-partitioning', 'Starting data partition scheduler');
  try {
    dataPartitionJob.start();
    if (!env.partitioning.enabled) {
      readiness.markDegraded('data-partitioning', 'Data partition scheduler disabled by configuration');
    } else {
      readiness.markReady('data-partitioning', 'Data partition scheduler active');
    }
  } catch (error) {
    readiness.markFailed('data-partitioning', error);
    serviceLogger.error({ err: error }, 'Failed to start data partition job');
  }

  readiness.markPending('community-reminder', 'Starting community reminder scheduler');
  try {
    communityReminderJob.start();
    if (!env.engagement.reminders.enabled) {
      readiness.markDegraded('community-reminder', 'Community reminders disabled by configuration');
    } else {
      readiness.markReady('community-reminder', 'Community reminders scheduler active');
    }
  } catch (error) {
    readiness.markFailed('community-reminder', error);
    serviceLogger.error({ err: error }, 'Failed to start community reminder job');
  }

  readiness.markPending('integration-orchestrator', 'Starting integration orchestrator scheduler');
  try {
    integrationOrchestratorService.start();
    readiness.markReady('integration-orchestrator', 'Integration orchestrator scheduled');
  } catch (error) {
    readiness.markFailed('integration-orchestrator', error);
    serviceLogger.error({ err: error }, 'Failed to start integration orchestrator');
  }

  readiness.markPending('webhook-event-bus', 'Starting webhook dispatcher');
  try {
    webhookEventBusService.start();
    if (!webhookEventBusService.enabled) {
      readiness.markDegraded('webhook-event-bus', 'Webhook dispatcher disabled by configuration');
    } else {
      readiness.markReady('webhook-event-bus', 'Webhook dispatcher active');
    }
  } catch (error) {
    readiness.markFailed('webhook-event-bus', error);
    serviceLogger.error({ err: error }, 'Failed to start webhook dispatcher');
  }

  const probeApp = createProbeApp({
    service: 'worker-service',
    readinessCheck: () => readiness.snapshot(),
    livenessCheck: () => ({ alive: true })
  });

  const probeServer = http.createServer(probeApp);

  await new Promise((resolve, reject) => {
    probeServer.once('error', (error) => {
      readiness.markFailed('probe-server', error);
      reject(error);
    });

    probeServer.listen(env.services.worker.probePort, () => {
      readiness.markReady('probe-server', `Listening on port ${env.services.worker.probePort}`);
      serviceLogger.info({ port: env.services.worker.probePort }, 'Worker probe server listening');
      resolve();
    });
  });

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

  assetIngestionService.stop();
  dataRetentionJob.stop();
  dataPartitionJob.stop();
  communityReminderJob.stop();
  integrationOrchestratorService.stop();
  webhookEventBusService.stop();

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
