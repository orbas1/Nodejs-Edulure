import { beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env.js';
import CommunityChatService from '../src/services/CommunityChatService.js';

const transactionSpy = vi.hoisted(() => vi.fn(async (handler) => handler({ fn: { now: () => new Date() } })));

const communityModelMock = vi.hoisted(() => ({
  findById: vi.fn()
}));

const communityMemberModelMock = vi.hoisted(() => ({
  findMembership: vi.fn(),
  updateLastRead: vi.fn()
}));

const communityChannelModelMock = vi.hoisted(() => ({
  listByCommunity: vi.fn(),
  findById: vi.fn()
}));

const communityChannelMemberModelMock = vi.hoisted(() => ({
  ensureMembership: vi.fn(),
  updateLastRead: vi.fn()
}));

const communityMessageModelMock = vi.hoisted(() => ({
  latestForChannels: vi.fn(),
  countSince: vi.fn(),
  listForChannel: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  updateStatus: vi.fn(),
  markDeleted: vi.fn()
}));

const communityMessageReactionModelMock = vi.hoisted(() => ({
  listForMessages: vi.fn(),
  listUserReactions: vi.fn(),
  addReaction: vi.fn(),
  removeReaction: vi.fn()
}));

const communityMessageModerationModelMock = vi.hoisted(() => ({
  record: vi.fn()
}));

const domainEventModelMock = vi.hoisted(() => ({
  record: vi.fn()
}));

const userPresenceSessionModelMock = vi.hoisted(() => ({
  listActiveForCommunity: vi.fn(),
  upsert: vi.fn()
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
vi.mock('../src/models/CommunityChannelMemberModel.js', () => ({
  default: communityChannelMemberModelMock
}));
vi.mock('../src/models/CommunityMessageModel.js', () => ({
  default: communityMessageModelMock
}));
vi.mock('../src/models/CommunityMessageReactionModel.js', () => ({
  default: communityMessageReactionModelMock
}));
vi.mock('../src/models/CommunityMessageModerationModel.js', () => ({
  default: communityMessageModerationModelMock
}));
vi.mock('../src/models/DomainEventModel.js', () => ({
  default: domainEventModelMock
}));
vi.mock('../src/models/UserPresenceSessionModel.js', () => ({
  default: userPresenceSessionModelMock
}));

const baseCommunity = {
  id: 7,
  name: 'Launch Ops Guild',
  visibility: 'public',
  metadata: JSON.stringify({ timezone: 'UTC' })
};

const resetMocks = () => {
  transactionSpy.mockClear();
  [
    communityModelMock,
    communityMemberModelMock,
    communityChannelModelMock,
    communityChannelMemberModelMock,
    communityMessageModelMock,
    communityMessageReactionModelMock,
    communityMessageModerationModelMock,
    domainEventModelMock,
    userPresenceSessionModelMock
  ].forEach((mock) => {
    Object.values(mock).forEach((fn) => fn.mockReset());
  });
};

describe('CommunityChatService', () => {
  beforeEach(() => {
    resetMocks();
    communityModelMock.findById.mockResolvedValue(baseCommunity);
    communityMemberModelMock.findMembership.mockResolvedValue({ role: 'admin', status: 'active' });
    communityChannelMemberModelMock.ensureMembership.mockResolvedValue({
      channelId: 33,
      userId: 99,
      lastReadAt: null
    });
  });

  it('lists channels with membership and unread counts', async () => {
    communityChannelModelMock.listByCommunity.mockResolvedValue([
      {
        id: 33,
        communityId: baseCommunity.id,
        name: 'Launch Desk',
        slug: 'launch-desk',
        channelType: 'general',
        description: 'Daily ops standup',
        isDefault: 1,
        metadata: JSON.stringify({ cadence: 'daily' })
      }
    ]);
    communityMessageModelMock.latestForChannels.mockResolvedValue([
      {
        channelId: 33,
        message: {
          id: 501,
          body: 'Checklist complete',
          createdAt: new Date().toISOString(),
          authorId: 12
        }
      }
    ]);
    communityMessageModelMock.countSince.mockResolvedValue(4);

    const channels = await CommunityChatService.listChannels(baseCommunity.id, 99);

    expect(communityChannelModelMock.listByCommunity).toHaveBeenCalledWith(baseCommunity.id);
    expect(channels).toEqual([
      expect.objectContaining({
        channel: expect.objectContaining({ slug: 'launch-desk', metadata: { cadence: 'daily' } }),
        membership: expect.objectContaining({ userId: 99 }),
        unreadCount: 4
      })
    ]);
  });

  it('threads replies under the original message', async () => {
    communityChannelModelMock.findById.mockResolvedValue({
      id: 33,
      communityId: baseCommunity.id,
      name: 'Launch Desk',
      slug: 'launch-desk',
      channelType: 'general',
      metadata: JSON.stringify({})
    });

    const parentMessage = {
      id: 88,
      communityId: baseCommunity.id,
      channelId: 33,
      authorId: 12,
      messageType: 'text',
      body: 'Daily status?',
      threadRootId: null
    };

    communityMessageModelMock.findById.mockResolvedValueOnce(parentMessage);
    communityMessageModelMock.create.mockResolvedValue({
      id: 99,
      threadRootId: 88,
      replyToMessageId: 88,
      body: 'All systems nominal.'
    });

    const message = await CommunityChatService.postMessage(
      baseCommunity.id,
      33,
      99,
      { body: 'All systems nominal.', replyToMessageId: 88, attachments: [] }
    );

    expect(communityMessageModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        threadRootId: 88,
        replyToMessageId: 88
      }),
      expect.any(Object)
    );
    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.message.created' }),
      expect.any(Object)
    );
    expect(message).toEqual(expect.objectContaining({ id: 99, threadRootId: 88 }));
  });

  it('normalises chat pagination according to configuration defaults', async () => {
    communityChannelModelMock.findById.mockResolvedValue({
      id: 33,
      communityId: baseCommunity.id,
      name: 'Launch Desk',
      slug: 'launch-desk',
      channelType: 'general',
      metadata: JSON.stringify({})
    });
    communityMessageModelMock.listForChannel.mockResolvedValue([
      { id: 501, communityId: baseCommunity.id, channelId: 33, authorId: 12, messageType: 'text', body: 'Ready' }
    ]);
    communityMessageReactionModelMock.listForMessages.mockResolvedValue({});
    communityMessageReactionModelMock.listUserReactions.mockResolvedValue({});

    const messages = await CommunityChatService.listMessages(baseCommunity.id, 33, 99, { limit: 999 });

    expect(communityMessageModelMock.listForChannel).toHaveBeenCalledWith(
      baseCommunity.id,
      33,
      expect.objectContaining({ limit: env.chat.pagination.maxPageSize })
    );
    expect(messages).toEqual([
      expect.objectContaining({ id: 501, reactions: [], viewerReactions: [] })
    ]);
  });

  it('clamps presence TTL to the configured ceiling', async () => {
    vi.useFakeTimers();
    const now = new Date();
    vi.setSystemTime(now);
    userPresenceSessionModelMock.upsert.mockImplementation(async (payload) => payload);

    const session = await CommunityChatService.updatePresence(99, 'session-1', {
      ttlMinutes: env.chat.presence.maxTtlMinutes * 5,
      status: 'away',
      metadata: { tab: 'ops' }
    });

    const callArgs = userPresenceSessionModelMock.upsert.mock.calls[0][0];
    const ttlMs = env.chat.presence.maxTtlMinutes * 60 * 1000;
    expect(callArgs.lastSeenAt.getTime()).toBeGreaterThanOrEqual(now.getTime());
    expect(callArgs.expiresAt.getTime() - callArgs.lastSeenAt.getTime()).toBeLessThanOrEqual(ttlMs + 1000);
    expect(session.status).toBe('away');
    expect(session.metadata).toEqual({ tab: 'ops' });

    vi.useRealTimers();
  });
});
