import crypto from 'node:crypto';

import cron from 'node-cron';
import * as promClient from 'prom-client';

import db from '../config/database.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import HubSpotClient from '../integrations/HubSpotClient.js';
import SalesforceClient from '../integrations/SalesforceClient.js';
import IntegrationSyncRunModel from '../models/IntegrationSyncRunModel.js';
import IntegrationSyncResultModel from '../models/IntegrationSyncResultModel.js';
import IntegrationReconciliationReportModel from '../models/IntegrationReconciliationReportModel.js';
import { metricsRegistry } from '../observability/metrics.js';
import integrationStatusService from './IntegrationStatusService.js';

const DEFAULT_HUBSPOT_WINDOW_MINUTES = 90;
const DEFAULT_SALESFORCE_WINDOW_MINUTES = 120;
const HUBSPOT_BATCH_SIZE = 250;
const SALESFORCE_BATCH_SIZE = 150;
const MAX_HUBSPOT_INBOUND_PAGES = 5;

const SYNC_RUNS_METRIC = 'edulure_integration_sync_runs_total';
const SYNC_RECORDS_METRIC = 'edulure_integration_records_total';
const SYNC_DURATION_METRIC = 'edulure_integration_sync_duration_seconds';
const SYNC_MISMATCH_METRIC = 'edulure_integration_mismatches_total';

let syncRunCounter = metricsRegistry.getSingleMetric(SYNC_RUNS_METRIC);
if (!syncRunCounter) {
  syncRunCounter = new promClient.Counter({
    name: SYNC_RUNS_METRIC,
    help: 'Count of integration sync executions grouped by integration and outcome',
    labelNames: ['integration', 'status', 'trigger']
  });
  metricsRegistry.registerMetric(syncRunCounter);
}

let syncRecordCounter = metricsRegistry.getSingleMetric(SYNC_RECORDS_METRIC);
if (!syncRecordCounter) {
  syncRecordCounter = new promClient.Counter({
    name: SYNC_RECORDS_METRIC,
    help: 'Records processed by integration syncs grouped by direction and outcome',
    labelNames: ['integration', 'direction', 'outcome']
  });
  metricsRegistry.registerMetric(syncRecordCounter);
}

let syncDurationHistogram = metricsRegistry.getSingleMetric(SYNC_DURATION_METRIC);
if (!syncDurationHistogram) {
  syncDurationHistogram = new promClient.Histogram({
    name: SYNC_DURATION_METRIC,
    help: 'Duration of integration sync executions in seconds',
    labelNames: ['integration', 'sync_type', 'status'],
    buckets: [1, 5, 15, 30, 60, 120, 300, 600]
  });
  metricsRegistry.registerMetric(syncDurationHistogram);
}

let syncMismatchCounter = metricsRegistry.getSingleMetric(SYNC_MISMATCH_METRIC);
if (!syncMismatchCounter) {
  syncMismatchCounter = new promClient.Counter({
    name: SYNC_MISMATCH_METRIC,
    help: 'Number of records identified as mismatched during reconciliation runs',
    labelNames: ['integration', 'direction']
  });
  metricsRegistry.registerMetric(syncMismatchCounter);
}

function parseMinutes(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, 24 * 60);
}

function parseDays(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, 90);
}

function normaliseDate(value, fallback = null) {
  if (!value) {
    return fallback;
  }

  const candidate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(candidate.getTime()) ? fallback : candidate;
}

function toIsoOrNull(value) {
  const date = normaliseDate(value, null);
  return date ? date.toISOString() : null;
}

function truncate(value, length) {
  if (!value) {
    return value;
  }
  if (value.length <= length) {
    return value;
  }
  return `${value.slice(0, length - 3)}...`;
}

function compactObject(source) {
  return Object.entries(source)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .reduce((acc, [key, value]) => ({
      ...acc,
      [key]: value
    }), {});
}

function mapProjectStatusToLeadStatus(status) {
  switch (status) {
    case 'draft':
      return 'Open - Not Contacted';
    case 'in_review':
    case 'review':
      return 'Working - Contacted';
    case 'approved':
      return 'Working - Qualified';
    case 'published':
      return 'Closed - Converted';
    case 'archived':
      return 'Closed - Not Converted';
    default:
      return 'Open - Not Contacted';
  }
}

function buildHash(parts = []) {
  const hash = crypto.createHash('sha1');
  parts.filter(Boolean).forEach((part) => hash.update(String(part)));
  return hash.digest('hex');
}

