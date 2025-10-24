import crypto from 'crypto';

import db from '../config/database.js';
import logger from '../config/logger.js';
import changeDataCaptureService from './ChangeDataCaptureService.js';

function toPlainObject(value, fallback = {}) {
  if (!value) {
    return { ...fallback };
  }

  if (typeof value === 'string') {
    try {
      return { ...fallback, ...JSON.parse(value) };
    } catch (error) {
      logger.warn({ err: error, raw: value }, 'Failed to parse JSON criteria; falling back to defaults');
      return { ...fallback };
    }
  }

  if (typeof value === 'object') {
    return { ...fallback, ...value };
  }

  return { ...fallback };
}

function mapPolicyRow(row) {
  return {
    id: row.id,
    entityName: row.entity_name,
    action: row.action,
    retentionPeriodDays: Number(row.retention_period_days),
    description: row.description,
    criteria: toPlainObject(row.criteria),
    active: Boolean(row.active)
  };
}

function utcInterval(trx, days) {
  return trx.raw('DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)', [days]);
}

const strategyRegistry = new Map();

export function registerRetentionStrategy(entityName, factory) {
  if (!entityName || typeof entityName !== 'string') {
    throw new Error('Retention strategies require a non-empty entityName string.');
  }

  if (typeof factory !== 'function') {
    throw new Error(`Retention strategy for "${entityName}" must be a function.`);
  }

  strategyRegistry.set(entityName, factory);
}

export function unregisterRetentionStrategy(entityName) {
  strategyRegistry.delete(entityName);
}

export function getRetentionStrategy(entityName) {
  return strategyRegistry.get(entityName);
}

export function listRetentionStrategies() {
  return Array.from(strategyRegistry.keys());
}

const defaultStrategies = {
  user_sessions(policy, trx) {
    const criteria = policy.criteria ?? {};
    const staleLastUsedDays = Number(criteria.staleLastUsedDays ?? policy.retentionPeriodDays);
    const includeRevoked = criteria.includeRevoked !== false;

    return {
      idColumn: 'id',
      buildQuery() {
        const builder = trx('user_sessions');
        builder.where((query) => {
          query.where('expires_at', '<', trx.raw('UTC_TIMESTAMP()'));
          query.orWhere('last_used_at', '<', utcInterval(trx, staleLastUsedDays));
        });
        if (!includeRevoked) {
          builder.andWhereNull('revoked_at');
        }
        builder.andWhereNull('deleted_at');
        return builder;
      },
      reason: `remove refresh sessions after ${staleLastUsedDays}-day inactivity or expiration`,
      context: {
        includeRevoked,
        staleLastUsedDays
      }
    };
  },
  user_email_verification_tokens(policy, trx) {
    return {
      idColumn: 'id',
      buildQuery() {
        return trx('user_email_verification_tokens').where('expires_at', '<', utcInterval(trx, policy.retentionPeriodDays));
      },
      reason: 'trim expired verification tokens'
    };
  },
  domain_events(policy, trx) {
    return {
      idColumn: 'id',
      buildQuery() {
        return trx('domain_events').where('created_at', '<', utcInterval(trx, policy.retentionPeriodDays));
      },
      reason: 'purge domain audit events after retention window'
    };
  },
  content_asset_events(policy, trx) {
    return {
      idColumn: 'id',
      buildQuery() {
        return trx('content_asset_events').where('occurred_at', '<', utcInterval(trx, policy.retentionPeriodDays));
      },
      reason: 'remove aged asset telemetry events'
    };
  },
  communities(policy, trx) {
    const softDeleteColumn = policy.criteria?.softDeleteColumn ?? 'deleted_at';
    const visibility = policy.criteria?.visibility ?? null;
    return {
      idColumn: 'id',
      softDeleteColumn,
      buildQuery() {
        const builder = trx('communities').whereNull(softDeleteColumn);
        builder.andWhere('updated_at', '<', utcInterval(trx, policy.retentionPeriodDays));
        if (visibility) {
          builder.andWhere('visibility', visibility);
        }
        return builder;
      },
      reason: `soft delete communities inactive for ${policy.retentionPeriodDays} days`,
      context: {
        visibility
      }
    };
  }
};

for (const [entityName, factory] of Object.entries(defaultStrategies)) {
  registerRetentionStrategy(entityName, factory);
}

