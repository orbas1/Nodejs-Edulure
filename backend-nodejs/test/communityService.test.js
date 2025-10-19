import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommunityService from '../src/services/CommunityService.js';

const transactionSpy = vi.hoisted(() => vi.fn(async (handler) => handler({})));

const communityModelMock = vi.hoisted(() => ({
  listByUserWithStats: vi.fn(),
  findById: vi.fn(),
  findBySlug: vi.fn(),
  create: vi.fn(),
  getStats: vi.fn(),
  updateMetadata: vi.fn()
}));

const communityMemberModelMock = vi.hoisted(() => ({
  create: vi.fn(),
  findMembership: vi.fn(),
  updateStatus: vi.fn(),
  markLeft: vi.fn()
}));

const communityChannelModelMock = vi.hoisted(() => ({
  create: vi.fn(),
  findDefault: vi.fn(),
  listByCommunity: vi.fn()
}));

const communityPostModelMock = vi.hoisted(() => ({
  create: vi.fn(),
  paginateForCommunity: vi.fn(),
  paginateForUser: vi.fn(),
  findById: vi.fn(),
  updateModerationState: vi.fn(),
  archive: vi.fn()
}));

const communityResourceModelMock = vi.hoisted(() => ({
  create: vi.fn(),
  listForCommunity: vi.fn()
}));

const domainEventModelMock = vi.hoisted(() => ({
  record: vi.fn()
}));

const adsPlacementServiceMock = vi.hoisted(() => ({
  decorateFeed: vi.fn(async ({ posts }) => ({
    items: posts.map((post) => ({ kind: 'post', post })),
    ads: { count: 0, placements: [] }
  }))
}));

vi.mock('../src/config/database.js', () => ({
  default: {
    transaction: transactionSpy
  }
}));

vi.mock('../src/models/CommunityModel.js', () => ({
  default: communityModelMock
}));
vi.mock('../src/models/CommunityMemberModel.js', () => ({
  default: communityMemberModelMock
}));
vi.mock('../src/models/CommunityChannelModel.js', () => ({
  default: communityChannelModelMock
}));
vi.mock('../src/models/CommunityPostModel.js', () => ({
  default: communityPostModelMock
}));
vi.mock('../src/models/CommunityResourceModel.js', () => ({
  default: communityResourceModelMock
}));
vi.mock('../src/models/DomainEventModel.js', () => ({
  default: domainEventModelMock
}));
vi.mock('../src/services/AdsPlacementService.js', () => ({
  default: adsPlacementServiceMock
}));

const baseCommunity = {
  id: 42,
  name: 'Automation Guild',
  slug: 'automation-guild',
  description: 'Ops leaders sharing rituals',
  coverImageUrl: null,
  visibility: 'private',
  ownerId: 9,
  metadata: JSON.stringify({ timezone: 'UTC' }),
  createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
  updatedAt: new Date('2024-01-07T00:00:00Z').toISOString()
};

const resetMocks = () => {
  transactionSpy.mockClear();
  [
    communityModelMock,
    communityMemberModelMock,
    communityChannelModelMock,
    communityPostModelMock,
    communityResourceModelMock,
    domainEventModelMock,
    adsPlacementServiceMock
  ].forEach((model) => {
    Object.values(model).forEach((fn) => fn.mockReset());
  });
};

