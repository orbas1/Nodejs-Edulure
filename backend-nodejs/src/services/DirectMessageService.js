import db from '../config/database.js';
import DirectMessageModel from '../models/DirectMessageModel.js';
import DirectMessageParticipantModel from '../models/DirectMessageParticipantModel.js';
import DirectMessageThreadModel from '../models/DirectMessageThreadModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import UserModel from '../models/UserModel.js';
import logger from '../config/logger.js';
import { env } from '../config/env.js';
import realtimeService from './RealtimeService.js';

const log = logger.child({ module: 'direct-message-service' });
const THREAD_DEFAULT_LIMIT = env.directMessages.threads.defaultPageSize;
const THREAD_MAX_LIMIT = env.directMessages.threads.maxPageSize;
const MESSAGE_DEFAULT_LIMIT = env.directMessages.messages.defaultPageSize;
const MESSAGE_MAX_LIMIT = env.directMessages.messages.maxPageSize;

function truncatePreview(body) {
  if (!body) return null;
  return body.length > 240 ? `${body.slice(0, 237)}...` : body;
}

function invokeRealtime(method, ...args) {
  const target = realtimeService?.[method];
  if (typeof target === 'function') {
    try {
      target.call(realtimeService, ...args);
      return true;
    } catch (error) {
      log.warn({ err: error, method }, 'realtime callback failed');
    }
  }
  return false;
}

async function ensureParticipant(threadId, userId) {
  const participant = await DirectMessageParticipantModel.findParticipant(threadId, userId);
  if (!participant) {
    const error = new Error('Thread not found or access denied');
    error.status = 404;
    throw error;
  }
  return participant;
}

