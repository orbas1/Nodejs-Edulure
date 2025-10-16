import db from '../config/database.js';
import logger from '../config/logger.js';
import IntegrationApiKeyModel from '../models/IntegrationApiKeyModel.js';
import IntegrationExternalCallAuditModel from '../models/IntegrationExternalCallAuditModel.js';
import IntegrationStatusEventModel from '../models/IntegrationStatusEventModel.js';
import IntegrationStatusModel from '../models/IntegrationStatusModel.js';

function truncate(value, maxLength) {
  if (typeof value !== 'string') {
    return value;
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function deriveOutcomeFromStatus(status, failureCount) {
  if (status === 'failed') {
    return { status: 'critical', summarySeed: 'failed' };
  }

  if (status === 'partial' || failureCount > 0) {
    return { status: 'degraded', summarySeed: 'completed with issues' };
  }

  return { status: 'operational', summarySeed: 'completed successfully' };
}

function normaliseMetadata(existing = {}, patch = {}) {
  const merged = { ...existing };
  const keys = Object.keys(patch);
  for (const key of keys) {
    if (patch[key] === undefined) {
      continue;
    }

    if (patch[key] && typeof patch[key] === 'object' && !Array.isArray(patch[key])) {
      merged[key] = normaliseMetadata(existing[key] ?? {}, patch[key]);
    } else {
      merged[key] = patch[key];
    }
  }
  return merged;
}

export class IntegrationStatusService {
  constructor({
    statusModel = IntegrationStatusModel,
    statusEventModel = IntegrationStatusEventModel,
    callAuditModel = IntegrationExternalCallAuditModel,
    apiKeyModel = IntegrationApiKeyModel,
    database = db,
    loggerInstance = logger.child({ service: 'IntegrationStatusService' }),
    nowProvider = () => new Date()
  } = {}) {
    this.statusModel = statusModel;
    this.statusEventModel = statusEventModel;
    this.callAuditModel = callAuditModel;
    this.apiKeyModel = apiKeyModel;
    this.db = database;
    this.logger = loggerInstance;
    this.nowProvider = nowProvider;
  }

  async resolveApiKeyId({ apiKeyId, alias, provider, environment = 'production', connection } = {}) {
    if (apiKeyId) {
      return apiKeyId;
    }

    if (!alias || !provider) {
      return null;
    }

    try {
      const record = await this.apiKeyModel.findByAlias(
        { provider, environment, alias },
        connection ?? this.db
      );
      return record?.id ?? null;
    } catch (error) {
      this.logger.warn(
        { alias, provider, environment, err: error },
        'Failed to resolve integration API key alias'
      );
      return null;
    }
  }

  async recordRunOutcome({
    integration,
    environment = 'production',
    syncRunId,
    runStatus,
    triggeredBy,
    correlationId,
    recordsSucceeded = 0,
    recordsFailed = 0,
    recordsSkipped = 0,
    durationSeconds,
    metadata = {},
    apiKeyAlias,
    apiKeyId
  }) {
    if (!integration) {
      throw new Error('Integration is required');
    }

    const now = this.nowProvider();
    const failureCount = Number(recordsFailed ?? 0);
    const successCount = Number(recordsSucceeded ?? 0);

    return this.db.transaction(async (trx) => {
      const existing = await this.statusModel.findByIntegration(integration, environment, trx);
      const resolvedApiKeyId = await this.resolveApiKeyId({
        apiKeyId,
        alias: apiKeyAlias,
        provider: integration,
        environment,
        connection: trx
      });

      const outcome = deriveOutcomeFromStatus(runStatus, failureCount);

      let consecutiveFailures = existing?.consecutiveFailures ?? 0;
      let openIncidents = existing?.openIncidentCount ?? 0;
      let lastSuccessAt = existing?.lastSuccessAt ?? null;
      let lastFailureAt = existing?.lastFailureAt ?? null;

      if (runStatus === 'failed') {
        consecutiveFailures += 1;
        openIncidents += 1;
        lastFailureAt = now;
      } else if (runStatus === 'partial' || failureCount > 0) {
        consecutiveFailures = 0;
        openIncidents = Math.max(openIncidents, 1);
        lastFailureAt = now;
        lastSuccessAt = now;
      } else {
        consecutiveFailures = 0;
        openIncidents = failureCount > 0 ? Math.max(openIncidents, 1) : 0;
        lastSuccessAt = now;
      }

      const summary = truncate(
        `Sync ${syncRunId ?? 'run'} ${outcome.summarySeed} – ${successCount} succeeded, ${failureCount} failed, ${recordsSkipped} skipped`,
        255
      );

      const mergedMetadata = normaliseMetadata(existing?.metadata ?? {}, {
        lastRun: {
          syncRunId,
          status: runStatus,
          recordsSucceeded: successCount,
          recordsFailed: failureCount,
          recordsSkipped: Number(recordsSkipped ?? 0),
          durationSeconds: durationSeconds ?? null,
          triggeredBy: triggeredBy ?? null,
          correlationId: correlationId ?? null,
          completedAt: now.toISOString()
        },
        health: {
          consecutiveFailures,
          openIncidents,
          lastSuccessAt: lastSuccessAt ? new Date(lastSuccessAt).toISOString() : null,
          lastFailureAt: lastFailureAt ? new Date(lastFailureAt).toISOString() : null
        }
      });

      let record;
      if (existing) {
        record = await this.statusModel.updateById(
          existing.id,
          {
            status: outcome.status,
            statusSummary: summary,
            latestSyncRunId: syncRunId ?? existing.latestSyncRunId ?? null,
            primaryApiKeyId: resolvedApiKeyId ?? existing.primaryApiKeyId ?? null,
            lastSuccessAt,
            lastFailureAt,
            openIncidentCount: openIncidents,
            consecutiveFailures,
            metadata: mergedMetadata
          },
          trx
        );
      } else {
        record = await this.statusModel.create(
          {
            integration,
            environment,
            status: outcome.status,
            statusSummary: summary,
            latestSyncRunId: syncRunId ?? null,
            primaryApiKeyId: resolvedApiKeyId ?? null,
            lastSuccessAt,
            lastFailureAt,
            openIncidentCount: openIncidents,
            consecutiveFailures,
            metadata: mergedMetadata
          },
          trx
        );
      }

      await this.statusEventModel.create(
        {
          statusId: record.id,
          integration,
          environment,
          status: outcome.status,
          statusSummary: summary,
          syncRunId,
          apiKeyId: record.primaryApiKeyId ?? null,
          consecutiveFailures,
          openIncidentCount: openIncidents,
          triggeredBy,
          correlationId,
          metadata: mergedMetadata.lastRun
        },
        trx
      );

      return record;
    });
  }

  async recordCallAudit({
    integration,
    provider,
    environment = 'production',
    requestMethod,
    requestPath,
    statusCode,
    outcome,
    direction = 'outbound',
    durationMs,
    requestId,
    correlationId,
    triggeredBy,
    errorCode,
    errorMessage,
    metadata,
    apiKeyAlias,
    apiKeyId
  }) {
    if (!integration || !provider) {
      throw new Error('Integration and provider are required to record call audit entries');
    }

    const resolvedApiKeyId = await this.resolveApiKeyId({
      apiKeyId,
      alias: apiKeyAlias,
      provider: provider ?? integration,
      environment
    });

    return this.callAuditModel.create({
      integration,
      provider,
      environment,
      apiKeyId: resolvedApiKeyId ?? null,
      requestMethod,
      requestPath,
      statusCode,
      outcome,
      direction,
      durationMs,
      requestId,
      correlationId,
      triggeredBy,
      errorCode,
      errorMessage,
      metadata
    });
  }

  async getStatus(integration, environment = 'production') {
    return this.statusModel.findByIntegration(integration, environment);
  }

  async listStatuses({ environment } = {}) {
    return this.statusModel.list({ environment });
  }

  async listEvents(integration, options = {}) {
    return this.statusEventModel.listRecent(integration, options);
  }

  async summariseCalls(integration, { sinceHours = 24 } = {}) {
    const since = sinceHours
      ? new Date(this.nowProvider().getTime() - Number(sinceHours) * 60 * 60 * 1000)
      : undefined;

    return this.callAuditModel.summarise(integration, { since });
  }
}

const integrationStatusService = new IntegrationStatusService();

export default integrationStatusService;