describe('CommunityService', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('serialises community summaries with stats and metadata', async () => {
    communityModelMock.listByUserWithStats.mockResolvedValue([
      {
        ...baseCommunity,
        memberRole: 'admin',
        memberStatus: 'active',
        memberCount: 12,
        resourceCount: 5,
        postCount: 18,
        channelCount: 3,
        lastActivityAt: new Date('2024-01-06T00:00:00Z').toISOString()
      }
    ]);

    const response = await CommunityService.listForUser(7);

    expect(communityModelMock.listByUserWithStats).toHaveBeenCalledWith(7);
    expect(response).toEqual([
      expect.objectContaining({
        id: 42,
        metadata: { timezone: 'UTC' },
        stats: {
          members: 12,
          resources: 5,
          posts: 18,
          channels: 3,
          lastActivityAt: expect.any(String)
        },
        membership: { role: 'admin', status: 'active' }
      })
    ]);
  });

  it('returns community detail with channels when user is a member', async () => {
    communityModelMock.findById.mockResolvedValue(baseCommunity);
    communityMemberModelMock.findMembership.mockResolvedValue({ role: 'moderator', status: 'active' });
    communityModelMock.getStats.mockResolvedValue({
      memberCount: 10,
      resourceCount: 4,
      postCount: 21,
      channelCount: 2,
      lastActivityAt: new Date('2024-01-05T00:00:00Z').toISOString()
    });
    communityChannelModelMock.listByCommunity.mockResolvedValue([
      {
        id: 11,
        name: 'Launch Desk',
        slug: 'launch-desk',
        channelType: 'general',
        description: 'Daily standups',
        isDefault: true,
        metadata: JSON.stringify({ cadence: 'daily' }),
        createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
        updatedAt: new Date('2024-01-02T00:00:00Z').toISOString()
      }
    ]);

    const detail = await CommunityService.getCommunityDetail('42', 7);

    expect(detail).toEqual(
      expect.objectContaining({
        id: 42,
        stats: expect.objectContaining({ members: 10, resources: 4 }),
        channels: [
          expect.objectContaining({
            id: 11,
            name: 'Launch Desk',
            metadata: { cadence: 'daily' }
          })
        ]
      })
    );
  });

  it('throws when creating a post without moderator role', async () => {
    communityModelMock.findById.mockResolvedValue({ ...baseCommunity, visibility: 'private' });
    communityMemberModelMock.findMembership.mockResolvedValue({ role: 'member', status: 'active' });

    await expect(
      CommunityService.createPost('42', 7, { body: 'Upgrade retention job', tags: [] })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('creates a post and records domain events for moderators', async () => {
    communityModelMock.findById.mockResolvedValue({ ...baseCommunity, visibility: 'public' });
    communityMemberModelMock.findMembership.mockResolvedValue({ role: 'admin', status: 'active' });
    communityChannelModelMock.findDefault.mockResolvedValue({ id: 77 });
    communityPostModelMock.create.mockResolvedValue({
      id: 99,
      communityId: baseCommunity.id,
      channelId: 77,
      authorId: 7,
      postType: 'update',
      title: 'Roadmap Drop',
      body: 'New classroom QA guardrails shipping.',
      tags: JSON.stringify(['Roadmap']),
      visibility: 'members',
      status: 'published',
      publishedAt: new Date('2024-01-03T00:00:00Z').toISOString(),
      scheduledAt: null,
      commentCount: 0,
      reactionSummary: JSON.stringify({ total: 12 }),
      metadata: JSON.stringify({ relatedResource: 'ops-blueprint' }),
      createdAt: new Date('2024-01-03T00:00:00Z').toISOString(),
      updatedAt: new Date('2024-01-03T00:00:00Z').toISOString()
    });
    communityModelMock.listByUserWithStats.mockResolvedValue([]);

    const post = await CommunityService.createPost('42', 7, {
      postType: 'update',
      body: 'New classroom QA guardrails shipping.',
      tags: ['Roadmap']
    });

    expect(transactionSpy).toHaveBeenCalled();
    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'community_post',
        eventType: 'community.post.created'
      }),
      expect.any(Object)
    );
    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.post.published' }),
      expect.any(Object)
    );
    expect(post).toEqual(
      expect.objectContaining({
        id: 99,
        tags: ['Roadmap'],
        stats: expect.objectContaining({ reactions: 12 })
      })
    );
  });

  it('marks membership as left when leaving a community', async () => {
    communityModelMock.findById.mockResolvedValue(baseCommunity);
    communityMemberModelMock.findMembership.mockResolvedValue({ role: 'member', status: 'active' });

    const summary = await CommunityService.leaveCommunity('42', 7);

    expect(communityMemberModelMock.markLeft).toHaveBeenCalledWith(baseCommunity.id, 7, expect.any(Object));
    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'community_member',
        eventType: 'community.member.left'
      }),
      expect.any(Object)
    );
    expect(summary).toEqual(expect.objectContaining({ id: baseCommunity.id, membership: undefined }));
  });

  it('suppresses a post through moderation workflow', async () => {
    communityModelMock.findById.mockResolvedValue(baseCommunity);
    communityMemberModelMock.findMembership.mockResolvedValue({ role: 'moderator', status: 'active' });
    communityPostModelMock.findById.mockResolvedValue({
      id: 111,
      communityId: baseCommunity.id,
      moderationMetadata: JSON.stringify({ notes: [] }),
      moderationState: 'clean',
      status: 'published'
    });
    communityPostModelMock.updateModerationState.mockResolvedValue({
      id: 111,
      communityId: baseCommunity.id,
      moderationMetadata: JSON.stringify({ notes: [{ by: 7, reason: 'off-topic', at: '2024-01-02' }] }),
      moderationState: 'suppressed',
      status: 'archived'
    });

    const response = await CommunityService.moderatePost('42', 111, 7, { action: 'suppress', reason: 'off-topic' });

    expect(communityPostModelMock.updateModerationState).toHaveBeenCalledWith(
      111,
      expect.objectContaining({ state: 'suppressed', status: 'archived' }),
      expect.any(Object)
    );
    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.post.suppress' }),
      expect.any(Object)
    );
    expect(response).toEqual(expect.objectContaining({ id: 111, moderation: expect.objectContaining({ state: 'suppressed' }) }));
  });

  it('archives a post when removing it', async () => {
    communityModelMock.findById.mockResolvedValue(baseCommunity);
    communityMemberModelMock.findMembership.mockResolvedValue({ role: 'admin', status: 'active' });
    communityPostModelMock.findById.mockResolvedValue({
      id: 222,
      communityId: baseCommunity.id,
      metadata: JSON.stringify({})
    });
    communityPostModelMock.archive.mockResolvedValue({
      id: 222,
      communityId: baseCommunity.id,
      status: 'archived',
      metadata: JSON.stringify({ removalHistory: [] })
    });

    const response = await CommunityService.removePost('42', 222, 8, { reason: 'spam' });

    expect(communityPostModelMock.archive).toHaveBeenCalledWith(
      222,
      expect.objectContaining({ metadata: expect.any(Object) }),
      expect.any(Object)
    );
    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.post.archived' }),
      expect.any(Object)
    );
    expect(response).toEqual(expect.objectContaining({ id: 222, status: 'archived' }));
  });

  it('updates sponsorship placement preferences', async () => {
    communityModelMock.findById.mockResolvedValue({
      ...baseCommunity,
      metadata: JSON.stringify({ sponsorships: { blockedPlacementIds: ['pl_old'] } })
    });
    communityMemberModelMock.findMembership.mockResolvedValue({ role: 'admin', status: 'active' });
    communityModelMock.updateMetadata.mockResolvedValue({ ...baseCommunity, metadata: JSON.stringify({}) });

    const result = await CommunityService.updateSponsorshipPlacements(
      '42',
      7,
      { blockedPlacementIds: ['pl_new'] }
    );

    expect(communityModelMock.updateMetadata).toHaveBeenCalledWith(
      baseCommunity.id,
      expect.objectContaining({ sponsorships: expect.objectContaining({ blockedPlacementIds: ['pl_new'] }) }),
      expect.any(Object)
    );
    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.sponsorships.updated' }),
      expect.any(Object)
    );
    expect(result).toEqual({ communityId: baseCommunity.id, blockedPlacementIds: ['pl_new'] });
  });
});
