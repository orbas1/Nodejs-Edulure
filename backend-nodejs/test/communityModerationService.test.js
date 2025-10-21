import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const dbFn = vi.fn();
  const builder = {
    select: vi.fn().mockReturnThis(),
    count: vi.fn().mockReturnThis(),
    modify: vi.fn().mockImplementation((callback) => {
      callback(builder);
      return builder;
    }),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockResolvedValue([{ status: 'pending', total: 2 }])
  };

  dbFn.mockImplementation(() => builder);
  dbFn.transaction = vi.fn();

  return {
    db: dbFn,
    builder,
    trx: {
      fn: {
        now: vi.fn(() => '2025-02-15T12:00:00.000Z')
      }
    },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    },
    memberModel: {
      findMembership: vi.fn()
    },
    postModel: {
      findById: vi.fn(),
      updateModerationState: vi.fn()
    },
    caseModel: {
      findOpenByPost: vi.fn(),
      create: vi.fn(),
      updateById: vi.fn(),
      findByPublicId: vi.fn(),
      list: vi.fn(),
      countOpenBySeverity: vi.fn(),
      resolutionStats: vi.fn()
    },
    actionModel: {
      record: vi.fn(),
      listForCase: vi.fn()
    },
    analyticsModel: {
      record: vi.fn(),
      summarise: vi.fn(),
      parseMetrics: vi.fn((payload) => payload)
    },
    scamReportModel: {
      create: vi.fn(),
      list: vi.fn()
    },
    domainEventModel: {
      record: vi.fn()
    }
  };
});

vi.mock('../src/config/database.js', () => ({
  default: mocks.db
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    child: () => mocks.logger
  }
}));

vi.mock('../src/models/CommunityMemberModel.js', () => ({
  default: mocks.memberModel
}));

vi.mock('../src/models/CommunityPostModel.js', () => ({
  default: mocks.postModel
}));

vi.mock('../src/models/CommunityPostModerationCaseModel.js', () => ({
  default: mocks.caseModel
}));

vi.mock('../src/models/CommunityPostModerationActionModel.js', () => ({
  default: mocks.actionModel
}));

vi.mock('../src/models/ModerationAnalyticsEventModel.js', () => ({
  default: mocks.analyticsModel
}));

vi.mock('../src/models/ScamReportModel.js', () => ({
  default: mocks.scamReportModel
}));

vi.mock('../src/models/DomainEventModel.js', () => ({
  default: mocks.domainEventModel
}));

const { db, builder, trx, memberModel, postModel, caseModel, actionModel, analyticsModel, domainEventModel } = mocks;

import CommunityModerationService from '../src/services/CommunityModerationService.js';

describe('CommunityModerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.transaction.mockImplementation(async (handler) => handler(trx));
    memberModel.findMembership.mockResolvedValue({ id: 44, role: 'moderator', status: 'active' });
    postModel.findById.mockResolvedValue({
      id: 301,
      communityId: 22,
      moderationMetadata: '{}',
      moderationState: 'clean',
      status: 'published'
    });
    postModel.updateModerationState.mockResolvedValue({
      id: 301,
      moderationState: 'pending',
      status: 'published'
    });
    analyticsModel.record.mockResolvedValue({
      id: 1,
      eventType: 'post_flagged',
      metrics: '{}'
    });
    analyticsModel.summarise.mockResolvedValue({
      events: [
        { eventType: 'post_flagged', total: 4, averageRisk: 42 }
      ],
      timeline: []
    });
    caseModel.countOpenBySeverity.mockResolvedValue({ low: 1, medium: 0, high: 0, critical: 0 });
    caseModel.resolutionStats.mockResolvedValue({ averageMinutes: 45, maxMinutes: 210 });
    builder.groupBy.mockResolvedValue([{ status: 'pending', total: 2 }]);
  });

  describe('flagPostForReview', () => {
    it('creates a new moderation case, records action, and emits analytics', async () => {
      caseModel.findOpenByPost.mockResolvedValue(null);
      caseModel.create.mockResolvedValue({
        id: 11,
        publicId: 'case-11',
        communityId: 22,
        postId: 301,
        status: 'pending',
        severity: 'low',
        metadata: {}
      });
      actionModel.record.mockResolvedValue({ id: 1 });

      const result = await CommunityModerationService.flagPostForReview({
        actor: { id: 9, role: 'moderator' },
        communityId: 22,
        payload: {
          postId: 301,
          reason: 'Suspected spam',
          riskScore: 38,
          evidence: [{ type: 'url', value: 'https://example.test' }],
          tags: ['spam']
        }
      });

      expect(caseModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: 22,
          postId: 301,
          severity: 'medium',
          riskScore: 38
        }),
        trx
      );
      expect(actionModel.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'flagged', caseId: 11 }),
        trx
      );
      expect(domainEventModel.record).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'community.post.flagged' }),
        trx
      );
      expect(analyticsModel.record).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'post_flagged', riskScore: 38 }),
        trx
      );
      expect(result.case.publicId).toBe('case-11');
      expect(result.post.moderationState).toBe('pending');
    });
  });

  describe('applyCaseAction', () => {
    it('rejects a case, archives the post, and records analytics', async () => {
      caseModel.findByPublicId.mockResolvedValue({
        id: 11,
        publicId: 'case-11',
        communityId: 22,
        postId: 301,
        status: 'pending',
        severity: 'medium',
        metadata: {}
      });
      caseModel.updateById.mockResolvedValue({
        id: 11,
        publicId: 'case-11',
        communityId: 22,
        postId: 301,
        status: 'rejected',
        severity: 'high'
      });
      actionModel.record.mockResolvedValue({ id: 2 });

      postModel.updateModerationState.mockResolvedValue({
        id: 301,
        moderationState: 'rejected',
        status: 'archived'
      });

      const result = await CommunityModerationService.applyCaseAction(
        'case-11',
        { id: 9, role: 'moderator' },
        { action: 'reject', notes: 'Spam confirmed', riskScore: 82 }
      );

      expect(caseModel.updateById).toHaveBeenCalledWith(
        11,
        expect.objectContaining({
          status: 'rejected',
          resolvedBy: 9,
          riskScore: 82
        }),
        trx
      );
      expect(postModel.updateModerationState).toHaveBeenCalledWith(
        301,
        expect.objectContaining({
          state: 'rejected',
          status: 'archived'
        }),
        trx
      );
      expect(domainEventModel.record).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'community.moderation.case.action',
          payload: expect.objectContaining({ status: 'rejected' })
        }),
        trx
      );
      expect(analyticsModel.record).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'case_reject', riskScore: 82 }),
        trx
      );
      expect(result.case.status).toBe('rejected');
      expect(result.post.status).toBe('archived');
    });
  });

  describe('getAnalyticsSummary', () => {
    it('aggregates moderation analytics and scam report statistics', async () => {
      const summary = await CommunityModerationService.getAnalyticsSummary(
        { id: 1, role: 'admin' },
        { communityId: 22 }
      );

      expect(analyticsModel.summarise).toHaveBeenCalledWith({ communityId: 22 }, db);
      expect(caseModel.countOpenBySeverity).toHaveBeenCalledWith({ communityId: 22 }, db);
      expect(builder.select).toHaveBeenCalledWith('status');
      expect(summary.openCases).toEqual({ low: 1, medium: 0, high: 0, critical: 0 });
      expect(summary.scamReports.pending).toBe(2);
    });
  });
});