const DEFAULT_VERIFICATION = Object.freeze({
  enabled: true,
  failOnResidual: true,
  sampleSize: 5
});

function normaliseVerificationOptions(options = {}) {
  if (!options || typeof options !== 'object') {
    return { ...DEFAULT_VERIFICATION };
  }

  const sampleSizeCandidate = Number(options.sampleSize ?? DEFAULT_VERIFICATION.sampleSize);
  const sampleSize = Number.isFinite(sampleSizeCandidate) && sampleSizeCandidate > 0
    ? Math.min(500, Math.max(1, Math.trunc(sampleSizeCandidate)))
    : DEFAULT_VERIFICATION.sampleSize;

  return {
    enabled: options.enabled !== false,
    failOnResidual: options.failOnResidual !== false,
    sampleSize,
    metadata: options.metadata ?? null
  };
}

async function executeAction(policy, buildQuery, { dryRun, softDeleteColumn, trx, verification }) {
  const verificationOptions = normaliseVerificationOptions(verification);
  const countQuery = () => buildQuery().clone();
  const [{ total: beforeTotal }] = await countQuery().count({ total: '*' });
  const initialCount = Number(beforeTotal ?? 0);

  if (dryRun) {
    return {
      affectedRows: initialCount,
      preRunCount: initialCount,
      verification: {
        status: 'simulated',
        remainingRows: initialCount,
        metadata: verificationOptions.metadata ?? null
      }
    };
  }

  let affectedRows;
  if (policy.action === 'hard-delete') {
    affectedRows = await buildQuery().del();
  } else if (policy.action === 'soft-delete') {
    const column = softDeleteColumn ?? 'deleted_at';
    affectedRows = await buildQuery().update({ [column]: trx.fn.now() });
  } else {
    throw new Error(`Unsupported data retention action "${policy.action}"`);
  }

  let verificationResult = null;
  if (verificationOptions.enabled) {
    const [{ total: remainingTotal }] = await countQuery().count({ total: '*' });
    const remainingRows = Number(remainingTotal ?? 0);
    const status = remainingRows === 0 ? 'cleared' : 'residual';
    verificationResult = {
      status,
      remainingRows,
      metadata: verificationOptions.metadata ?? null
    };
  }

  return {
    affectedRows,
    preRunCount: initialCount,
    verification: verificationResult
  };
}

export async function fetchActivePolicies(trx = db) {
  const rows = await trx('data_retention_policies').where('active', true);
  return rows.map(mapPolicyRow);
}

const DEFAULT_ALERT_THRESHOLD = 500;

async function publishRetentionEvent({
  runId,
  policy,
  status,
  details,
  dryRun
}) {
  try {
    await changeDataCaptureService.recordEvent({
      domain: 'governance',
      entityName: 'data_retention_policy',
      entityId: policy.id,
      operation:
        status === 'failed'
          ? 'RETENTION_FAILED'
          : dryRun
            ? 'RETENTION_SIMULATED'
            : 'RETENTION_ENFORCED',
      payload: {
        runId,
        policyId: policy.id,
        entityName: policy.entityName,
        status,
        details
      },
      dryRun
    });
  } catch (error) {
    logger.error({ err: error, policyId: policy.id, status }, 'Failed to record CDC event for retention policy');
  }
}

