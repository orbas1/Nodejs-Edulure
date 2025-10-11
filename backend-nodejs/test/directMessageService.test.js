import { beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env.js';
import DirectMessageService from '../src/services/DirectMessageService.js';

const transactionSpy = vi.hoisted(() => vi.fn(async (handler) => handler({ fn: { now: () => new Date() } })));

const directMessageThreadModelMock = vi.hoisted(() => ({
  listForUser: vi.fn(),
  create: vi.fn(),
  updateThreadMetadata: vi.fn(),
  findThreadMatchingParticipants: vi.fn()
}));

const directMessageParticipantModelMock = vi.hoisted(() => ({
  listForThread: vi.fn(),
  create: vi.fn(),
  findParticipant: vi.fn(),
  updateLastRead: vi.fn()
}));

const directMessageModelMock = vi.hoisted(() => ({
  latestForThreads: vi.fn(),
  countSince: vi.fn(),
  listForThread: vi.fn(),
  create: vi.fn(),
  markRead: vi.fn()
}));

const userModelMock = vi.hoisted(() => ({
  findByIds: vi.fn()
}));

const domainEventModelMock = vi.hoisted(() => ({
  record: vi.fn()
}));

vi.mock('../src/config/database.js', () => ({
  default: {
    transaction: transactionSpy
  }
}));
vi.mock('../src/models/DirectMessageThreadModel.js', () => ({
  default: directMessageThreadModelMock
}));
vi.mock('../src/models/DirectMessageParticipantModel.js', () => ({
  default: directMessageParticipantModelMock
}));
vi.mock('../src/models/DirectMessageModel.js', () => ({
  default: directMessageModelMock
}));
vi.mock('../src/models/UserModel.js', () => ({
  default: userModelMock
}));
vi.mock('../src/models/DomainEventModel.js', () => ({
  default: domainEventModelMock
}));

describe('DirectMessageService', () => {
  beforeEach(() => {
    transactionSpy.mockClear();
    [
      directMessageThreadModelMock,
      directMessageParticipantModelMock,
      directMessageModelMock,
      userModelMock,
      domainEventModelMock
    ].forEach((mock) => {
      Object.values(mock).forEach((fn) => fn.mockReset());
    });
  });

  it('reuses a 1:1 thread and records an initial message', async () => {
    directMessageThreadModelMock.findThreadMatchingParticipants.mockResolvedValue({
      id: 77,
      subject: 'Ops Sync',
      isGroup: false
    });
    userModelMock.findByIds.mockResolvedValue([
      { id: 11, firstName: 'Amina' },
      { id: 22, firstName: 'Kai' }
    ]);
    directMessageModelMock.create.mockResolvedValue({
      id: 901,
      threadId: 77,
      body: 'Checklist signed off and synced to the ops drive.',
      createdAt: new Date().toISOString()
    });
    directMessageParticipantModelMock.updateLastRead.mockResolvedValue({});

    const result = await DirectMessageService.createThread(11, {
      participantIds: [22],
      initialMessage: { body: 'Checklist signed off and synced to the ops drive.' }
    });

    expect(directMessageThreadModelMock.create).not.toHaveBeenCalled();
    expect(directMessageModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ threadId: 77, senderId: 11 }),
      expect.any(Object)
    );
    expect(domainEventModelMock.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'dm.message.created', entityId: 901 }),
      expect.any(Object)
    );
    expect(result.thread).toEqual(expect.objectContaining({ id: 77 }));
    expect(result.initialMessage).toEqual(expect.objectContaining({ id: 901 }));
  });

  it('sends a message and updates last read state', async () => {
    directMessageParticipantModelMock.findParticipant.mockResolvedValue({ threadId: 77, userId: 11 });
    directMessageModelMock.create.mockResolvedValue({
      id: 902,
      threadId: 77,
      body: 'Ready for the dry run checklist review.',
      createdAt: new Date('2024-10-01T10:00:00Z').toISOString()
    });
    directMessageThreadModelMock.updateThreadMetadata.mockResolvedValue({});
    directMessageParticipantModelMock.updateLastRead.mockResolvedValue({ lastReadMessageId: 902 });

    const message = await DirectMessageService.sendMessage(77, 11, {
      body: 'Ready for the dry run checklist review.'
    });

    expect(directMessageModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ threadId: 77, senderId: 11 }),
      expect.any(Object)
    );
    expect(directMessageThreadModelMock.updateThreadMetadata).toHaveBeenCalledWith(
      77,
      expect.objectContaining({ lastMessagePreview: expect.stringContaining('Ready for the dry run') }),
      expect.any(Object)
    );
    expect(directMessageParticipantModelMock.updateLastRead).toHaveBeenCalled();
    expect(message).toEqual(expect.objectContaining({ id: 902 }));
  });

  it('normalises pagination inputs when listing threads', async () => {
    directMessageThreadModelMock.listForUser.mockResolvedValue([]);

    const result = await DirectMessageService.listThreads(42, { limit: 500, offset: -10 });

    expect(directMessageThreadModelMock.listForUser).toHaveBeenCalledWith(42, {
      limit: env.directMessages.threads.maxPageSize,
      offset: 0
    });
    expect(result).toEqual({
      threads: [],
      limit: env.directMessages.threads.maxPageSize,
      offset: 0
    });
  });

  it('clamps direct message history pagination to the configured ceiling', async () => {
    directMessageParticipantModelMock.findParticipant.mockResolvedValue({ threadId: 77, userId: 11 });
    directMessageModelMock.listForThread.mockResolvedValue([]);

    const result = await DirectMessageService.listMessages(77, 11, { limit: 999 });

    expect(directMessageModelMock.listForThread).toHaveBeenCalledWith(
      77,
      expect.objectContaining({ limit: env.directMessages.messages.maxPageSize })
    );
    expect(result).toEqual({
      messages: [],
      limit: env.directMessages.messages.maxPageSize
    });
  });
});
