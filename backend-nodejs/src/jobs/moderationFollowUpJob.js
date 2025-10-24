import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import CommunityPostModerationActionModel from '../models/CommunityPostModerationActionModel.js';
import CommunityPostModerationCaseModel from '../models/CommunityPostModerationCaseModel.js';
import ModerationFollowUpModel from '../models/ModerationFollowUpModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import ModerationAnalyticsEventModel from '../models/ModerationAnalyticsEventModel.js';
import AuditEventService from '../services/AuditEventService.js';

function createLogger() {
  return logger.child({ module: 'moderation-follow-up-job' });
}

function ensureArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[\s,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [String(value)].filter(Boolean);
}

function ensurePositiveInteger(value, fallback) {
  const parsed = Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function computeOverdueMinutes(dueAt, now) {
  if (!dueAt) {
    return 0;
  }
  const dueDate = dueAt instanceof Date ? dueAt : new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) {
    return 0;
  }
  const diff = now.getTime() - dueDate.getTime();
  if (diff <= 0) {
    return 0;
  }
  return Math.round(diff / 60000);
}

const SEVERITY_RISK = new Map([
  ['low', 0.2],
  ['medium', 0.45],
  ['high', 0.7],
  ['critical', 0.9]
]);

function computeRiskScore(severity) {
  if (!severity) {
    return null;
  }
  const normalised = String(severity).toLowerCase();
  return SEVERITY_RISK.get(normalised) ?? 0.5;
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

export class ModerationFollowUpJob {
  constructor({
    enabled = env.moderation.followUps.enabled,
    schedule = env.moderation.followUps.cronExpression,
    timezone = env.moderation.followUps.timezone,
    batchSize = env.moderation.followUps.batchSize,
    scheduler = cron,
    nowProvider = () => new Date(),
    loggerInstance = createLogger(),
    escalationThresholdMinutes = env.moderation.followUps.escalateAfterMinutes,
    escalationRoles = env.moderation.followUps.escalationRoles,
    auditService = null,
    auditSeverity = env.moderation.followUps.auditSeverity ?? 'notice',
    analyticsModel = ModerationAnalyticsEventModel,
    analyticsEnabled = env.moderation.followUps.analyticsEnabled,
    domainEventModel = DomainEventModel
  } = {}) {
    this.enabled = Boolean(enabled);
    this.schedule = schedule;
    this.timezone = timezone;
    this.batchSize = batchSize;
    this.scheduler = scheduler;
    this.nowProvider = nowProvider;
    this.logger = loggerInstance;
    this.task = null;
    this.escalationThresholdMinutes = ensurePositiveInteger(escalationThresholdMinutes ?? 120, 120);
    this.escalationThresholdMs = this.escalationThresholdMinutes * 60 * 1000;
    this.escalationRoles = ensureArray(escalationRoles);
    this.auditService = auditService && typeof auditService.record === 'function' ? auditService : null;
    this.auditSeverity = auditSeverity;
    this.analyticsModel = analyticsModel;
    this.analyticsEnabled = analyticsEnabled !== false;
    this.domainEventModel =
      domainEventModel && typeof domainEventModel.record === 'function'
        ? domainEventModel
        : DomainEventModel;

    if (typeof this.batchSize !== 'number' || this.batchSize <= 0) {
      throw new Error('ModerationFollowUpJob requires a positive batch size.');
    }
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
    const dueFollowUps = await ModerationFollowUpModel.listDue({ now, limit: this.batchSize });
    if (!dueFollowUps.length) {
      this.logger.debug({ trigger }, 'No moderation follow-ups due');
      return { processed: 0, dispatched: [] };
    }

    const hydrated = await Promise.all(dueFollowUps.map((followUp) => hydrateFollowUp(followUp)));
    const dispatched = [];
    const escalatedSummaries = [];

    for (const entry of hydrated) {
      const { followUp, action, case: moderationCase } = entry;
      const overdueMinutes = computeOverdueMinutes(followUp.dueAt, now);
      const shouldEscalate = overdueMinutes * 60000 >= this.escalationThresholdMs && overdueMinutes > 0;
      const assignedTo = followUp.assignedTo ?? action?.actorId ?? null;
      try {
        await this.domainEventModel.record(
          {
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
              context: {
                followUpMetadata: followUp.metadata,
                actionMetadata: action?.metadata ?? null,
                caseStatus: moderationCase?.status ?? null,
                caseSeverity: moderationCase?.severity ?? null,
                overdueMinutes,
                escalationRoles: shouldEscalate ? this.escalationRoles : []
              }
            },
            performedBy: assignedTo
          },
          {
            dispatchMetadata: {
              tags: ['moderation', 'follow-up', shouldEscalate ? 'escalation-watch' : 'due'],
              audience: shouldEscalate ? this.escalationRoles : []
            }
          }
        );

        await this.recordAnalyticsEvent({
          followUp,
          moderationCase,
          action,
          overdueMinutes,
          eventType: 'moderation.follow_up.dispatched'
        });

        await ModerationFollowUpModel.markCompleted(followUp.id, {
          status: 'completed',
          completedAt: now,
          metadata: {
            ...followUp.metadata,
            dispatchedAt: now,
            trigger,
            overdueMinutes,
            escalated: shouldEscalate,
            escalationRoles: shouldEscalate ? this.escalationRoles : undefined
          }
        });

        if (shouldEscalate) {
          await this.handleEscalation({
            followUp,
            moderationCase,
            action,
            now,
            overdueMinutes,
            trigger,
            assignedTo
          });
          escalatedSummaries.push({ followUpId: followUp.id, overdueMinutes });
        }

        dispatched.push({ followUpId: followUp.id, status: 'sent', escalated: shouldEscalate, overdueMinutes });
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
            overdueMinutes,
            escalated: false
          }
        });
      }
    }

    this.logger.info(
      {
        trigger,
        processed: hydrated.length,
        escalated: escalatedSummaries.length,
        overdueFollowUps: dispatched.filter((entry) => entry.overdueMinutes > 0).length
      },
      'Moderation follow-up cycle completed'
    );

    return { processed: hydrated.length, dispatched, escalated: escalatedSummaries };
  }

  async handleEscalation({ followUp, moderationCase, action, now, overdueMinutes, trigger, assignedTo }) {
    await this.domainEventModel.record(
      {
        entityType: 'community_post',
        entityId: moderationCase?.postId ?? null,
        eventType: 'community.moderation.follow_up.escalated',
        payload: {
          followUpId: followUp.id,
          caseId: moderationCase?.publicId ?? followUp.caseId,
          communityId: moderationCase?.communityId ?? null,
          assignedTo,
          overdueMinutes,
          escalationRoles: this.escalationRoles,
          escalatedAt: now,
          context: {
            caseStatus: moderationCase?.status ?? null,
            caseSeverity: moderationCase?.severity ?? null,
            followUpMetadata: followUp.metadata
          }
        },
        performedBy: assignedTo
      },
      {
        dispatchMetadata: {
          tags: ['moderation', 'follow-up', 'escalated'],
          audience: this.escalationRoles
        }
      }
    );

    await this.recordAnalyticsEvent({
      followUp,
      moderationCase,
      action,
      overdueMinutes,
      eventType: 'moderation.follow_up.escalated'
    });

    if (this.auditService) {
      await this.auditService.record({
        eventType: 'moderation.follow_up.escalated',
        entityType: 'community.moderation.case',
        entityId: moderationCase?.publicId ?? String(followUp.caseId),
        severity: this.auditSeverity,
        metadata: {
          followUpId: followUp.id,
          overdueMinutes,
          assignedTo,
          escalationRoles: this.escalationRoles,
          trigger
        }
      });
    }
  }

  async recordAnalyticsEvent({ followUp, moderationCase, action, overdueMinutes, eventType }) {
    if (!this.analyticsEnabled || !this.analyticsModel || typeof this.analyticsModel.record !== 'function') {
      return;
    }

    try {
      await this.analyticsModel.record({
        communityId: moderationCase?.communityId ?? null,
        entityType: 'community.moderation.case',
        entityId: moderationCase?.publicId ?? followUp.caseId,
        eventType,
        riskScore: computeRiskScore(moderationCase?.severity),
        metrics: {
          followUpId: followUp.id,
          overdueMinutes,
          assignedTo: followUp.assignedTo ?? action?.actorId ?? null
        }
      });
    } catch (error) {
      this.logger.warn(
        { err: error, followUpId: followUp.id, eventType },
        'Failed to record moderation analytics event'
      );
    }
  }
}

const moderationFollowUpJob = new ModerationFollowUpJob({
  auditService: new AuditEventService({
    loggerInstance: logger.child({ module: 'moderation-follow-up-audit' })
  }),
  analyticsModel: ModerationAnalyticsEventModel,
  domainEventModel: DomainEventModel
});

export default moderationFollowUpJob;
