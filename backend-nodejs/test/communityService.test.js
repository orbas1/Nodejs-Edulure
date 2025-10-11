import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommunityService from '../src/services/CommunityService.js';

const transactionSpy = vi.fn(async (handler) => handler({}));

vi.mock('../src/config/database.js', () => ({
  default: {
    transaction: transactionSpy
  }
}));

const communityModelMock = {
  listByUserWithStats: vi.fn(),
  findById: vi.fn(),
  findBySlug: vi.fn(),
  create: vi.fn(),
  getStats: vi.fn()
};

const communityMemberModelMock = {
  create: vi.fn(),
  findMembership: vi.fn()
};

const communityChannelModelMock = {
  create: vi.fn(),
  findDefault: vi.fn(),
  listByCommunity: vi.fn()
};

const communityPostModelMock = {
  create: vi.fn(),
  paginateForCommunity: vi.fn(),
  paginateForUser: vi.fn()
};

const communityResourceModelMock = {
  create: vi.fn(),
  listForCommunity: vi.fn()
};

const domainEventModelMock = {
  record: vi.fn()
};

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
  Object.values({
    ...communityModelMock,
    ...communityMemberModelMock,
    ...communityChannelModelMock,
    ...communityPostModelMock,
    ...communityResourceModelMock,
    ...domainEventModelMock
  }).forEach((mock) => mock.mockReset());
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
});