export class IntegrationOrchestratorService {
  constructor({
    envConfig = env.integrations,
    hubspotClient,
    salesforceClient,
    runModel = IntegrationSyncRunModel,
    resultModel = IntegrationSyncResultModel,
    reportModel = IntegrationReconciliationReportModel,
    scheduler = cron,
    loggerInstance = logger.child({ service: 'integration-orchestrator' }),
    statusService = integrationStatusService
  } = {}) {
    this.logger = loggerInstance;
    this.scheduler = scheduler;
    this.runModel = runModel;
    this.resultModel = resultModel;
    this.reportModel = reportModel;
    this.statusService = statusService;

    this.hubspotConfig = envConfig?.hubspot ?? {};
    this.salesforceConfig = envConfig?.salesforce ?? {};
    this.crmConfig = envConfig?.crm ?? {};

    this.hubspotClient = hubspotClient;
    this.salesforceClient = salesforceClient;

    this.hubspotEnabled = Boolean(this.hubspotConfig.enabled && this.hubspotClient);
    this.salesforceEnabled = Boolean(this.salesforceConfig.enabled && this.salesforceClient);

    this.hubspotEnvironment = this.hubspotConfig.environment ?? 'production';
    this.salesforceEnvironment = this.salesforceConfig.environment ?? 'production';

    this.hubspotWindowMinutes = parseMinutes(
      this.hubspotConfig.syncWindowMinutes,
      DEFAULT_HUBSPOT_WINDOW_MINUTES
    );
    this.salesforceWindowMinutes = parseMinutes(
      this.salesforceConfig.syncWindowMinutes,
      DEFAULT_SALESFORCE_WINDOW_MINUTES
    );

    this.hubspotCron = this.crmConfig.hubspotCron ?? '*/15 * * * *';
    this.salesforceCron = this.crmConfig.salesforceCron ?? '*/20 * * * *';
    this.reconciliationCron = this.crmConfig.reconciliationCron ?? '15 3 * * *';
    this.reconciliationWindowDays = parseDays(this.crmConfig.reconciliationWindowDays, 7);
    this.maxConcurrentJobs = Number.isFinite(this.crmConfig.maxConcurrentJobs)
      ? Math.max(1, Number(this.crmConfig.maxConcurrentJobs))
      : 1;

    this.tasks = [];
    this.activeRuns = new Map();
    this.concurrentJobs = 0;
    this.started = false;
  }

  async recordRunOutcomeSafe(payload) {
    if (!this.statusService?.recordRunOutcome) {
      return;
    }

    try {
      await this.statusService.recordRunOutcome(payload);
    } catch (error) {
      this.logger.warn(
        { err: error, integration: payload?.integration, context: 'recordRunOutcome' },
        'Failed to persist integration run outcome'
      );
    }
  }

  async getStatusSafe(integration, environment) {
    if (!this.statusService?.getStatus) {
      return null;
    }

    try {
      return await this.statusService.getStatus(integration, environment);
    } catch (error) {
      this.logger.warn(
        { err: error, integration, environment, context: 'getStatus' },
        'Failed to load integration status snapshot'
      );
      return null;
    }
  }

  async summariseCallsSafe(integration, options) {
    if (!this.statusService?.summariseCalls) {
      return null;
    }

    try {
      return await this.statusService.summariseCalls(integration, options);
    } catch (error) {
      this.logger.warn(
        { err: error, integration, options, context: 'summariseCalls' },
        'Failed to load integration call summary'
      );
      return null;
    }
  }

  start() {
    if (this.started) {
      return;
    }

    const scheduled = [];

    const validate = this.scheduler.validate ?? (() => true);

    if (this.hubspotEnabled) {
      if (!validate(this.hubspotCron)) {
        throw new Error(`Invalid HubSpot cron expression: ${this.hubspotCron}`);
      }

      const task = this.scheduler.schedule(this.hubspotCron, () => {
        this.executeJob('hubspot', () => this.runHubSpotSync({ trigger: 'scheduler' })).catch((error) => {
          this.logger.error({ err: error }, 'HubSpot sync execution failed');
        });
      });
      task.start?.();
      scheduled.push(task);
    } else {
      this.logger.warn('HubSpot integration disabled or misconfigured; skipping scheduler');
    }

    if (this.salesforceEnabled) {
      if (!validate(this.salesforceCron)) {
        throw new Error(`Invalid Salesforce cron expression: ${this.salesforceCron}`);
      }

      const task = this.scheduler.schedule(this.salesforceCron, () => {
        this.executeJob('salesforce', () => this.runSalesforceSync({ trigger: 'scheduler' })).catch((error) => {
          this.logger.error({ err: error }, 'Salesforce sync execution failed');
        });
      });
      task.start?.();
      scheduled.push(task);
    } else {
      this.logger.warn('Salesforce integration disabled or misconfigured; skipping scheduler');
    }

    if (this.hubspotEnabled || this.salesforceEnabled) {
      if (!validate(this.reconciliationCron)) {
        throw new Error(`Invalid reconciliation cron expression: ${this.reconciliationCron}`);
      }

      const task = this.scheduler.schedule(this.reconciliationCron, () => {
        this.executeJob('reconciliation', () => this.runReconciliation({ trigger: 'scheduler' })).catch(
          (error) => {
            this.logger.error({ err: error }, 'Integration reconciliation failed');
          }
        );
      });
      task.start?.();
      scheduled.push(task);
    }

    this.tasks = scheduled;
    this.started = true;

    this.logger.info(
      {
        hubspotEnabled: this.hubspotEnabled,
        salesforceEnabled: this.salesforceEnabled,
        hubspotCron: this.hubspotCron,
        salesforceCron: this.salesforceCron,
        reconciliationCron: this.reconciliationCron
      },
      'Integration orchestrator scheduled'
    );
  }

