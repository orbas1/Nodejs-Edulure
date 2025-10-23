import http from 'node:http';

import { ensureDatabaseConnection, startCoreInfrastructure } from '../bootstrap/bootstrap.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { createProbeApp } from '../observability/probes.js';
import { createReadinessTracker } from '../observability/readiness.js';
import assetIngestionService from '../services/AssetIngestionService.js';
import dataRetentionJob from '../jobs/dataRetentionJob.js';
import communityReminderJob from '../jobs/communityReminderJob.js';
import moderationFollowUpJob from '../jobs/moderationFollowUpJob.js';
import dataPartitionJob from '../jobs/dataPartitionJob.js';
import telemetryWarehouseJob from '../jobs/telemetryWarehouseJob.js';
import monetizationReconciliationJob from '../jobs/monetizationReconciliationJob.js';
import integrationOrchestratorService from '../services/IntegrationOrchestratorService.js';
import webhookEventBusService from '../services/WebhookEventBusService.js';
import domainEventDispatcherService from '../services/DomainEventDispatcherService.js';
import { createProcessSignalRegistry } from './processSignalRegistry.js';

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
    'moderation-follow-up',
    'data-partitioning',
    'integration-orchestrator',
    'telemetry-warehouse',
    'monetization-reconciliation',
    'webhook-event-bus',
    'domain-event-dispatcher',
    'probe-server'
  ]);

  const cleanupTasks = [];
  const registerCleanup = (name, fn) => {
    cleanupTasks.push({ name, fn });
  };

  const stopBackgroundRunners = async () => {
    for (const { name, fn } of [...cleanupTasks].reverse()) {
      try {
        await Promise.resolve(fn());
        serviceLogger.info({ component: name }, 'Background worker stopped');
      } catch (error) {
        serviceLogger.error({ component: name, err: error }, 'Failed to stop background worker cleanly');
      }
    }
    cleanupTasks.length = 0;
  };

  const registry = createProcessSignalRegistry();
  let databaseHandle = null;
  try {
    databaseHandle = await ensureDatabaseConnection({ runMigrations: false, readiness });
  } catch (error) {
    serviceLogger.error({ err: error }, 'Failed to connect to database');
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

  const probeApp = createProbeApp({
    service: 'worker-service',
    readinessCheck: () => readiness.snapshot(),
    livenessCheck: () => ({ alive: true })
  });

  const probeServer = http.createServer(probeApp);
  let probeServerPending = false;

  try {
    readiness.markPending('asset-ingestion', 'Starting asset ingestion poller');
    try {
      assetIngestionService.start();
      registerCleanup('asset-ingestion', () => assetIngestionService.stop());
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
      throw error;
    }

    readiness.markPending('data-retention', 'Starting data retention scheduler');
    try {
      dataRetentionJob.start();
      registerCleanup('data-retention', () => dataRetentionJob.stop());
      if (!env.retention.enabled) {
        readiness.markDegraded('data-retention', 'Data retention scheduler disabled by configuration');
      } else {
        readiness.markReady('data-retention', 'Data retention scheduler active');
      }
    } catch (error) {
      readiness.markFailed('data-retention', error);
      serviceLogger.error({ err: error }, 'Failed to start data retention job');
      throw error;
    }

    readiness.markPending('data-partitioning', 'Starting data partition scheduler');
    try {
      dataPartitionJob.start();
      registerCleanup('data-partitioning', () => dataPartitionJob.stop());
      if (!env.partitioning.enabled) {
        readiness.markDegraded('data-partitioning', 'Data partition scheduler disabled by configuration');
      } else {
        readiness.markReady('data-partitioning', 'Data partition scheduler active');
      }
    } catch (error) {
      readiness.markFailed('data-partitioning', error);
      serviceLogger.error({ err: error }, 'Failed to start data partition job');
      throw error;
    }

    readiness.markPending('community-reminder', 'Starting community reminder scheduler');
    try {
      communityReminderJob.start();
      registerCleanup('community-reminder', () => communityReminderJob.stop());
      if (!env.engagement.reminders.enabled) {
        readiness.markDegraded('community-reminder', 'Community reminders disabled by configuration');
      } else {
        readiness.markReady('community-reminder', 'Community reminders scheduler active');
      }
    } catch (error) {
      readiness.markFailed('community-reminder', error);
      serviceLogger.error({ err: error }, 'Failed to start community reminder job');
      throw error;
    }

    readiness.markPending('moderation-follow-up', 'Starting moderation follow-up scheduler');
    try {
      moderationFollowUpJob.start();
      registerCleanup('moderation-follow-up', () => moderationFollowUpJob.stop());
      if (!env.moderation.followUps.enabled) {
        readiness.markDegraded(
          'moderation-follow-up',
          'Moderation follow-up reminders disabled by configuration'
        );
      } else {
        readiness.markReady('moderation-follow-up', 'Moderation follow-up scheduler active');
      }
    } catch (error) {
      readiness.markFailed('moderation-follow-up', error);
      serviceLogger.error({ err: error }, 'Failed to start moderation follow-up job');
      throw error;
    }

    readiness.markPending('telemetry-warehouse', 'Starting telemetry warehouse scheduler');
    try {
      telemetryWarehouseJob.start();
      registerCleanup('telemetry-warehouse', () => telemetryWarehouseJob.stop());
      if (!env.telemetry.export.enabled) {
        readiness.markDegraded('telemetry-warehouse', 'Telemetry export scheduler disabled by configuration');
      } else {
        readiness.markReady('telemetry-warehouse', 'Telemetry export scheduler active');
      }
    } catch (error) {
      readiness.markFailed('telemetry-warehouse', error);
      serviceLogger.error({ err: error }, 'Failed to start telemetry warehouse job');
      throw error;
    }

    readiness.markPending('monetization-reconciliation', 'Starting monetization reconciliation scheduler');
    try {
      monetizationReconciliationJob.start();
      registerCleanup('monetization-reconciliation', () => monetizationReconciliationJob.stop());
      if (!env.monetization.reconciliation.enabled) {
        readiness.markDegraded('monetization-reconciliation', 'Monetization reconciliation disabled by configuration');
      } else {
        readiness.markReady('monetization-reconciliation', 'Monetization reconciliation scheduler active');
      }
    } catch (error) {
      readiness.markFailed('monetization-reconciliation', error);
      serviceLogger.error({ err: error }, 'Failed to start monetization reconciliation job');
      throw error;
    }

    readiness.markPending('integration-orchestrator', 'Starting integration orchestrator scheduler');
    try {
      const orchestratorStatus = integrationOrchestratorService.start();
      registerCleanup('integration-orchestrator', () => integrationOrchestratorService.stop());
      const status = orchestratorStatus?.status ?? 'ready';
      const message =
        orchestratorStatus?.message ??
        (status === 'ready' ? 'Integration orchestrator scheduled' : 'Integration orchestrator state updated');

      if (status === 'disabled' || status === 'degraded') {
        readiness.markDegraded('integration-orchestrator', message);
      } else {
        readiness.markReady('integration-orchestrator', message);
      }
    } catch (error) {
      readiness.markFailed('integration-orchestrator', error);
      serviceLogger.error({ err: error }, 'Failed to start integration orchestrator');
      throw error;
    }

    readiness.markPending('webhook-event-bus', 'Starting webhook dispatcher');
    try {
      webhookEventBusService.start();
      registerCleanup('webhook-event-bus', () => webhookEventBusService.stop());
      if (!webhookEventBusService.enabled) {
        readiness.markDegraded('webhook-event-bus', 'Webhook dispatcher disabled by configuration');
      } else {
        readiness.markReady('webhook-event-bus', 'Webhook dispatcher active');
      }
    } catch (error) {
      readiness.markFailed('webhook-event-bus', error);
      serviceLogger.error({ err: error }, 'Failed to start webhook dispatcher');
      throw error;
    }

    readiness.markPending('domain-event-dispatcher', 'Starting domain event dispatcher');
    try {
      domainEventDispatcherService.start();
      registerCleanup('domain-event-dispatcher', () => domainEventDispatcherService.stop());
      if (!domainEventDispatcherService.enabled) {
        readiness.markDegraded(
          'domain-event-dispatcher',
          'Domain event dispatcher disabled by configuration'
        );
      } else {
        readiness.markReady('domain-event-dispatcher', 'Domain event dispatcher active');
      }
    } catch (error) {
      readiness.markFailed('domain-event-dispatcher', error);
      serviceLogger.error({ err: error }, 'Failed to start domain event dispatcher');
      throw error;
    }

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

    await stopBackgroundRunners();

    if (infrastructure) {
      await infrastructure.stop().catch((infraError) => {
        serviceLogger.error({ err: infraError }, 'Error stopping infrastructure after worker failure');
      });
    }

    if (databaseHandle) {
      await databaseHandle.close().catch((closeError) => {
        serviceLogger.error({ err: closeError }, 'Error closing database connection after worker failure');
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
    readiness.markPending('probe-server', `Shutting down (${signal})`);

    await new Promise((resolve) => {
      probeServer.close(() => {
        readiness.markDegraded('probe-server', 'Stopped');
        resolve();
      });
    });

    await stopBackgroundRunners();

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