export default class DirectMessageService {
  static async listThreads(userId, query = {}) {
    const requestedLimit = Number(query.limit ?? THREAD_DEFAULT_LIMIT);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), THREAD_MAX_LIMIT)
      : THREAD_DEFAULT_LIMIT;
    const requestedOffset = Number(query.offset ?? 0);
    const offset = Number.isFinite(requestedOffset) ? Math.max(Math.floor(requestedOffset), 0) : 0;
    const includeArchived = Boolean(query.includeArchived);
    const threads = await DirectMessageThreadModel.listForUser(userId, {
      ...query,
      includeArchived,
      limit,
      offset
    });
    if (!threads.length) {
      return { threads: [], limit, offset };
    }

    const threadIds = threads.map((thread) => thread.id);
    const participantsByThread = await Promise.all(
      threadIds.map((id) => DirectMessageParticipantModel.listForThread(id))
    );
    const uniqueUserIds = new Set();
    participantsByThread.forEach((participants) => {
      participants.forEach((participant) => uniqueUserIds.add(participant.userId));
    });
    const users = await UserModel.findByIds([...uniqueUserIds]);
    const userMap = new Map(users.map((user) => [user.id, user]));

    const latestMessages = await DirectMessageModel.latestForThreads(threadIds);
    const latestMap = latestMessages.reduce((acc, entry) => {
      acc.set(entry.threadId, entry.message);
      return acc;
    }, new Map());

    const viewerParticipants = participantsByThread.map((participants) =>
      participants.find((participant) => participant.userId === userId) ?? null
    );

    const unreadCounts = await Promise.all(
      viewerParticipants.map((participant, index) => {
        if (!participant) {
          return Promise.resolve(0);
        }
        return DirectMessageModel.countSince(threadIds[index], participant.lastReadAt);
      })
    );

    const results = [];
    for (let index = 0; index < threads.length; index += 1) {
      const thread = threads[index];
      const participants = participantsByThread[index].map((participant) => ({
        ...participant,
        user: userMap.get(participant.userId) ?? null
      }));
      const viewerParticipant = viewerParticipants[index];
      if (!viewerParticipant) {
        continue;
      }
      const unreadCount = unreadCounts[index] ?? 0;
      results.push({
        thread: {
          ...thread,
          viewerArchivedAt: viewerParticipant.archivedAt ?? null,
          isArchived: Boolean(thread.archivedAt) || Boolean(viewerParticipant.archivedAt)
        },
        participants,
        latestMessage: latestMap.get(thread.id) ?? null,
        unreadCount
      });
    }

    return { threads: results, limit, offset };
  }

  static async createThread(creatorId, payload) {
    const participantIds = new Set((payload.participantIds ?? []).map((id) => Number(id)));
    participantIds.add(Number(creatorId));
    const uniqueIds = [...participantIds];
    if (uniqueIds.length < 2) {
      const error = new Error('A thread requires at least two participants');
      error.status = 422;
      throw error;
    }

    const users = await UserModel.findByIds(uniqueIds);
    if (users.length !== uniqueIds.length) {
      const missing = uniqueIds.filter((id) => !users.some((user) => user.id === id));
      const error = new Error(`Participants not found: ${missing.join(', ')}`);
      error.status = 404;
      throw error;
    }

    let thread = null;
    if (uniqueIds.length === 2 && !payload.forceNew) {
      thread = await DirectMessageThreadModel.findThreadMatchingParticipants(uniqueIds);
    }

    const result = await db.transaction(async (trx) => {
      let activeThread = thread;
      if (!activeThread) {
        activeThread = await DirectMessageThreadModel.create(
          {
            subject: payload.subject ?? null,
            isGroup: uniqueIds.length > 2,
            metadata: { createdBy: creatorId }
          },
          trx
        );

        await Promise.all(
          uniqueIds.map((participantId) =>
            DirectMessageParticipantModel.create(
              {
                threadId: activeThread.id,
                userId: participantId,
                role: participantId === creatorId ? 'admin' : 'member'
              },
              trx
            )
          )
        );

        await DomainEventModel.record(
          {
            entityType: 'direct_message_thread',
            entityId: activeThread.id,
            eventType: 'dm.thread.created',
            payload: { creatorId, participantCount: uniqueIds.length },
            performedBy: creatorId
          },
          trx
        );
      }

      let initialMessage = null;
      if (payload.initialMessage?.body) {
        initialMessage = await DirectMessageModel.create(
          {
            threadId: activeThread.id,
            senderId: creatorId,
            messageType: payload.initialMessage.messageType,
            body: payload.initialMessage.body,
            attachments: payload.initialMessage.attachments,
            metadata: payload.initialMessage.metadata
          },
          trx
        );

        await DirectMessageThreadModel.updateThreadMetadata(
          activeThread.id,
          {
            lastMessageAt: initialMessage.createdAt,
            lastMessagePreview: truncatePreview(initialMessage.body)
          },
          trx
        );

        await DirectMessageParticipantModel.updateLastRead(
          activeThread.id,
          creatorId,
          { timestamp: new Date(initialMessage.createdAt), messageId: initialMessage.id },
          trx
        );

        await DomainEventModel.record(
          {
            entityType: 'direct_message',
            entityId: initialMessage.id,
            eventType: 'dm.message.created',
            payload: { threadId: activeThread.id },
            performedBy: creatorId
          },
          trx
        );
      }

      log.info(
        { threadId: activeThread.id, creatorId, reused: Boolean(thread) },
        'direct message thread ready'
      );

      return { thread: activeThread, initialMessage };
    });

    const participants = await DirectMessageParticipantModel.listForThread(result.thread.id);
    invokeRealtime('broadcastThreadUpsert', result.thread, participants, {
      initialMessage: result.initialMessage
    });

    return result;
  }

  static async listMessages(threadId, userId, filters = {}) {
    await ensureParticipant(threadId, userId);
    const requestedLimit = Number(filters.limit ?? MESSAGE_DEFAULT_LIMIT);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), MESSAGE_MAX_LIMIT)
      : MESSAGE_DEFAULT_LIMIT;
    const messages = await DirectMessageModel.listForThread(threadId, { ...filters, limit });
    return { messages, limit };
  }

  static async sendMessage(threadId, userId, payload) {
    await ensureParticipant(threadId, userId);
    const message = await db.transaction(async (trx) => {
      const message = await DirectMessageModel.create(
        {
          threadId,
          senderId: userId,
          messageType: payload.messageType,
          body: payload.body,
          attachments: payload.attachments,
          metadata: payload.metadata
        },
        trx
      );

      await DirectMessageThreadModel.updateThreadMetadata(
        threadId,
        {
          lastMessageAt: message.createdAt,
          lastMessagePreview: truncatePreview(message.body)
        },
        trx
      );

      await DirectMessageParticipantModel.updateLastRead(
        threadId,
        userId,
        { timestamp: new Date(message.createdAt), messageId: message.id },
        trx
      );

      await DirectMessageParticipantModel.setArchivedState(
        threadId,
        userId,
        { archivedAt: null },
        trx
      );

      await DirectMessageThreadModel.setArchiveState(
        threadId,
        { archivedAt: null, archivedBy: null },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'direct_message',
          entityId: message.id,
          eventType: 'dm.message.created',
          payload: { threadId },
          performedBy: userId
        },
        trx
      );

      log.info({ threadId, messageId: message.id, senderId: userId }, 'dm message sent');
      return message;
    });

    const participants = await DirectMessageParticipantModel.listForThread(threadId);
    const notified = invokeRealtime('broadcastMessage', threadId, message, participants);
    if (!notified) {
      invokeRealtime('broadcastThreadUpsert', { id: threadId }, participants, {
        lastMessage: message
      });
    }

    return message;
  }

  static async archiveThread(threadId, userId, { reason } = {}) {
    await ensureParticipant(threadId, userId);
    const archivedAt = new Date();
    let archivedThread;

    await db.transaction(async (trx) => {
      await DirectMessageParticipantModel.setArchivedState(
        threadId,
        userId,
        { archivedAt },
        trx
      );

      const participants = await DirectMessageParticipantModel.listForThread(threadId, trx);
      if (participants.every((participant) => participant.archivedAt)) {
        archivedThread = await DirectMessageThreadModel.setArchiveState(
          threadId,
          {
            archivedAt,
            archivedBy: userId,
            archiveMetadata: { reason: reason ?? null }
          },
          trx
        );
      } else {
        archivedThread = await DirectMessageThreadModel.findById(threadId, trx);
      }
    });

    const participants = await DirectMessageParticipantModel.listForThread(threadId);
    invokeRealtime('broadcastThreadUpsert', archivedThread, participants, { archived: true });

    return { thread: archivedThread, archivedAt };
  }

  static async restoreThread(threadId, userId) {
    await ensureParticipant(threadId, userId);
    let restoredThread;
    let participantsForBroadcast = null;

    await db.transaction(async (trx) => {
      await DirectMessageParticipantModel.listForThread(threadId, trx);
      await DirectMessageParticipantModel.setArchivedState(
        threadId,
        userId,
        { archivedAt: null },
        trx
      );

      const participants = await DirectMessageParticipantModel.listForThread(threadId, trx);
      participantsForBroadcast = participants;
      if (participants.some((participant) => participant.archivedAt)) {
        restoredThread = await DirectMessageThreadModel.findById(threadId, trx);
      } else {
        restoredThread = await DirectMessageThreadModel.setArchiveState(
          threadId,
          { archivedAt: null, archivedBy: null, archiveMetadata: {} },
          trx
        );
      }
    });

    const participants =
      participantsForBroadcast ?? (await DirectMessageParticipantModel.listForThread(threadId));
    invokeRealtime('broadcastThreadUpsert', restoredThread, participants ?? [], { archived: false });

    return { thread: restoredThread };
  }

  static async markRead(threadId, userId, payload = {}) {
    await ensureParticipant(threadId, userId);
    let messageRecord = null;
    if (payload.messageId) {
      messageRecord = await DirectMessageModel.markRead(payload.messageId);
    }
    const updatedParticipant = await DirectMessageParticipantModel.updateLastRead(
      threadId,
      userId,
      { timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(), messageId: payload.messageId ?? null }
    );
    invokeRealtime('broadcastReadReceipt', threadId, updatedParticipant);
    return { participant: updatedParticipant, message: messageRecord };
  }
}