  stop() {
    this.tasks.forEach((task) => {
      task.stop?.();
      task.destroy?.();
    });
    this.tasks = [];
    this.started = false;
  }

  async executeJob(key, handler) {
    if (this.concurrentJobs >= this.maxConcurrentJobs) {
      this.logger.warn({ key }, 'Integration orchestrator at capacity; skipping job');
      return null;
    }

    if (this.activeRuns.has(key)) {
      this.logger.warn({ key }, 'Integration job already running; skipping');
      return null;
    }

    this.concurrentJobs += 1;
    const start = Date.now();
    this.activeRuns.set(key, start);
    try {
      return await handler();
    } finally {
      this.activeRuns.delete(key);
      this.concurrentJobs = Math.max(0, this.concurrentJobs - 1);
    }
  }

  async runHubSpotSync({ trigger = 'manual', windowStartAt, windowEndAt } = {}) {
    if (!this.hubspotEnabled) {
      this.logger.warn('HubSpot sync invoked while integration disabled');
      return null;
    }

    const lastRun = await this.runModel.latestForIntegration('hubspot', 'delta');
    const fallbackStart = new Date(Date.now() - this.hubspotWindowMinutes * 60 * 1000);
    const resolvedWindowStart = normaliseDate(windowStartAt, lastRun?.finishedAt ?? fallbackStart);
    const resolvedWindowEnd = normaliseDate(windowEndAt, new Date());

    const correlationId = crypto.randomUUID();
    const run = await this.runModel.create({
      integration: 'hubspot',
      syncType: 'delta',
      triggeredBy: trigger,
      correlationId,
      windowStartAt: resolvedWindowStart,
      windowEndAt: resolvedWindowEnd,
      metadata: {
        windowMinutes: this.hubspotWindowMinutes,
        trigger,
        previousRunId: lastRun?.id ?? null
      }
    });

    await this.runModel.markStarted(run.id, { startedAt: new Date() });

    const timer = syncDurationHistogram.startTimer({ integration: 'hubspot', sync_type: 'delta', status: 'running' });

    try {
      const contactsPayload = await this.collectHubSpotContacts({
        windowStartAt: resolvedWindowStart,
        windowEndAt: resolvedWindowEnd
      });

      const outboundResults = await this.hubspotClient.upsertContacts(contactsPayload.contacts);

      if (outboundResults.succeeded) {
        syncRecordCounter.inc({ integration: 'hubspot', direction: 'outbound', outcome: 'succeeded' }, outboundResults.succeeded);
      }
      if (outboundResults.failed) {
        syncRecordCounter.inc({ integration: 'hubspot', direction: 'outbound', outcome: 'failed' }, outboundResults.failed);
      }

      await this.resultModel.bulkInsert(
        outboundResults.results.map((result) => ({
          syncRunId: run.id,
          integration: 'hubspot',
          entityType: 'contact',
          entityId: result.source.email,
          externalId: result.hubspotId,
          direction: 'outbound',
          operation: 'upsert',
          status: result.status === 'FAILED' ? 'failed' : 'succeeded',
          message: result.message ?? null,
          payload: result.source.properties
        }))
      );

      await this.runModel.incrementCounters(run.id, {
        pushed: outboundResults.succeeded,
        failed: outboundResults.failed,
        metadataPatch: {
          outboundCandidates: contactsPayload.contacts.length,
          outboundSkipped: contactsPayload.skipped
        }
      });

      const inboundSample = await this.collectHubSpotInbound({ windowStartAt: resolvedWindowStart, runId: run.id });
      if (inboundSample.count) {
        syncRecordCounter.inc({ integration: 'hubspot', direction: 'inbound', outcome: 'observed' }, inboundSample.count);
      }

      await this.runModel.incrementCounters(run.id, {
        pulled: inboundSample.count,
        metadataPatch: {
          inboundSample: inboundSample.count,
          inboundPagingToken: inboundSample.nextAfter ?? null
        }
      });

      const status = outboundResults.failed > 0 ? 'partial' : 'succeeded';
      const completedRun = await this.runModel.markCompleted(run.id, {
        status,
        finishedAt: new Date(),
        recordsPushed: outboundResults.succeeded,
        recordsPulled: inboundSample.count,
        recordsFailed: outboundResults.failed,
        recordsSkipped: contactsPayload.skipped,
        metadata: {
          outbound: contactsPayload.summary,
          inbound: inboundSample.summary
        }
      });

      timer({ integration: 'hubspot', sync_type: 'delta', status });
      syncRunCounter.inc({ integration: 'hubspot', status, trigger }, 1);

      const durationSeconds = completedRun?.startedAt && completedRun?.finishedAt
        ? Math.max(
            0,
            Math.round(
              (new Date(completedRun.finishedAt).getTime() - new Date(completedRun.startedAt).getTime()) / 1000
            )
          )
        : null;

      await this.recordRunOutcomeSafe({
        integration: 'hubspot',
        environment: this.hubspotEnvironment,
        syncRunId: completedRun.id,
        runStatus: status,
        triggeredBy: trigger,
        correlationId: run.correlationId,
        recordsSucceeded: outboundResults.succeeded,
        recordsFailed: outboundResults.failed,
        recordsSkipped: contactsPayload.skipped,
        durationSeconds,
        metadata: {
          outbound: contactsPayload.summary,
          inbound: inboundSample.summary
        },
        apiKeyAlias: this.hubspotConfig.apiKeyAlias
      });

      this.logger.info(
        {
          runId: run.id,
          status,
          outboundSucceeded: outboundResults.succeeded,
          outboundFailed: outboundResults.failed,
          inboundSample: inboundSample.count
        },
        'HubSpot sync completed'
      );

      return { run: completedRun, outboundResults, inboundSample };
    } catch (error) {
      timer({ integration: 'hubspot', sync_type: 'delta', status: 'failed' });
      syncRunCounter.inc({ integration: 'hubspot', status: 'failed', trigger }, 1);
      const failedRun = await this.runModel.recordError(run.id, error);
      this.logger.error({ err: error, runId: run.id }, 'HubSpot sync failed');

      const durationSeconds = failedRun?.startedAt && failedRun?.finishedAt
        ? Math.max(
            0,
            Math.round(
              (new Date(failedRun.finishedAt).getTime() - new Date(failedRun.startedAt).getTime()) / 1000
            )
          )
        : null;

      await this.recordRunOutcomeSafe({
        integration: 'hubspot',
        environment: this.hubspotEnvironment,
        syncRunId: failedRun?.id ?? run.id,
        runStatus: 'failed',
        triggeredBy: trigger,
        correlationId: run.correlationId,
        recordsSucceeded: Number(failedRun?.recordsPushed ?? 0),
        recordsFailed: Math.max(Number(failedRun?.recordsFailed ?? 0), 1),
        recordsSkipped: Number(failedRun?.recordsSkipped ?? 0),
        durationSeconds,
        metadata: {
          error: {
            message: error.message,
            name: error.name
          }
        },
        apiKeyAlias: this.hubspotConfig.apiKeyAlias
      });

      throw error;
    }
  }

