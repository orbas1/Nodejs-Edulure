import { env } from '../config/env.js';
import assetIngestionService from '../services/AssetIngestionService.js';
import communityReminderJob from '../jobs/communityReminderJob.js';
import dataPartitionJob from '../jobs/dataPartitionJob.js';
import dataRetentionJob from '../jobs/dataRetentionJob.js';
import domainEventDispatcherService from '../services/DomainEventDispatcherService.js';
import integrationOrchestratorService from '../services/IntegrationOrchestratorService.js';
import monetizationReconciliationJob from '../jobs/monetizationReconciliationJob.js';
import moderationFollowUpJob from '../jobs/moderationFollowUpJob.js';
import telemetryWarehouseJob from '../jobs/telemetryWarehouseJob.js';
import webhookEventBusService from '../services/WebhookEventBusService.js';

export const BACKGROUND_JOB_TARGETS = [
  'asset-ingestion',
  'data-retention',
  'community-reminder',
  'moderation-follow-up',
  'data-partitioning',
  'telemetry-warehouse',
  'monetization-reconciliation',
  'integration-orchestrator',
  'webhook-event-bus',
  'domain-event-dispatcher'
];

export function createJobLogger(logger) {
  return logger.child({ scope: 'jobs' });
}

export async function startBackgroundJobs({ readiness, logger }) {
  const jobLogger = createJobLogger(logger);
  const cleanupTasks = [];

  const registerCleanup = (name, fn) => {
    cleanupTasks.push({ name, fn });
  };

  const stop = async () => {
    for (const { name, fn } of [...cleanupTasks].reverse()) {
      try {
        await Promise.resolve(fn());
        jobLogger.info({ component: name }, `[jobs] ${name} stopped`);
      } catch (error) {
        jobLogger.error({ component: name, err: error }, `[jobs] Failed to stop component`);
      }
    }
    cleanupTasks.length = 0;
  };

  const markStart = (key, message) => {
    readiness.markPending(key, message);
  };

  const markDegraded = (key, message) => {
    readiness.markDegraded(key, message);
    jobLogger.warn({ component: key, message }, `[jobs] ${message}`);
  };

  const markReady = (key, message) => {
    readiness.markReady(key, message);
    jobLogger.info({ component: key, message }, `[jobs] ${message}`);
  };

  const markFailed = (key, error, label) => {
    readiness.markFailed(key, error);
    jobLogger.error({ component: key, err: error }, `[jobs] Failed to start ${label ?? key}`);
  };

  const startService = async (key, label, startFn, stopFn, { disabled, disabledMessage } = {}) => {
    markStart(key, `Starting ${label}`);
    try {
      const result = await startFn();
      registerCleanup(key, stopFn);
      if (disabled) {
        markDegraded(key, disabledMessage ?? `${label} disabled by configuration`);
      } else {
        const message =
          result?.message ?? (result?.status === 'ready' ? `${label} active` : `${label} initialised`);
        if (result?.status === 'disabled' || result?.status === 'degraded') {
          markDegraded(key, message);
        } else {
          markReady(key, message);
        }
      }
    } catch (error) {
      markFailed(key, error, label);
      throw error;
    }
  };

  try {
    await startService(
      'asset-ingestion',
      'asset ingestion poller',
      async () => {
        assetIngestionService.start();
        registerCleanup('asset-ingestion', () => assetIngestionService.stop());
      },
      () => assetIngestionService.stop(),
      {
        disabled: !env.integrations.cloudConvertApiKey,
        disabledMessage: 'Running without CloudConvert – conversions will queue until configured'
      }
    );

    await startService(
      'data-retention',
      'data retention scheduler',
      async () => {
        dataRetentionJob.start();
        registerCleanup('data-retention', () => dataRetentionJob.stop());
      },
      () => dataRetentionJob.stop(),
      {
        disabled: !env.retention.enabled,
        disabledMessage: 'Data retention scheduler disabled by configuration'
      }
    );

    await startService(
      'data-partitioning',
      'data partition scheduler',
      async () => {
        dataPartitionJob.start();
        registerCleanup('data-partitioning', () => dataPartitionJob.stop());
      },
      () => dataPartitionJob.stop(),
      {
        disabled: !env.partitioning.enabled,
        disabledMessage: 'Data partition scheduler disabled by configuration'
      }
    );

    await startService(
      'community-reminder',
      'community reminder scheduler',
      async () => {
        communityReminderJob.start();
        registerCleanup('community-reminder', () => communityReminderJob.stop());
      },
      () => communityReminderJob.stop(),
      {
        disabled: !env.engagement.reminders.enabled,
        disabledMessage: 'Community reminders disabled by configuration'
      }
    );

    await startService(
      'moderation-follow-up',
      'moderation follow-up scheduler',
      async () => {
        moderationFollowUpJob.start();
        registerCleanup('moderation-follow-up', () => moderationFollowUpJob.stop());
      },
      () => moderationFollowUpJob.stop(),
      {
        disabled: !env.moderation.followUps.enabled,
        disabledMessage: 'Moderation follow-up reminders disabled by configuration'
      }
    );

    await startService(
      'telemetry-warehouse',
      'telemetry warehouse scheduler',
      async () => {
        telemetryWarehouseJob.start();
        registerCleanup('telemetry-warehouse', () => telemetryWarehouseJob.stop());
      },
      () => telemetryWarehouseJob.stop(),
      {
        disabled: !env.telemetry.export.enabled,
        disabledMessage: 'Telemetry export scheduler disabled by configuration'
      }
    );

    await startService(
      'monetization-reconciliation',
      'monetization reconciliation scheduler',
      async () => {
        monetizationReconciliationJob.start();
        registerCleanup('monetization-reconciliation', () => monetizationReconciliationJob.stop());
      },
      () => monetizationReconciliationJob.stop(),
      {
        disabled: !env.monetization.reconciliation.enabled,
        disabledMessage: 'Monetization reconciliation disabled by configuration'
      }
    );

    await startService(
      'integration-orchestrator',
      'integration orchestrator scheduler',
      async () => integrationOrchestratorService.start(),
      () => integrationOrchestratorService.stop()
    );

    await startService(
      'webhook-event-bus',
      'webhook dispatcher',
      async () => webhookEventBusService.start(),
      () => webhookEventBusService.stop(),
      {
        disabled: !webhookEventBusService.enabled,
        disabledMessage: 'Webhook dispatcher disabled by configuration'
      }
    );

    await startService(
      'domain-event-dispatcher',
      'domain event dispatcher',
      async () => domainEventDispatcherService.start(),
      () => domainEventDispatcherService.stop(),
      {
        disabled: !domainEventDispatcherService.enabled,
        disabledMessage: 'Domain event dispatcher disabled by configuration'
      }
    );
  } catch (error) {
    await stop();
    throw error;
  }

  return {
    async stop() {
      await stop();
    }
  };
}

export default startBackgroundJobs;
