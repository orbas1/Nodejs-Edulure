import { beforeEach, describe, expect, it, vi } from 'vitest';

import SocialGraphService from '../src/services/SocialGraphService.js';

const trxStub = { fn: { now: () => new Date() } };

const transactionSpy = vi.hoisted(() => vi.fn(async (handler) => handler(trxStub)));

const userModelMock = vi.hoisted(() => ({ findById: vi.fn() }));
const privacyModelMock = vi.hoisted(() => ({ getForUser: vi.fn(), upsert: vi.fn() }));
const followModelMock = vi.hoisted(() => ({
  findRelationship: vi.fn(),
  upsertRelationship: vi.fn(),
  updateStatus: vi.fn(),
  deleteRelationship: vi.fn(),
  removeBetween: vi.fn(),
  isFollowing: vi.fn(),
  countFollowers: vi.fn(),
  listFollowers: vi.fn(),
  listFollowing: vi.fn(),
  findMutualCandidates: vi.fn()
}));
const blockModelMock = vi.hoisted(() => ({ isBlocked: vi.fn(), block: vi.fn(), unblock: vi.fn(), listBlockedIds: vi.fn() }));
const muteModelMock = vi.hoisted(() => ({ mute: vi.fn(), unmute: vi.fn() }));
const recommendationModelMock = vi.hoisted(() => ({
  listForUser: vi.fn(),
  upsert: vi.fn(),
  markConsumed: vi.fn(),
  delete: vi.fn()
}));
const auditModelMock = vi.hoisted(() => ({ record: vi.fn() }));
const domainEventModelMock = vi.hoisted(() => ({ record: vi.fn() }));

const loggerMock = vi.hoisted(() => {
  const base = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn()
  };
  base.child.mockReturnValue(base);
  return base;
});

vi.mock('../src/config/database.js', () => ({
  default: {
    transaction: transactionSpy
  }
}));

vi.mock('../src/config/logger.js', () => ({
  default: loggerMock
}));

vi.mock('../src/models/UserModel.js', () => ({
  default: userModelMock
}));
vi.mock('../src/models/UserPrivacySettingModel.js', () => ({
  default: privacyModelMock
}));
vi.mock('../src/models/UserFollowModel.js', () => ({
  default: followModelMock
}));
vi.mock('../src/models/UserBlockModel.js', () => ({
  default: blockModelMock
}));
vi.mock('../src/models/UserMuteModel.js', () => ({
  default: muteModelMock
}));
vi.mock('../src/models/FollowRecommendationModel.js', () => ({
  default: recommendationModelMock
}));
vi.mock('../src/models/SocialAuditLogModel.js', () => ({
  default: auditModelMock
}));
vi.mock('../src/models/DomainEventModel.js', () => ({
  default: domainEventModelMock
}));

const resetMocks = () => {
  transactionSpy.mockClear();
  Object.values(loggerMock).forEach((fn) => fn.mockClear?.());
  [
    userModelMock,
    privacyModelMock,
    followModelMock,
    blockModelMock,
    muteModelMock,
    recommendationModelMock,
    auditModelMock,
    domainEventModelMock
  ].forEach((mock) => {
    Object.values(mock).forEach((fn) => fn.mockReset());
  });
};

describe('SocialGraphService', () => {
  beforeEach(() => {
    resetMocks();
    userModelMock.findById.mockResolvedValue({ id: 99, firstName: 'Target' });
    blockModelMock.isBlocked.mockResolvedValue(false);
    privacyModelMock.getForUser.mockResolvedValue({
      profileVisibility: 'public',
      followApprovalRequired: false
    });
    recommendationModelMock.listForUser.mockResolvedValue([]);
    followModelMock.findMutualCandidates.mockResolvedValue([]);
  });

  it('follows a user immediately when approvals are not required', async () => {
    followModelMock.findRelationship.mockResolvedValue(null);
    followModelMock.upsertRelationship.mockResolvedValue({
      followerId: 10,
      followingId: 99,
      status: 'accepted'
    });
    followModelMock.countFollowers.mockResolvedValue(3);

    const result = await SocialGraphService.followUser(10, 99, { source: 'test' });

    expect(result.status).toBe('accepted');
    expect(followModelMock.upsertRelationship).toHaveBeenCalledWith(
      10,
      99,
      expect.objectContaining({ status: 'accepted' }),
      expect.any(Object)
    );
    expect(auditModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'follow.accepted' }),
      expect.any(Object)
    );
    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'social.follow.accepted' }),
      expect.any(Object)
    );
    expect(recommendationModelMock.upsert).toHaveBeenCalled();
  });

  it('creates a pending request when approvals are required', async () => {
    privacyModelMock.getForUser.mockResolvedValue({
      profileVisibility: 'private',
      followApprovalRequired: true
    });
    followModelMock.findRelationship.mockResolvedValue(null);
    followModelMock.upsertRelationship.mockResolvedValue({
      followerId: 20,
      followingId: 99,
      status: 'pending'
    });

    const result = await SocialGraphService.followUser(20, 99, {});

    expect(result.status).toBe('pending');
    expect(recommendationModelMock.upsert).not.toHaveBeenCalled();
  });

  it('approves pending requests and records events', async () => {
    followModelMock.findRelationship.mockResolvedValue({
      followerId: 30,
      followingId: 12,
      status: 'pending'
    });
    followModelMock.updateStatus.mockResolvedValue({ status: 'accepted' });
    followModelMock.countFollowers.mockResolvedValue(5);

    const result = await SocialGraphService.approveFollow(12, 30, 12);

    expect(result.status).toBe('accepted');
    expect(followModelMock.updateStatus).toHaveBeenCalledWith(
      30,
      12,
      'accepted',
      expect.any(Object),
      expect.any(Object)
    );
    expect(auditModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'follow.approved' }),
      expect.any(Object)
    );
    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'social.follow.approved' }),
      expect.any(Object)
    );
  });

  it('lists followers when viewer satisfies privacy requirements', async () => {
    privacyModelMock.getForUser.mockResolvedValue({
      profileVisibility: 'followers',
      followApprovalRequired: true
    });
    followModelMock.isFollowing
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    followModelMock.listFollowers.mockResolvedValue({
      items: [
        {
          relationship: { followerId: 50, status: 'accepted' },
          user: { id: 50, firstName: 'Casey', mutualFollowers: 2 }
        }
      ],
      total: 1
    });

    const result = await SocialGraphService.listFollowers(12, 50, { limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(result.viewerContext.viewerFollowsSubject).toBe(true);
  });

  it('blocks a user and removes relationships', async () => {
    userModelMock.findById.mockResolvedValue({ id: 77 });
    blockModelMock.block.mockResolvedValue({ userId: 1, blockedUserId: 77 });

    await SocialGraphService.blockUser(1, 77, { reason: 'spam' });

    expect(blockModelMock.block).toHaveBeenCalledWith(
      1,
      77,
      expect.objectContaining({ reason: 'spam' }),
      expect.any(Object)
    );
    expect(followModelMock.removeBetween).toHaveBeenCalledWith(1, 77, expect.any(Object));
    expect(muteModelMock.unmute).toHaveBeenCalled();
    expect(auditModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'block.applied' }),
      expect.any(Object)
    );
    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'social.block.applied' }),
      expect.any(Object)
    );
  });
});