  async runSalesforceSync({ trigger = 'manual', windowStartAt, windowEndAt } = {}) {
    if (!this.salesforceEnabled) {
      this.logger.warn('Salesforce sync invoked while integration disabled');
      return null;
    }

    const lastRun = await this.runModel.latestForIntegration('salesforce', 'delta');
    const fallbackStart = new Date(Date.now() - this.salesforceWindowMinutes * 60 * 1000);
    const resolvedWindowStart = normaliseDate(windowStartAt, lastRun?.finishedAt ?? fallbackStart);
    const resolvedWindowEnd = normaliseDate(windowEndAt, new Date());

    const correlationId = crypto.randomUUID();
    const run = await this.runModel.create({
      integration: 'salesforce',
      syncType: 'delta',
      triggeredBy: trigger,
      correlationId,
      windowStartAt: resolvedWindowStart,
      windowEndAt: resolvedWindowEnd,
      metadata: {
        windowMinutes: this.salesforceWindowMinutes,
        trigger,
        previousRunId: lastRun?.id ?? null
      }
    });

    await this.runModel.markStarted(run.id, { startedAt: new Date() });
    const timer = syncDurationHistogram.startTimer({ integration: 'salesforce', sync_type: 'delta', status: 'running' });

    try {
      const leadsPayload = await this.collectSalesforceLeads({
        windowStartAt: resolvedWindowStart,
        windowEndAt: resolvedWindowEnd
      });

      let succeeded = 0;
      let failed = 0;

      for (let index = 0; index < leadsPayload.leads.length; index += SALESFORCE_BATCH_SIZE) {
        const slice = leadsPayload.leads.slice(index, index + SALESFORCE_BATCH_SIZE);
        const result = await this.salesforceClient.upsertLeads(slice);
        succeeded += result.succeeded;
        failed += result.failed;

        if (result.results.length) {
          await this.resultModel.bulkInsert(
            result.results.map((entry) => ({
              syncRunId: run.id,
              integration: 'salesforce',
              entityType: 'lead',
              entityId: entry.source.externalId,
              externalId: entry.source.externalId,
              direction: 'outbound',
              operation: 'upsert',
              status: entry.status === 'failed' ? 'failed' : 'succeeded',
              message: entry.message ?? null,
              payload: entry.source.payload
            }))
          );
        }
      }

      if (succeeded) {
        syncRecordCounter.inc({ integration: 'salesforce', direction: 'outbound', outcome: 'succeeded' }, succeeded);
      }
      if (failed) {
        syncRecordCounter.inc({ integration: 'salesforce', direction: 'outbound', outcome: 'failed' }, failed);
      }

      await this.runModel.incrementCounters(run.id, {
        pushed: succeeded,
        failed,
        metadataPatch: {
          outboundCandidates: leadsPayload.leads.length,
          outboundSkipped: leadsPayload.skipped
        }
      });

      const remoteLeads = await this.salesforceClient.queryLeadsUpdatedSince(resolvedWindowStart);
      const inboundEntries = Array.isArray(remoteLeads)
        ? remoteLeads.map((lead) => ({
            syncRunId: run.id,
            integration: 'salesforce',
            entityType: 'lead',
            entityId: lead[this.salesforceClient.externalIdField] ?? lead.Id,
            externalId: lead.Id,
            direction: 'inbound',
            operation: 'read',
            status: 'observed',
            payload: lead
          }))
        : [];

      if (inboundEntries.length) {
        await this.resultModel.bulkInsert(inboundEntries);
        syncRecordCounter.inc(
          { integration: 'salesforce', direction: 'inbound', outcome: 'observed' },
          inboundEntries.length
        );
      }

      await this.runModel.incrementCounters(run.id, {
        pulled: inboundEntries.length,
        metadataPatch: {
          inboundSample: inboundEntries.length
        }
      });

      const status = failed > 0 ? 'partial' : 'succeeded';
      const completedRun = await this.runModel.markCompleted(run.id, {
        status,
        finishedAt: new Date(),
        recordsPushed: succeeded,
        recordsPulled: inboundEntries.length,
        recordsFailed: failed,
        recordsSkipped: leadsPayload.skipped,
        metadata: {
          outbound: leadsPayload.summary,
          inbound: { count: inboundEntries.length }
        }
      });

      timer({ integration: 'salesforce', sync_type: 'delta', status });
      syncRunCounter.inc({ integration: 'salesforce', status, trigger }, 1);

      const durationSeconds = completedRun?.startedAt && completedRun?.finishedAt
        ? Math.max(
            0,
            Math.round(
              (new Date(completedRun.finishedAt).getTime() - new Date(completedRun.startedAt).getTime()) / 1000
            )
          )
        : null;

      await this.recordRunOutcomeSafe({
        integration: 'salesforce',
        environment: this.salesforceEnvironment,
        syncRunId: completedRun.id,
        runStatus: status,
        triggeredBy: trigger,
        correlationId: run.correlationId,
        recordsSucceeded: succeeded,
        recordsFailed: failed,
        recordsSkipped: leadsPayload.skipped,
        durationSeconds,
        metadata: {
          outbound: leadsPayload.summary,
          inbound: { count: inboundEntries.length }
        },
        apiKeyAlias: this.salesforceConfig.apiKeyAlias
      });

      this.logger.info(
        {
          runId: run.id,
          status,
          leadsSucceeded: succeeded,
          leadsFailed: failed,
          inboundSample: inboundEntries.length
        },
        'Salesforce sync completed'
      );

      return { run: completedRun, succeeded, failed };
    } catch (error) {
      timer({ integration: 'salesforce', sync_type: 'delta', status: 'failed' });
      syncRunCounter.inc({ integration: 'salesforce', status: 'failed', trigger }, 1);
      const failedRun = await this.runModel.recordError(run.id, error);
      this.logger.error({ err: error, runId: run.id }, 'Salesforce sync failed');

      const durationSeconds = failedRun?.startedAt && failedRun?.finishedAt
        ? Math.max(
            0,
            Math.round(
              (new Date(failedRun.finishedAt).getTime() - new Date(failedRun.startedAt).getTime()) / 1000
            )
          )
        : null;

      await this.recordRunOutcomeSafe({
        integration: 'salesforce',
        environment: this.salesforceEnvironment,
        syncRunId: failedRun?.id ?? run.id,
        runStatus: 'failed',
        triggeredBy: trigger,
        correlationId: run.correlationId,
        recordsSucceeded: Number(failedRun?.recordsPushed ?? 0),
        recordsFailed: Math.max(Number(failedRun?.recordsFailed ?? 0), 1),
        recordsSkipped: Number(failedRun?.recordsSkipped ?? 0),
        durationSeconds,
        metadata: {
          error: {
            message: error.message,
            name: error.name
          }
        },
        apiKeyAlias: this.salesforceConfig.apiKeyAlias
      });

      throw error;
    }
  }

