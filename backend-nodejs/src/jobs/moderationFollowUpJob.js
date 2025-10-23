import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import CommunityPostModerationActionModel from '../models/CommunityPostModerationActionModel.js';
import CommunityPostModerationCaseModel from '../models/CommunityPostModerationCaseModel.js';
import ModerationFollowUpModel from '../models/ModerationFollowUpModel.js';
import DomainEventModel from '../models/DomainEventModel.js';

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

export class ModerationFollowUpJob {
  constructor({
    enabled = env.moderation.followUps.enabled,
    schedule = env.moderation.followUps.cronExpression,
    timezone = env.moderation.followUps.timezone,
    batchSize = env.moderation.followUps.batchSize,
    scheduler = cron,
    nowProvider = () => new Date(),
    loggerInstance = createLogger()
  } = {}) {
    this.enabled = Boolean(enabled);
    this.schedule = schedule;
    this.timezone = timezone;
    this.batchSize = batchSize;
    this.scheduler = scheduler;
    this.nowProvider = nowProvider;
    this.logger = loggerInstance;
    this.task = null;

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

    for (const entry of hydrated) {
      const { followUp, action, case: moderationCase } = entry;
      try {
        await DomainEventModel.record({
          entityType: 'community_post',
          entityId: moderationCase?.postId ?? null,
          eventType: 'community.moderation.follow_up.due',
          payload: {
            followUpId: followUp.id,
            caseId: moderationCase?.publicId ?? followUp.caseId,
            actionId: followUp.actionId ?? null,
            communityId: moderationCase?.communityId ?? null,
            assignedTo: followUp.assignedTo ?? action?.actorId ?? null,
            dueAt: followUp.dueAt,
            context: {
              followUpMetadata: followUp.metadata,
              actionMetadata: action?.metadata ?? null,
              caseStatus: moderationCase?.status ?? null,
              caseSeverity: moderationCase?.severity ?? null
            }
          },
          performedBy: followUp.assignedTo ?? action?.actorId ?? null
        });

        await ModerationFollowUpModel.markCompleted(followUp.id, {
          status: 'completed',
          completedAt: now,
          metadata: {
            ...followUp.metadata,
            dispatchedAt: now,
            trigger
          }
        });

        dispatched.push({ followUpId: followUp.id, status: 'sent' });
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
            trigger
          }
        });
      }
    }

    return { processed: hydrated.length, dispatched };
  }
}

const moderationFollowUpJob = new ModerationFollowUpJob();

export default moderationFollowUpJob;
