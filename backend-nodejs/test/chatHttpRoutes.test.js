import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env.js';

const communityChatServiceMock = {
  listChannels: vi.fn(),
  listMessages: vi.fn(),
  postMessage: vi.fn(),
  acknowledgeRead: vi.fn(),
  reactToMessage: vi.fn(),
  removeReaction: vi.fn(),
  moderateMessage: vi.fn(),
  listPresence: vi.fn(),
  updatePresence: vi.fn()
};

const directMessageServiceMock = {
  listThreads: vi.fn(),
  createThread: vi.fn(),
  listMessages: vi.fn(),
  sendMessage: vi.fn(),
  markRead: vi.fn(),
  archiveThread: vi.fn(),
  restoreThread: vi.fn()
};

const realtimeServiceMock = {
  broadcastCommunityMessage: vi.fn(),
  broadcastCommunityReaction: vi.fn(),
  broadcastCommunityPresence: vi.fn()
};

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (req, _res, next) => {
    req.user = { id: 42, role: 'user', sessionId: 'sess-001' };
    return next();
  }
}));

vi.mock('../src/services/CommunityChatService.js', () => ({
  default: communityChatServiceMock
}));

vi.mock('../src/services/DirectMessageService.js', () => ({
  default: directMessageServiceMock
}));

vi.mock('../src/services/RealtimeService.js', () => ({
  default: realtimeServiceMock
}));

let app;

beforeAll(async () => {
  ({ default: app } = await import('../src/app.js'));
});

beforeEach(() => {
  Object.values(communityChatServiceMock).forEach((fn) => fn.mockReset());
  Object.values(directMessageServiceMock).forEach((fn) => fn.mockReset());
  Object.values(realtimeServiceMock).forEach((fn) => fn.mockReset());
});