  async runReconciliation({ trigger = 'manual' } = {}) {
    const correlationId = crypto.randomUUID();
    const windowDays = Number.isFinite(this.reconciliationWindowDays)
      ? Math.max(1, Math.round(this.reconciliationWindowDays))
      : 7;
    const reportDate = new Date().toISOString().slice(0, 10);

    const tasks = [];

    if (this.hubspotEnabled) {
      tasks.push(this.reconcileHubSpot({ correlationId, trigger, windowDays, reportDate }));
    }

    if (this.salesforceEnabled) {
      tasks.push(this.reconcileSalesforce({ correlationId, trigger, windowDays, reportDate }));
    }

    const reports = await Promise.all(tasks);
    return reports.filter(Boolean);
  }

  async reconcileHubSpot({ correlationId, trigger, windowDays, reportDate }) {
    const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const localContacts = await db('users as u')
      .leftJoin('community_members as cm', 'cm.user_id', 'u.id')
      .where('u.email', '!=', null)
      .andWhere('u.email', '!=', '')
      .andWhere('u.updated_at', '>=', windowStart)
      .select('u.email')
      .groupBy('u.email');

    const localSet = new Set(localContacts.map((row) => row.email));

    const remoteContacts = [];
    let after;
    for (let page = 0; page < MAX_HUBSPOT_INBOUND_PAGES; page += 1) {
      const { results, paging } = await this.hubspotClient.searchContacts({
        updatedSince: windowStart,
        limit: 200,
        after
      });
      remoteContacts.push(...results.map((result) => result.properties?.email ?? result.id));
      after = paging?.next?.after;
      if (!after) {
        break;
      }
    }

    const remoteSet = new Set(remoteContacts.filter(Boolean));

    const missingInIntegration = Array.from(localSet).filter((email) => !remoteSet.has(email)).slice(0, 50);
    const missingInPlatform = Array.from(remoteSet).filter((email) => !localSet.has(email)).slice(0, 50);

    if (missingInIntegration.length) {
      syncMismatchCounter.inc({ integration: 'hubspot', direction: 'outbound' }, missingInIntegration.length);
    }
    if (missingInPlatform.length) {
      syncMismatchCounter.inc({ integration: 'hubspot', direction: 'inbound' }, missingInPlatform.length);
    }

    return this.reportModel.create({
      integration: 'hubspot',
      reportDate,
      mismatchCount: missingInIntegration.length + missingInPlatform.length,
      missingInPlatform,
      missingInIntegration,
      extraContext: {
        trigger,
        windowDays,
        sampledRemote: remoteContacts.length,
        sampledLocal: localContacts.length
      },
      correlationId
    });
  }

