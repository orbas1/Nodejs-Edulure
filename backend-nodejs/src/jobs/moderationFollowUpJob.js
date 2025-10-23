import cron from 'node-cron';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import CommunityPostModerationCaseModel from '../models/CommunityPostModerationCaseModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import ModerationFollowUpModel from '../models/ModerationFollowUpModel.js';

function createLogger() {
  return logger.child({ module: 'moderation-follow-up-job' });
}

async function processFollowUp(followUp, log) {
  const moderationCase = await CommunityPostModerationCaseModel.findByInternalId(followUp.caseId);
  if (!moderationCase || ['approved', 'rejected', 'suppressed'].includes(moderationCase.status)) {
    await ModerationFollowUpModel.markOutcome(followUp.id, {
      status: 'skipped',
      processedAt: new Date(),
      metadata: {
        reason: 'case_closed'
      }
    });
    log.info({ followUpId: followUp.id, caseId: followUp.caseId }, 'Skipping follow-up for closed case');
    return { followUpId: followUp.id, status: 'skipped' };
  }

  await DomainEventModel.record({
    entityType: 'community_post',
    entityId: moderationCase.postId,
    eventType: 'community.moderation.follow_up.due',
    payload: {
      caseId: moderationCase.publicId,
      communityId: moderationCase.communityId,
      remindAt: followUp.remindAt,
      reason: followUp.reason ?? null,
      metadata: followUp.metadata ?? {}
    },
    performedBy: null
  });

  await ModerationFollowUpModel.markOutcome(followUp.id, {
    status: 'notified',
    processedAt: new Date(),
    metadata: {
      lastNotificationAt: new Date().toISOString()
    }
  });

  log.info({ followUpId: followUp.id, caseId: followUp.caseId }, 'Moderation follow-up triggered');
  return { followUpId: followUp.id, status: 'notified' };
}

export class ModerationFollowUpJob {
  constructor({ schedule = '*/5 * * * *', lookaheadMinutes = 5, batchSize = 25 } = {}) {
    this.schedule = schedule;
    this.lookaheadMinutes = lookaheadMinutes;
    this.batchSize = batchSize;
    this.task = null;
    this.logger = createLogger();
  }

  start() {
    if (this.task || env.JOBS_ENABLED === false) {
      return;
    }
    this.logger.info({ schedule: this.schedule }, 'Starting moderation follow-up job');
    this.task = cron.schedule(this.schedule, () => {
      this.run().catch((error) => {
        this.logger.error({ err: error }, 'Moderation follow-up run failed');
      });
    });
  }

  stop() {
    if (this.task) {
      this.logger.info('Stopping moderation follow-up job');
      this.task.stop();
      this.task = null;
    }
  }

  async run() {
    const followUps = await ModerationFollowUpModel.listDue(
      { lookaheadMinutes: this.lookaheadMinutes, limit: this.batchSize }
    );
    if (!followUps.length) {
      return;
    }

    await ModerationFollowUpModel.markProcessing(followUps.map((item) => item.id));

    for (const followUp of followUps) {
      try {
        await processFollowUp(followUp, this.logger);
      } catch (error) {
        this.logger.error({ err: error, followUpId: followUp.id }, 'Failed to process follow-up');
        await ModerationFollowUpModel.markOutcome(followUp.id, {
          status: 'failed',
          processedAt: new Date(),
          metadata: { error: error.message }
        });
      }
    }
  }
}

export function createModerationFollowUpJob(options = {}) {
  return new ModerationFollowUpJob(options);
}

const moderationFollowUpJob = createModerationFollowUpJob();

export default moderationFollowUpJob;
