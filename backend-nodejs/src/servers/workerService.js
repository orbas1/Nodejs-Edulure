import { env } from '../config/env.js';
import logger from '../config/logger.js';
import assetIngestionService from '../services/AssetIngestionService.js';
import dataRetentionJob from '../jobs/dataRetentionJob.js';
import communityReminderJob from '../jobs/communityReminderJob.js';
import dataPartitionJob from '../jobs/dataPartitionJob.js';
import telemetryWarehouseJob from '../jobs/telemetryWarehouseJob.js';
import monetizationReconciliationJob from '../jobs/monetizationReconciliationJob.js';
import integrationOrchestratorService from '../services/IntegrationOrchestratorService.js';
import webhookEventBusService from '../services/WebhookEventBusService.js';
import domainEventDispatcherService from '../services/DomainEventDispatcherService.js';
import refreshSearchDocumentsJob from '../jobs/search/refreshSearchDocumentsJob.js';
import createServiceRuntime from './serviceHarness.js';
import {
  setSchedulerActive,
  observeSchedulerDuration
} from '../observability/metrics.js';
import { formatLog, jobGroupEnabled, resolveRuntimeOptions } from './runtimeOptions.js';

const STATUS_READY = 'status:ready';
const STATUS_DEGRADED = 'status:degraded';
const STATUS_DISABLED = 'status:disabled';

function instrumentScheduledJob(job, name) {
  if (!job || typeof job.runCycle !== 'function') {
    return job;
  }
  const originalRunCycle = job.runCycle.bind(job);
  job.runCycle = async (...args) => {
    const start = Date.now();
    setSchedulerActive(name, 1);
    try {
      const result = await originalRunCycle(...args);
      observeSchedulerDuration(name, (Date.now() - start) / 1000);
      return result;
    } catch (error) {
      observeSchedulerDuration(name, (Date.now() - start) / 1000);
      throw error;
    } finally {
      setSchedulerActive(name, 0);
    }
  };
  return job;
}