  async reconcileSalesforce({ correlationId, trigger, windowDays, reportDate }) {
    const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const localProjects = await db('creation_projects')
      .where('updated_at', '>=', windowStart)
      .select('public_id as publicId');
    const localSet = new Set(localProjects.map((project) => project.publicId));

    const remoteLeads = await this.salesforceClient.queryLeadsUpdatedSince(windowStart);
    const remoteIds = remoteLeads
      .map((lead) => lead[this.salesforceClient.externalIdField] ?? null)
      .filter(Boolean);
    const remoteSet = new Set(remoteIds);

    const missingInIntegration = Array.from(localSet)
      .filter((id) => !remoteSet.has(id))
      .slice(0, 50);
    const missingInPlatform = remoteIds.filter((id) => !localSet.has(id)).slice(0, 50);

    if (missingInIntegration.length) {
      syncMismatchCounter.inc({ integration: 'salesforce', direction: 'outbound' }, missingInIntegration.length);
    }
    if (missingInPlatform.length) {
      syncMismatchCounter.inc({ integration: 'salesforce', direction: 'inbound' }, missingInPlatform.length);
    }

    return this.reportModel.create({
      integration: 'salesforce',
      reportDate,
      mismatchCount: missingInIntegration.length + missingInPlatform.length,
      missingInPlatform,
      missingInIntegration,
      extraContext: {
        trigger,
        windowDays,
        sampledRemote: remoteIds.length,
        sampledLocal: localProjects.length
      },
      correlationId
    });
  }