describe('Community chat HTTP routes', () => {
  it('returns channel summaries with latest message context', async () => {
    communityChatServiceMock.listChannels.mockResolvedValue([
      {
        channel: {
          id: 11,
          communityId: 7,
          name: 'Launch Desk',
          slug: 'launch-desk',
          channelType: 'general',
          description: 'Daily ops touchpoint',
          isDefault: true,
          metadata: { cadence: 'daily' }
        },
        membership: {
          id: 88,
          channelId: 11,
          userId: 42,
          lastReadAt: null
        },
        latestMessage: {
          id: 501,
          body: 'Checklist complete',
          authorId: 9
        },
        unreadCount: 3
      }
    ]);

    const response = await request(app)
      .get('/api/v1/communities/7/chat/channels')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].channel.slug).toBe('launch-desk');
    expect(response.body.data[0].unreadCount).toBe(3);
    expect(communityChatServiceMock.listChannels).toHaveBeenCalledWith('7', 42);
  });

  it('applies filtering options when listing channel messages', async () => {
    const now = new Date();
    communityChatServiceMock.listMessages.mockResolvedValue([
      {
        id: 901,
        communityId: 7,
        channelId: 11,
        body: 'Status update ready',
        reactions: [
          { emoji: '👍', count: 2 }
        ],
        viewerReactions: ['👍']
      }
    ]);

    const response = await request(app)
      .get(
        `/api/v1/communities/7/chat/channels/11/messages?limit=10&before=${encodeURIComponent(
          now.toISOString()
        )}&includeHidden=true`
      )
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.meta.pagination.limit).toBe(10);
    const [, , , filters] = communityChatServiceMock.listMessages.mock.calls[0];
    expect(filters.limit).toBe(10);
    expect(filters.includeHidden).toBe(true);
    expect(filters.before).toBeInstanceOf(Date);
  });

  it('validates message payloads before delegating to the service', async () => {
    const created = {
      id: 777,
      communityId: 7,
      channelId: 11,
      authorId: 42,
      body: 'Shipping the chat rollout',
      attachments: [],
      metadata: {}
    };
    communityChatServiceMock.postMessage.mockResolvedValue(created);

    const response = await request(app)
      .post('/api/v1/communities/7/chat/channels/11/messages')
      .set('Authorization', 'Bearer token')
      .send({ body: 'Shipping the chat rollout' });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe(777);
    expect(communityChatServiceMock.postMessage).toHaveBeenCalledWith(
      '7',
      '11',
      42,
      expect.objectContaining({
        body: 'Shipping the chat rollout',
        attachments: [],
        metadata: {}
      })
    );
    expect(realtimeServiceMock.broadcastCommunityMessage).toHaveBeenCalledWith(
      '7',
      '11',
      expect.objectContaining({ id: 777 }),
      expect.objectContaining({ actorId: 42 })
    );
  });

  it('returns a validation error when message body is missing', async () => {
    const response = await request(app)
      .post('/api/v1/communities/7/chat/channels/11/messages')
      .set('Authorization', 'Bearer token')
      .send({});

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('body');
    expect(communityChatServiceMock.postMessage).not.toHaveBeenCalled();
  });

  it('records reactions and moderation actions through the service layer', async () => {
    communityChatServiceMock.reactToMessage.mockResolvedValue({
      messageId: 901,
      reactions: [{ emoji: '🚀', count: 1 }],
      viewerReactions: ['🚀']
    });
    communityChatServiceMock.removeReaction.mockResolvedValue({
      messageId: 901,
      reactions: [],
      viewerReactions: []
    });
    communityChatServiceMock.moderateMessage.mockResolvedValue({
      message: { id: 901, status: 'hidden' },
      moderation: { id: 12, actionType: 'hide' }
    });

    const reactResponse = await request(app)
      .post('/api/v1/communities/7/chat/channels/11/messages/901/reactions')
      .set('Authorization', 'Bearer token')
      .send({ emoji: '🚀' });
    expect(reactResponse.status).toBe(200);
    expect(communityChatServiceMock.reactToMessage).toHaveBeenCalledWith('7', '11', 42, '901', '🚀');
    expect(realtimeServiceMock.broadcastCommunityReaction).toHaveBeenNthCalledWith(
      1,
      '7',
      '11',
      expect.objectContaining({ messageId: 901, emoji: '🚀', actorId: 42 })
    );

    const removeResponse = await request(app)
      .delete('/api/v1/communities/7/chat/channels/11/messages/901/reactions')
      .set('Authorization', 'Bearer token')
      .send({ emoji: '🚀' });
    expect(removeResponse.status).toBe(200);
    expect(communityChatServiceMock.removeReaction).toHaveBeenCalledWith('7', '11', 42, '901', '🚀');
    expect(realtimeServiceMock.broadcastCommunityReaction).toHaveBeenNthCalledWith(
      2,
      '7',
      '11',
      expect.objectContaining({ messageId: 901, emoji: '🚀', actorId: 42, removed: true })
    );

    const moderateResponse = await request(app)
      .post('/api/v1/communities/7/chat/channels/11/messages/901/moderate')
      .set('Authorization', 'Bearer token')
      .send({ action: 'hide', reason: 'Off-topic' });
    expect(moderateResponse.status).toBe(200);
    expect(communityChatServiceMock.moderateMessage).toHaveBeenCalledWith(
      '7',
      '11',
      42,
      '901',
      expect.objectContaining({ action: 'hide', reason: 'Off-topic' })
    );
    expect(realtimeServiceMock.broadcastCommunityMessage).toHaveBeenCalledWith(
      '7',
      '11',
      expect.objectContaining({ id: 901, status: 'hidden' }),
      expect.objectContaining({
        actorId: 42,
        moderation: expect.objectContaining({ action: 'hide', reason: 'Off-topic' })
      })
    );
  });

  it('updates and returns presence state for authenticated users', async () => {
    communityChatServiceMock.listPresence.mockResolvedValue([
      { id: 1, userId: 42, status: 'online', client: 'web' }
    ]);
    communityChatServiceMock.updatePresence.mockResolvedValue({
      id: 5,
      userId: 42,
      status: 'away',
      client: 'web'
    });

    const listResponse = await request(app)
      .get('/api/v1/communities/7/chat/presence')
      .set('Authorization', 'Bearer token');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data[0].status).toBe('online');
    expect(communityChatServiceMock.listPresence).toHaveBeenCalledWith('7');

    const updateResponse = await request(app)
      .post('/api/v1/communities/7/chat/presence')
      .set('Authorization', 'Bearer token')
      .send({ status: 'away', metadata: { tab: 'chat' } });
    expect(updateResponse.status).toBe(200);
    expect(communityChatServiceMock.updatePresence).toHaveBeenCalledWith(
      42,
      'sess-001',
      expect.objectContaining({
        status: 'away',
        metadata: expect.objectContaining({ tab: 'chat', communityId: 7 }),
        ttlMinutes: 5,
        client: 'web'
      })
    );
    expect(realtimeServiceMock.broadcastCommunityPresence).toHaveBeenCalledWith(
      '7',
      expect.arrayContaining([expect.objectContaining({ userId: 42 })])
    );
  });
});