export async function enforceRetentionPolicies({
  dryRun = false,
  mode,
  policies: providedPolicies,
  dbClient = db,
  alertThreshold = DEFAULT_ALERT_THRESHOLD,
  onAlert,
  verification
} = {}) {
  const resolvedMode = mode ?? (dryRun ? 'simulate' : 'commit');
  const simulate = resolvedMode === 'simulate';
  const runDry = dryRun || simulate;
  const runLogger = logger.child({ module: 'data-retention', dryRun: runDry, mode: resolvedMode });
  const executionResults = [];
  const runId = crypto.randomUUID();
  const verificationOptions = normaliseVerificationOptions(verification);
  const sampleSize = verificationOptions.sampleSize;

  const policies = providedPolicies
    ? providedPolicies.map((policy) => (policy.entityName ? policy : mapPolicyRow(policy)))
    : await fetchActivePolicies(dbClient);

  for (const policy of policies) {
    const policyLogger = runLogger.child({ policyId: policy.id, entityName: policy.entityName });

    if (!policy.active) {
      executionResults.push({
        policyId: policy.id,
        entityName: policy.entityName,
        action: policy.action,
        status: 'skipped-inactive'
      });
      continue;
    }

    const strategyFactory = getRetentionStrategy(policy.entityName);
    if (!strategyFactory) {
      policyLogger.warn('No data retention strategy registered; skipping');
      executionResults.push({
        policyId: policy.id,
        entityName: policy.entityName,
        action: policy.action,
        status: 'skipped-unsupported'
      });
      continue;
    }

    try {
      // Ensure each policy executes in its own transaction to isolate locking scope.
      const result = await dbClient.transaction(async (trx) => {
        const strategy = strategyFactory(policy, trx);
        const buildQuery = strategy.buildQuery;
        const idColumn = strategy.idColumn ?? 'id';
        const sampleIds = await buildQuery().clone().limit(sampleSize).pluck(idColumn);

        if (sampleIds.length === 0) {
          policyLogger.info('No records matched retention policy');
          if (!runDry) {
            await trx('data_retention_audit_logs').insert({
              policy_id: policy.id,
              dry_run: false,
              rows_affected: 0,
              details: JSON.stringify({
                reason: strategy.reason,
                sampleIds: [],
                dryRun: false,
                runId
              })
            });
          }

          const emptyResult = {
            affectedRows: 0,
            sampleIds,
            context: strategy.context ?? {},
            verification: {
              status: runDry ? 'simulated' : 'cleared',
              remainingRows: 0,
              metadata: verificationOptions.metadata ?? null
            },
            preRunCount: 0
          };

          return emptyResult;
        }

        const { affectedRows, preRunCount, verification: verificationResult } = await executeAction(
          policy,
          buildQuery,
          {
            dryRun: runDry,
            softDeleteColumn: strategy.softDeleteColumn,
            trx,
            verification: verificationOptions
          }
        );

        const auditPayload = {
          reason: strategy.reason,
          sampleIds,
          dryRun: runDry,
          runId,
          matchedRows: affectedRows,
          context: strategy.context ?? {},
          verification: verificationResult ?? null,
          preRunCount
        };

        if (!runDry) {
          await trx('data_retention_audit_logs').insert({
            policy_id: policy.id,
            dry_run: false,
            rows_affected: affectedRows,
            details: JSON.stringify(auditPayload)
          });
        }

        policyLogger.info({ affectedRows, sampleIds, dryRun: runDry, action: policy.action }, 'Retention policy enforced');

        return {
          affectedRows,
          sampleIds,
          context: strategy.context ?? {},
          verification: verificationResult ?? null,
          preRunCount
        };
      });

      const outcome = {
        policyId: policy.id,
        entityName: policy.entityName,
        action: policy.action,
        status: 'executed',
        affectedRows: result.affectedRows,
        sampleIds: result.sampleIds,
        dryRun: runDry,
        description: policy.description,
        context: result.context ?? {},
        verification: result.verification ?? null,
        preRunCount: result.preRunCount
      };

      if (verificationOptions.enabled && outcome.verification?.status === 'residual') {
        policyLogger.warn(
          {
            remainingRows: outcome.verification.remainingRows,
            policyId: policy.id,
            action: policy.action
          },
          'Data retention verification detected residual rows'
        );
      }

      executionResults.push(outcome);

      if (typeof onAlert === 'function' && result.affectedRows >= alertThreshold && !runDry) {
        onAlert({
          runId,
          policy,
          result,
          mode: resolvedMode
        });
      }

      await publishRetentionEvent({
        runId,
        policy,
        status: 'executed',
        details: outcome,
        dryRun: runDry
      });
    } catch (error) {
      policyLogger.error({ err: error }, 'Failed to enforce data retention policy');
      const failure = {
        policyId: policy.id,
        entityName: policy.entityName,
        action: policy.action,
        status: 'failed',
        error: error.message
      };
      executionResults.push(failure);
      await publishRetentionEvent({
        runId,
        policy,
        status: 'failed',
        details: failure,
        dryRun: runDry
      });
    }
  }

  return { dryRun: runDry, mode: resolvedMode, runId, results: executionResults };
}