  async collectHubSpotContacts({ windowStartAt, windowEndAt }) {
    let offset = 0;
    let fetched = 0;
    let skipped = 0;
    const contacts = [];

    const baseQuery = db('users as u')
      .leftJoin('community_members as cm', 'cm.user_id', 'u.id')
      .leftJoin('communities as c', 'c.id', 'cm.community_id')
      .whereNotNull('u.email')
      .where('u.email', '!=', '')
      .groupBy('u.id')
      .orderBy('u.id', 'asc');

    if (windowStartAt) {
      baseQuery.andWhere((builder) => {
        builder.where('u.updated_at', '>=', windowStartAt);
        builder.orWhere('cm.updated_at', '>=', windowStartAt);
      });
    }

    if (windowEndAt) {
      baseQuery.andWhere('u.updated_at', '<=', windowEndAt);
    }

    while (true) {
      const rows = await baseQuery
        .clone()
        .select(
          'u.id',
          'u.email',
          'u.first_name as firstName',
          'u.last_name as lastName',
          'u.role',
          'u.created_at as createdAt',
          'u.updated_at as updatedAt',
          'u.last_login_at as lastLoginAt',
          db.raw('COUNT(DISTINCT cm.community_id) as communityCount'),
          db.raw("MAX(cm.updated_at) as membershipUpdatedAt"),
          db.raw("GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR '; ') as communityNames")
        )
        .limit(HUBSPOT_BATCH_SIZE)
        .offset(offset);

      if (!rows.length) {
        break;
      }

      rows.forEach((row) => {
        fetched += 1;
        if (!row.email) {
          skipped += 1;
          return;
        }

        const communityNames = row.communityNames ? row.communityNames.split('; ') : [];

        const signupIso = toIsoOrNull(row.createdAt);
        const updatedIso = toIsoOrNull(row.updatedAt);
        const membershipIso = toIsoOrNull(row.membershipUpdatedAt);

        const properties = compactObject({
          email: row.email,
          firstname: row.firstName ?? undefined,
          lastname: row.lastName ?? undefined,
          edulure_role: row.role ?? 'learner',
          edulure_signup_date: signupIso ? signupIso.slice(0, 10) : undefined,
          edulure_last_active: toIsoOrNull(row.lastLoginAt),
          edulure_last_updated: updatedIso,
          edulure_membership_last_updated: membershipIso,
          edulure_community_count: Number(row.communityCount ?? 0),
          edulure_communities: communityNames.join(', ')
        });

        contacts.push({
          email: row.email,
          id: row.email,
          idProperty: 'email',
          idempotencyKey: buildHash([
            'hubspot-contact',
            row.email,
            updatedIso,
            membershipIso,
            JSON.stringify(properties)
          ]),
          properties
        });
      });

      if (rows.length < HUBSPOT_BATCH_SIZE) {
        break;
      }

      offset += HUBSPOT_BATCH_SIZE;
    }

    return {
      contacts,
      skipped,
      summary: {
        fetched,
        skipped,
        prepared: contacts.length,
        windowStartAt: toIsoOrNull(windowStartAt),
        windowEndAt: toIsoOrNull(windowEndAt)
      }
    };
  }

  async collectHubSpotInbound({ windowStartAt, runId }) {
    const entries = [];
    let after;
    let pages = 0;

    while (pages < MAX_HUBSPOT_INBOUND_PAGES) {
      const { results, paging } = await this.hubspotClient.searchContacts({
        updatedSince: windowStartAt,
        limit: 200,
        after
      });

      if (!Array.isArray(results) || results.length === 0) {
        break;
      }

      entries.push(
        ...results.map((result) => ({
          syncRunId: runId,
          integration: 'hubspot',
          entityType: 'contact',
          entityId: result.properties?.email ?? result.id,
          externalId: result.id,
          direction: 'inbound',
          operation: 'read',
          status: 'observed',
          payload: result.properties ?? {}
        }))
      );

      pages += 1;
      after = paging?.next?.after;
      if (!after) {
        break;
      }
    }

    if (entries.length) {
      await this.resultModel.bulkInsert(entries);
    }

    return {
      count: entries.length,
      nextAfter: after ?? null,
      summary: {
        pages,
        sampled: entries.length,
        windowStartAt: toIsoOrNull(windowStartAt)
      }
    };
  }

  async collectSalesforceLeads({ windowStartAt, windowEndAt }) {
    const query = db('creation_projects as cp')
      .leftJoin('users as u', 'u.id', 'cp.owner_id')
      .select(
        'cp.public_id as publicId',
        'cp.title',
        'cp.summary',
        'cp.type',
        'cp.status',
        'cp.updated_at as updatedAt',
        'cp.review_requested_at as reviewRequestedAt',
        'cp.approved_at as approvedAt',
        'cp.published_at as publishedAt',
        'u.email',
        'u.first_name as firstName',
        'u.last_name as lastName'
      )
      .whereNotNull('cp.public_id')
      .whereNotNull('u.email')
      .where('u.email', '!=', '')
      .orderBy('cp.updated_at', 'desc');

    if (windowStartAt) {
      query.andWhere('cp.updated_at', '>=', windowStartAt);
    }
    if (windowEndAt) {
      query.andWhere('cp.updated_at', '<=', windowEndAt);
    }

    const rows = await query.limit(2000);

    const leads = [];
    let skipped = 0;

    rows.forEach((row) => {
      if (!row.email) {
        skipped += 1;
        return;
      }

      const payload = compactObject({
        Company: 'Edulure Creator',
        LastName: row.lastName || row.firstName || 'Creator',
        FirstName: row.firstName ?? undefined,
        Email: row.email,
        Status: mapProjectStatusToLeadStatus(row.status),
        LeadSource: 'Edulure Platform',
        Title: truncate(row.title ?? '', 255) || undefined,
        Description: truncate(row.summary ?? '', 32000) || undefined,
        Edulure_Project_Type__c: row.type,
        Edulure_Project_Status__c: row.status,
        Edulure_Project_Updated_At__c: toIsoOrNull(row.updatedAt),
        Edulure_Project_Approved_At__c: toIsoOrNull(row.approvedAt),
        Edulure_Project_Published_At__c: toIsoOrNull(row.publishedAt)
      });

      leads.push({
        externalId: row.publicId,
        payload,
        hash: buildHash(['salesforce-lead', row.publicId, JSON.stringify(payload)])
      });
    });

    return {
      leads,
      skipped,
      summary: {
        candidates: rows.length,
        prepared: leads.length,
        skipped,
        windowStartAt: toIsoOrNull(windowStartAt),
        windowEndAt: toIsoOrNull(windowEndAt)
      }
    };
  }