describe('Direct message HTTP routes', () => {
  it('lists threads with pagination metadata', async () => {
    directMessageServiceMock.listThreads.mockResolvedValue({
      threads: [
        {
          thread: { id: 300, subject: 'Ops sync', isGroup: false },
          participants: [
            { participant: { id: 1, userId: 42 }, user: { id: 42, firstName: 'Ava' } }
          ],
          latestMessage: { id: 900, body: 'Ready for go-live' },
          unreadCount: 0
        }
      ],
      limit: 5,
      offset: 10
    });

    const response = await request(app)
      .get('/api/v1/chat/threads?limit=5&offset=10')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.meta.pagination.limit).toBe(5);
    expect(directMessageServiceMock.listThreads).toHaveBeenCalledWith(42, {
      limit: 5,
      offset: 10,
      includeArchived: false
    });
  });

  it('allows including archived threads when requested', async () => {
    directMessageServiceMock.listThreads.mockResolvedValue({ threads: [], limit: 10, offset: 0 });

    const response = await request(app)
      .get('/api/v1/chat/threads?includeArchived=true')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(directMessageServiceMock.listThreads).toHaveBeenCalledWith(42, {
      limit: env.directMessages.threads.defaultPageSize,
      offset: 0,
      includeArchived: true
    });
  });

  it('creates a thread and optional initial message', async () => {
    directMessageServiceMock.createThread.mockResolvedValue({
      thread: { id: 501, subject: 'Launch help', isGroup: false },
      initialMessage: { id: 702, body: 'Need copy approval' }
    });

    const response = await request(app)
      .post('/api/v1/chat/threads')
      .set('Authorization', 'Bearer token')
      .send({
        participantIds: [12],
        subject: 'Launch help',
        initialMessage: { body: 'Need copy approval' }
      });

    expect(response.status).toBe(201);
    expect(response.body.data.thread.id).toBe(501);
    expect(directMessageServiceMock.createThread).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        participantIds: [12],
        subject: 'Launch help',
        initialMessage: expect.objectContaining({ body: 'Need copy approval', attachments: [], metadata: {} })
      })
    );
  });

  it('rejects malformed thread payloads', async () => {
    const response = await request(app)
      .post('/api/v1/chat/threads')
      .set('Authorization', 'Bearer token')
      .send({});

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(directMessageServiceMock.createThread).not.toHaveBeenCalled();
  });

  it('sends direct messages with validated payloads', async () => {
    directMessageServiceMock.sendMessage.mockResolvedValue({
      id: 910,
      threadId: 300,
      senderId: 42,
      body: 'Kick-off moved to 15:30'
    });

    const response = await request(app)
      .post('/api/v1/chat/threads/300/messages')
      .set('Authorization', 'Bearer token')
      .send({ body: 'Kick-off moved to 15:30' });

    expect(response.status).toBe(201);
    expect(directMessageServiceMock.sendMessage).toHaveBeenCalledWith(
      '300',
      42,
      expect.objectContaining({ body: 'Kick-off moved to 15:30', attachments: [], metadata: {} })
    );
  });

  it('marks threads as read with optional message targeting', async () => {
    directMessageServiceMock.markRead.mockResolvedValue({
      participant: { id: 1, threadId: 300, userId: 42 },
      message: { id: 910 }
    });

    const response = await request(app)
      .post('/api/v1/chat/threads/300/read')
      .set('Authorization', 'Bearer token')
      .send({ messageId: 910 });

    expect(response.status).toBe(200);
    expect(directMessageServiceMock.markRead).toHaveBeenCalledWith('300', 42, {
      messageId: 910
    });
  });

  it('archives a direct message thread', async () => {
    directMessageServiceMock.archiveThread.mockResolvedValue({
      thread: { id: 300, archivedAt: new Date().toISOString() }
    });

    const response = await request(app)
      .post('/api/v1/chat/threads/300/archive')
      .set('Authorization', 'Bearer token')
      .send({ reason: 'cleanup' });

    expect(response.status).toBe(200);
    expect(directMessageServiceMock.archiveThread).toHaveBeenCalledWith('300', 42, {
      reason: 'cleanup'
    });
  });

  it('restores an archived direct message thread', async () => {
    directMessageServiceMock.restoreThread.mockResolvedValue({ thread: { id: 300 } });

    const response = await request(app)
      .delete('/api/v1/chat/threads/300/archive')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(directMessageServiceMock.restoreThread).toHaveBeenCalledWith('300', 42);
  });
});
