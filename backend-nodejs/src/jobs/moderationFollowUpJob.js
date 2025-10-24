import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import CommunityPostModerationActionModel from '../models/CommunityPostModerationActionModel.js';
import CommunityPostModerationCaseModel from '../models/CommunityPostModerationCaseModel.js';
import ModerationFollowUpModel from '../models/ModerationFollowUpModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import {
  moderationFollowUpBacklogGauge,
  moderationFollowUpLatencySeconds,
  moderationFollowUpProcessedTotal
} from '../observability/metrics.js';

function createLogger() {
  return logger.child({ module: 'moderation-follow-up-job' });
}

async function hydrateFollowUp(followUp) {
  const [action, moderationCase] = await Promise.all([
    followUp.actionId ? CommunityPostModerationActionModel.findById(followUp.actionId) : null,
    CommunityPostModerationCaseModel.findById(followUp.caseId)
  ]);

  return {
    followUp,
    action,
    case: moderationCase
  };
}

const SEVERITY_TOKENS = {
  low: 'emerald',
  medium: 'amber',
  high: 'ruby',
  critical: 'ruby'
};

const ESCALATION_SEVERITIES = new Set(['high', 'critical']);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveSeverity(severity) {
  if (!severity) {
    return { level: 'unknown', token: 'slate' };
  }

  const level = String(severity).toLowerCase();
  return { level, token: SEVERITY_TOKENS[level] ?? 'slate' };
}

function computeSlaSeconds(followUp, now) {
  const created = followUp?.createdAt ? new Date(followUp.createdAt) : null;
  if (!created || Number.isNaN(created.getTime())) {
    return null;
  }
  const diffMs = now.getTime() - created.getTime();
  return diffMs >= 0 ? Math.round(diffMs / 1000) : 0;
}

function shouldEscalate(severityLevel, followUp, moderationCase) {
  if (!ESCALATION_SEVERITIES.has(severityLevel)) {
    return false;
  }
  if (!followUp.assignedTo && !moderationCase?.assigneeId) {
    return true;
  }
  return false;
}

export class ModerationFollowUpJob {
  constructor({
    enabled = env.moderation.followUps.enabled,
    schedule = env.moderation.followUps.cronExpression,
    timezone = env.moderation.followUps.timezone,
    batchSize = env.moderation.followUps.batchSize,
    scheduler = cron,
    nowProvider = () => new Date(),
    loggerInstance = createLogger(),
    metrics = {
      processedCounter: moderationFollowUpProcessedTotal,
      latencyHistogram: moderationFollowUpLatencySeconds,
      backlogGauge: moderationFollowUpBacklogGauge
    }
  } = {}) {
    this.enabled = Boolean(enabled);
    this.schedule = schedule;
    this.timezone = timezone;
    this.batchSize = batchSize;
    this.scheduler = scheduler;
    this.nowProvider = nowProvider;
    this.logger = loggerInstance;
    this.task = null;
    this.metrics = metrics ?? {};

    if (typeof this.batchSize !== 'number' || this.batchSize <= 0) {
      throw new Error('ModerationFollowUpJob requires a positive batch size.');
    }
  }

  async recordBacklog(now) {
    if (!this.metrics?.backlogGauge) {
      return;
    }

    try {
      const [pendingTotal, dueTotal] = await Promise.all([
        ModerationFollowUpModel.countPending(),
        ModerationFollowUpModel.countDue(now)
      ]);

      this.metrics.backlogGauge.labels('pending').set(pendingTotal);
      this.metrics.backlogGauge.labels('due').set(dueTotal);
    } catch (error) {
      this.logger.warn({ err: error }, 'Failed to record moderation follow-up backlog metrics');
    }
  }

  recordOutcome(result, severityLevel, slaSeconds) {
    if (this.metrics?.processedCounter) {
      this.metrics.processedCounter.labels(result).inc();
    }

    if (slaSeconds !== null && slaSeconds !== undefined && this.metrics?.latencyHistogram) {
      this.metrics.latencyHistogram.observe({ severity: severityLevel ?? 'unknown' }, slaSeconds);
    }
  }