  async statusSnapshot() {
    const hubspotRecent = this.hubspotEnabled
      ? await this.runModel.listRecent('hubspot', { limit: 5 })
      : [];
    const salesforceRecent = this.salesforceEnabled
      ? await this.runModel.listRecent('salesforce', { limit: 5 })
      : [];

    const reconciliationReports = await this.reportModel.list('hubspot', { limit: 3 });

    const [hubspotStatus, hubspotCalls, salesforceStatus, salesforceCalls] = await Promise.all([
      this.hubspotEnabled
        ? this.getStatusSafe('hubspot', this.hubspotEnvironment)
        : Promise.resolve(null),
      this.hubspotEnabled
        ? this.summariseCallsSafe('hubspot', { sinceHours: 12 })
        : Promise.resolve(null),
      this.salesforceEnabled
        ? this.getStatusSafe('salesforce', this.salesforceEnvironment)
        : Promise.resolve(null),
      this.salesforceEnabled
        ? this.summariseCallsSafe('salesforce', { sinceHours: 12 })
        : Promise.resolve(null)
    ]);

    return {
      hubspot: {
        enabled: this.hubspotEnabled,
        environment: this.hubspotEnvironment,
        recentRuns: hubspotRecent,
        status: hubspotStatus,
        callSummary: hubspotCalls
      },
      salesforce: {
        enabled: this.salesforceEnabled,
        environment: this.salesforceEnvironment,
        recentRuns: salesforceRecent,
        status: salesforceStatus,
        callSummary: salesforceCalls
      },
      reconciliation: reconciliationReports,
      concurrentJobs: this.concurrentJobs,
      maxConcurrentJobs: this.maxConcurrentJobs
    };
  }
}

let hubspotClientInstance = null;
if (env.integrations?.hubspot?.enabled && env.integrations.hubspot.accessToken) {
  try {
    hubspotClientInstance = new HubSpotClient({
      accessToken: env.integrations.hubspot.accessToken,
      baseUrl: env.integrations.hubspot.baseUrl,
      timeoutMs: env.integrations.hubspot.timeoutMs,
      maxRetries: env.integrations.hubspot.maxRetries,
      logger: logger.child({ integration: 'hubspot' }),
      auditLogger: async ({ metadata, ...payload }) =>
        integrationStatusService.recordCallAudit({
          integration: 'hubspot',
          provider: 'hubspot',
          environment: env.integrations.hubspot.environment ?? 'production',
          metadata: {
            ...(metadata ?? {}),
            baseUrl: env.integrations.hubspot.baseUrl
          },
          ...payload
        })
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialise HubSpot client');
  }
}

let salesforceClientInstance = null;
if (
  env.integrations?.salesforce?.enabled &&
  env.integrations.salesforce.clientId &&
  env.integrations.salesforce.clientSecret &&
  env.integrations.salesforce.username &&
  env.integrations.salesforce.password
) {
  try {
    salesforceClientInstance = new SalesforceClient({
      clientId: env.integrations.salesforce.clientId,
      clientSecret: env.integrations.salesforce.clientSecret,
      username: env.integrations.salesforce.username,
      password: env.integrations.salesforce.password,
      securityToken: env.integrations.salesforce.securityToken,
      loginUrl: env.integrations.salesforce.loginUrl,
      timeoutMs: env.integrations.salesforce.timeoutMs,
      maxRetries: env.integrations.salesforce.maxRetries,
      externalIdField: env.integrations.salesforce.externalIdField,
      logger: logger.child({ integration: 'salesforce' }),
      auditLogger: async ({ metadata, ...payload }) =>
        integrationStatusService.recordCallAudit({
          integration: 'salesforce',
          provider: 'salesforce',
          environment: env.integrations.salesforce.environment ?? 'production',
          metadata: {
            ...(metadata ?? {}),
            loginUrl: env.integrations.salesforce.loginUrl
          },
          ...payload
        })
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialise Salesforce client');
  }
}

const integrationOrchestratorService = new IntegrationOrchestratorService({
  envConfig: env.integrations,
  hubspotClient: hubspotClientInstance,
  salesforceClient: salesforceClientInstance,
  statusService: integrationStatusService
});

export default integrationOrchestratorService;