export async function startWorkerService({ withSignalHandlers = true } = {}) {
  const runtimeOptions = resolveRuntimeOptions();
  const readinessKeys = [
    'database',
    'feature-flags',
    'runtime-config',
    'asset-ingestion',
    'data-retention',
    'community-reminder',
    'data-partitioning',
    'integration-orchestrator',
    'telemetry-warehouse',
    'monetization-reconciliation',
    'webhook-event-bus',
    'domain-event-dispatcher',
    'search-refresh',
    'probe-server'
  ];

  const runtime = await createServiceRuntime({
    serviceName: 'worker-service',
    readinessKeys,
    withSignalHandlers,
    loggerInstance: logger
  });

  const { readiness, registerCleanup, logger: runtimeLogger } = runtime;
  const jobsLogPrefix = runtimeOptions.logPrefixes?.jobs;
  const annotate = (message) => formatLog(jobsLogPrefix, message);

  runtimeLogger.info(
    {
      preset: runtimeOptions.preset,
      jobGroups: Array.from(runtimeOptions.jobGroups)
    },
    annotate('Worker runtime initialised')
  );

  readiness.markPending('asset-ingestion', 'Starting asset ingestion poller');
  try {
    assetIngestionService.start();
    registerCleanup('asset-ingestion', () => assetIngestionService.stop());
    if (!env.integrations.cloudConvertApiKey) {
      readiness.markDegraded(
        'asset-ingestion',
        `${STATUS_DEGRADED} Running without CloudConvert – PowerPoint conversions will queue until configured`
      );
      runtimeLogger.warn(
        annotate('Asset ingestion running without CloudConvert API key; conversions will be retried later.')
      );
    } else {
      readiness.markReady('asset-ingestion', `${STATUS_READY} Asset ingestion poller active`);
    }
  } catch (error) {
    readiness.markFailed('asset-ingestion', error);
    runtimeLogger.error({ err: error }, annotate('Failed to start asset ingestion service'));
    throw error;
  }

  const scheduleJob = (key, job, { enabled, disabledMessage, group, defaultEnabled = false }) => {
    const groupEnabled = jobGroupEnabled(runtimeOptions.jobGroups, group ?? 'core', {
      defaultEnabled
    });
    const finalEnabled = enabled !== false && groupEnabled;
    readiness.markPending(key, `Starting ${key}`);
    try {
      if (!finalEnabled) {
        readiness.markDegraded(
          key,
          `${STATUS_DISABLED} ${disabledMessage ?? `${key} disabled by configuration`}`
        );
        runtimeLogger.warn(
          annotate(
            `Skipped scheduler "${key}" because group "${group ?? 'core'}" is disabled or configuration turned it off.`
          )
        );
        return;
      }

      const instrumented = instrumentScheduledJob(job, key);
      instrumented.start();
      registerCleanup(key, () => instrumented.stop());
      if (enabled === false) {
        readiness.markDegraded(
          key,
          `${STATUS_DEGRADED} ${disabledMessage ?? `${key} disabled by configuration`}`
        );
      } else {
        readiness.markReady(key, `${STATUS_READY} ${key} active`);
      }
    } catch (error) {
      readiness.markFailed(key, error);
      runtimeLogger.error({ err: error }, annotate(`Failed to start ${key}`));
      throw error;
    }
  };

  scheduleJob('data-retention', dataRetentionJob, {
    enabled: env.retention.enabled,
    disabledMessage: 'Data retention scheduler disabled by configuration',
    group: 'core',
    defaultEnabled: true
  });

  scheduleJob('data-partitioning', dataPartitionJob, {
    enabled: env.partitioning.enabled,
    disabledMessage: 'Data partition scheduler disabled by configuration',
    group: 'core',
    defaultEnabled: true
  });

  scheduleJob('community-reminder', communityReminderJob, {
    enabled: env.engagement.reminders.enabled,
    disabledMessage: 'Community reminders disabled by configuration',
    group: 'engagement'
  });

  scheduleJob('telemetry-warehouse', telemetryWarehouseJob, {
    enabled: env.telemetry.export.enabled,
    disabledMessage: 'Telemetry export scheduler disabled by configuration',
    group: 'telemetry'
  });

  scheduleJob('monetization-reconciliation', monetizationReconciliationJob, {
    enabled: env.monetization.reconciliation.enabled,
    disabledMessage: 'Monetization reconciliation disabled by configuration',
    group: 'monetization'
  });

  readiness.markPending('integration-orchestrator', 'Starting integration orchestrator scheduler');
  try {
    const orchestratorStatus = integrationOrchestratorService.start();
    registerCleanup('integration-orchestrator', () => integrationOrchestratorService.stop());
    const status = orchestratorStatus?.status ?? 'ready';
    const message =
      orchestratorStatus?.message ??
      (status === 'ready' ? 'Integration orchestrator scheduled' : 'Integration orchestrator state updated');

    if (status === 'disabled' || status === 'degraded') {
      readiness.markDegraded('integration-orchestrator', `${STATUS_DEGRADED} ${message}`);
    } else {
      readiness.markReady('integration-orchestrator', `${STATUS_READY} ${message}`);
    }
  } catch (error) {
    readiness.markFailed('integration-orchestrator', error);
    runtimeLogger.error({ err: error }, annotate('Failed to start integration orchestrator'));
    throw error;
  }

  readiness.markPending('webhook-event-bus', 'Starting webhook dispatcher');
  try {
    webhookEventBusService.start();
    registerCleanup('webhook-event-bus', () => webhookEventBusService.stop());
    if (!webhookEventBusService.enabled) {
      readiness.markDegraded(
        'webhook-event-bus',
        `${STATUS_DEGRADED} Webhook dispatcher disabled by configuration`
      );
    } else {
      readiness.markReady('webhook-event-bus', `${STATUS_READY} Webhook dispatcher active`);
    }
  } catch (error) {
    readiness.markFailed('webhook-event-bus', error);
    runtimeLogger.error({ err: error }, annotate('Failed to start webhook dispatcher'));
    throw error;
  }

  readiness.markPending('domain-event-dispatcher', 'Starting domain event dispatcher');
  try {
    domainEventDispatcherService.start();
    registerCleanup('domain-event-dispatcher', () => domainEventDispatcherService.stop());
    if (!domainEventDispatcherService.enabled) {
      readiness.markDegraded(
        'domain-event-dispatcher',
        `${STATUS_DEGRADED} Domain event dispatcher disabled by configuration`
      );
    } else {
      readiness.markReady('domain-event-dispatcher', `${STATUS_READY} Domain event dispatcher active`);
    }
  } catch (error) {
    readiness.markFailed('domain-event-dispatcher', error);
    runtimeLogger.error({ err: error }, annotate('Failed to start domain event dispatcher'));
    throw error;
  }

  scheduleJob('search-refresh', refreshSearchDocumentsJob, {
    enabled: true,
    group: 'search',
    defaultEnabled: true
  });

  await runtime.startProbeServer(env.services.worker.probePort);
  runtimeLogger.info(
    { port: env.services.worker.probePort },
    annotate('Worker probe server listening')
  );

  return {
    async stop() {
      await runtime.shutdown('manual');
    }
  };
}

export default startWorkerService;