  async recordDomainEventWithRetry(event, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await DomainEventModel.record(event);
      } catch (error) {
        lastError = error;
        if (attempt === attempts) {
          throw error;
        }
        await delay(attempt * 100);
      }
    }

    throw lastError;
  }

  start() {
    if (!this.enabled) {
      this.logger.info('Moderation follow-up job disabled; skipping start.');
      return;
    }

    if (this.task) {
      return;
    }

    const validate = this.scheduler.validate ?? (() => true);
    if (!validate(this.schedule)) {
      throw new Error(`Invalid moderation follow-up cron expression: "${this.schedule}"`);
    }

    this.task = this.scheduler.schedule(
      this.schedule,
      () => {
        this.runCycle('scheduled').catch((error) => {
          this.logger.error({ err: error }, 'Unhandled moderation follow-up error');
        });
      },
      { timezone: this.timezone }
    );

    if (typeof this.task.start === 'function') {
      this.task.start();
    }

    this.logger.info(
      { schedule: this.schedule, timezone: this.timezone },
      'Moderation follow-up job scheduled'
    );
  }

  stop() {
    if (this.task && typeof this.task.stop === 'function') {
      this.task.stop();
    }
    this.task = null;
  }

  async runCycle(trigger = 'manual') {
    if (!this.enabled) {
      this.logger.debug({ trigger }, 'Moderation follow-up job invoked while disabled');
      return { processed: 0, dispatched: [] };
    }

    const now = this.nowProvider();
    await this.recordBacklog(now);
    const dueFollowUps = await ModerationFollowUpModel.listDue({ now, limit: this.batchSize });
    if (!dueFollowUps.length) {
      this.logger.debug({ trigger }, 'No moderation follow-ups due');
      return { processed: 0, dispatched: [] };
    }

    const hydrated = await Promise.all(dueFollowUps.map((followUp) => hydrateFollowUp(followUp)));
    const dispatched = [];

    for (const entry of hydrated) {
      const { followUp, action, case: moderationCase } = entry;
      const severityInfo = resolveSeverity(moderationCase?.severity);
      const severityLevel = severityInfo.level;
      const severityToken = severityInfo.token;
      const escalationRequired = shouldEscalate(severityLevel, followUp, moderationCase);
      const status = escalationRequired ? 'escalation-pending' : 'reminder-due';
      const statusColor = escalationRequired ? 'ruby' : 'indigo';
      const assignedTo = followUp.assignedTo ?? action?.actorId ?? null;
      const slaSeconds = computeSlaSeconds(followUp, now);

      try {
        await this.recordDomainEventWithRetry({
          entityType: 'community_post',
          entityId: moderationCase?.postId ?? null,
          eventType: 'community.moderation.follow_up.due',
          payload: {
            followUpId: followUp.id,
            caseId: moderationCase?.publicId ?? followUp.caseId,
            actionId: followUp.actionId ?? null,
            communityId: moderationCase?.communityId ?? null,
            assignedTo,
            dueAt: followUp.dueAt,
            status,
            severity: severityLevel,
            severityToken,
            statusColor,
            context: {
              followUpMetadata: followUp.metadata,
              actionMetadata: action?.metadata ?? null,
              caseStatus: moderationCase?.status ?? null,
              caseSeverity: moderationCase?.severity ?? null,
              slaSeconds
            }
          },
          performedBy: assignedTo
        });

        await ModerationFollowUpModel.markCompleted(followUp.id, {
          status: 'completed',
          completedAt: now,
          metadata: {
            ...followUp.metadata,
            dispatchedAt: now,
            trigger,
            status,
            severity: severityLevel,
            severityToken,
            slaSeconds
          }
        });

        this.recordOutcome('sent', severityLevel, slaSeconds);
        dispatched.push({ followUpId: followUp.id, status, severity: severityLevel });
      } catch (error) {
        this.logger.error(
          { err: error, followUpId: followUp.id, caseId: followUp.caseId },
          'Failed to dispatch moderation follow-up reminder'
        );
        await ModerationFollowUpModel.markCompleted(followUp.id, {
          status: 'cancelled',
          completedAt: now,
          metadata: {
            ...followUp.metadata,
            failure: error.message,
            trigger,
            status: 'cancelled',
            severity: severityLevel,
            severityToken,
            slaSeconds
          }
        });
        this.recordOutcome('cancelled', severityLevel, slaSeconds);
      }
    }

    await this.recordBacklog(this.nowProvider());

    return { processed: hydrated.length, dispatched };
  }
}

const moderationFollowUpJob = new ModerationFollowUpJob();

export default moderationFollowUpJob;
