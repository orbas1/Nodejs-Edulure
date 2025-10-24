import { randomUUID } from 'node:crypto';

import DirectMessageModel from '../models/DirectMessageModel.js';
import DirectMessageParticipantModel from '../models/DirectMessageParticipantModel.js';
import DirectMessageThreadModel from '../models/DirectMessageThreadModel.js';
import LearnerSupportRepository from '../repositories/LearnerSupportRepository.js';
import UserModel from '../models/UserModel.js';

const MAX_THREAD_MESSAGES = 25;
const MAX_THREADS = 20;

const SUPPORT_STATUS_MAP = new Map([
  ['open', 'open'],
  ['waiting', 'inProgress'],
  ['pending', 'inProgress'],
  ['pending_support', 'inProgress'],
  ['pending_customer', 'awaitingCustomer'],
  ['awaiting_customer', 'awaitingCustomer'],
  ['in_progress', 'inProgress'],
  ['resolved', 'resolved'],
  ['closed', 'closed'],
  ['archived', 'closed']
]);

const SUPPORT_PRIORITY_MAP = new Map([
  ['urgent', 'urgent'],
  ['high', 'high'],
  ['medium', 'normal'],
  ['normal', 'normal'],
  ['standard', 'normal'],
  ['low', 'low']
]);

function toParticipantProfile(user, participant) {
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  return {
    id: String(user?.id ?? participant?.userId ?? randomUUID()),
    displayName: fullName || user?.email || 'Participant',
    avatarUrl: participant?.metadata?.avatarUrl ?? null,
    role: participant?.role ?? user?.role ?? null
  };
}

function toInboxMessage(message, currentUserId) {
  const authorName = [message.sender?.firstName, message.sender?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return {
    id: String(message.id),
    author: authorName || (message.senderId === currentUserId ? 'You' : message.sender?.email ?? 'Member'),
    body: message.body ?? '',
    sentAt: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
    fromMe: message.senderId === currentUserId,
    attachments: (message.attachments ?? []).map((attachment) => ({
      label: attachment.name ?? attachment.label ?? 'Attachment',
      url: attachment.url ?? '#',
      type: attachment.type ?? 'link'
    })),
    authorAvatarUrl: message.metadata?.avatarUrl ?? null,
    deliveryStatus: message.status ?? 'sent',
    reactions: {}
  };
}

function sortChronologically(items) {
  return [...items].sort((a, b) => new Date(a.sentAt ?? 0) - new Date(b.sentAt ?? 0));
}

function toConversationThread(thread, participants, messages, currentUserId) {
  const participantProfiles = participants.map((participant) =>
    toParticipantProfile(participant.user, participant.record)
  );
  const inboxMessages = sortChronologically(
    messages.map((message) => toInboxMessage(message, currentUserId))
  );
  const userParticipant = participants.find((participant) => participant.record.userId === currentUserId);
  const metadata = thread.metadata ?? {};

  return {
    id: String(thread.id),
    title: thread.subject ?? metadata.title ?? 'Conversation',
    channel: metadata.channel ?? 'direct',
    participants: participantProfiles,
    messages: inboxMessages,
    createdAt: thread.createdAt ? new Date(thread.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: (thread.updatedAt ?? thread.lastMessageAt ?? thread.createdAt)
      ? new Date(thread.updatedAt ?? thread.lastMessageAt ?? thread.createdAt).toISOString()
      : new Date().toISOString(),
    lastReadAt: userParticipant?.record.lastReadAt
      ? new Date(userParticipant.record.lastReadAt).toISOString()
      : null,
    topic: metadata.topic ?? null,
    pinned: metadata.pinned === true,
    muted: Boolean(userParticipant?.record.isMuted),
    archived: metadata.archived === true,
    emojiTag: metadata.emojiTag ?? metadata.emoji ?? null
  };
}

function toSupportUpdate(message, contactName) {
  return {
    id: String(message.id ?? randomUUID()),
    author:
      message.author === 'learner'
        ? contactName ?? 'You'
        : message.author === 'support'
          ? 'Support'
          : message.author ?? 'Support',
    body: message.body ?? '',
    sentAt: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
    internal: message.author !== 'learner',
    attachments: (message.attachments ?? []).map((attachment) => ({
      label: attachment.name ?? attachment.label ?? 'Attachment',
      url: attachment.url ?? '#',
      type: attachment.type ?? 'link'
    }))
  };
}

function resolveSupportStatus(status) {
  const normalised = String(status ?? 'open').toLowerCase();
  return SUPPORT_STATUS_MAP.get(normalised) ?? 'open';
}

function resolveSupportPriority(priority) {
  const normalised = String(priority ?? 'normal').toLowerCase();
  return SUPPORT_PRIORITY_MAP.get(normalised) ?? 'normal';
}

function toSupportTicket(ticket, contact) {
  const metadata = ticket.metadata ?? {};
  const contactName = metadata.contactName ?? contact.fullName ?? contact.email ?? 'Learner';
  const contactEmail = metadata.contactEmail ?? contact.email ?? 'unknown@edulure.com';
  const description =
    metadata.description ??
    ticket.messages.find((message) => message.author === 'learner')?.body ??
    ticket.subject ??
    'Support request';

  const updates = ticket.messages.map((message) => toSupportUpdate(message, contactName));

  const tags = Array.isArray(metadata.tags)
    ? metadata.tags.map((tag) => String(tag)).filter(Boolean)
    : [ticket.category].filter(Boolean);

  return {
    id: ticket.reference ? String(ticket.reference) : String(ticket.id),
    subject: ticket.subject ?? 'Support request',
    description,
    status: resolveSupportStatus(ticket.status),
    priority: resolveSupportPriority(ticket.priority),
    createdAt: ticket.createdAt ? new Date(ticket.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: ticket.updatedAt ? new Date(ticket.updatedAt).toISOString() : new Date().toISOString(),
    contactName,
    contactEmail,
    channel: ticket.channel ? String(ticket.channel).toLowerCase() : 'in-app',
    tags,
    updates: updates.sort((a, b) => new Date(a.sentAt ?? 0) - new Date(b.sentAt ?? 0)),
    slaDueAt: ticket.followUpDueAt ? new Date(ticket.followUpDueAt).toISOString() : null,
    assetUrl: metadata.assetUrl ?? null,
    assignedTo: ticket.owner ?? ticket.lastAgent ?? null
  };
}

function extractThreadParticipants(rawParticipants, userMap) {
  return rawParticipants.map((record) => ({
    record,
    user: userMap.get(record.userId) ?? null
  }));
}

function normaliseAttachments(input) {
  if (!Array.isArray(input)) {
    return [];
  }
  return input
    .map((attachment, index) => ({
      id: attachment?.id ?? attachment?.attachmentId ?? `att-${index}`,
      name: attachment?.label ?? attachment?.name ?? `Attachment ${index + 1}`,
      url: attachment?.url ?? null,
      type: attachment?.type ?? attachment?.mimeType ?? 'link',
      size: attachment?.size ?? attachment?.bytes ?? null
    }))
    .filter((attachment) => attachment.name);
}

export default class MobileCommunicationService {
  static async getInbox(userId) {
    if (!userId) {
      throw new Error('Authentication required to load inbox');
    }

    const threads = await DirectMessageThreadModel.listForUser(userId, { limit: MAX_THREADS });
    const threadIds = threads.map((thread) => thread.id);

    const [participantGroups, messagesByThread, contactUser, supportCases] = await Promise.all([
      Promise.all(
        threadIds.map((threadId) => DirectMessageParticipantModel.listForThread(threadId))
      ),
      Promise.all(
        threadIds.map((threadId) => DirectMessageModel.listForThread(threadId, { limit: MAX_THREAD_MESSAGES }))
      ),
      UserModel.findById(userId),
      LearnerSupportRepository.listCases(userId)
    ]);

    const participantUserIds = new Set();
    participantGroups.forEach((group) => {
      group.forEach((participant) => {
        participantUserIds.add(participant.userId);
      });
    });

    const users = await UserModel.findByIds(Array.from(participantUserIds));
    const userMap = new Map(users.map((user) => [user.id, user]));

    const formattedThreads = threads.map((thread, index) => {
      const rawParticipants = participantGroups[index] ?? [];
      const participants = extractThreadParticipants(rawParticipants, userMap);
      const messages = messagesByThread[index] ?? [];
      return toConversationThread(thread, participants, messages, userId);
    });

    const contact = {
      fullName: [contactUser?.first_name, contactUser?.last_name].filter(Boolean).join(' ').trim(),
      email: contactUser?.email ?? null
    };

    const formattedTickets = supportCases.map((ticket) => toSupportTicket(ticket, contact));

    return {
      threads: formattedThreads,
      tickets: formattedTickets
    };
  }

  static async sendMessage(userId, threadId, { body, clientMessageId, attachments = [] } = {}) {
    if (!userId) {
      throw new Error('Authentication required to send message');
    }
    if (!threadId) {
      throw Object.assign(new Error('Thread identifier is required'), { status: 400 });
    }
    if (!body || !String(body).trim()) {
      throw Object.assign(new Error('Message body is required'), { status: 400 });
    }

    const numericThreadId = Number.parseInt(threadId, 10);
    if (!Number.isFinite(numericThreadId)) {
      throw Object.assign(new Error('Thread identifier is invalid'), { status: 400 });
    }

    const participant = await DirectMessageParticipantModel.findParticipant(numericThreadId, userId);
    if (!participant) {
      const error = new Error('You are not a participant in this thread');
      error.status = 403;
      throw error;
    }

    const attachmentPayload = normaliseAttachments(attachments);

    const message = await DirectMessageModel.create({
      threadId: numericThreadId,
      senderId: userId,
      body: String(body),
      attachments: attachmentPayload,
      metadata: {
        clientMessageId: clientMessageId ?? null,
        uploadedFrom: 'mobile'
      }
    });

    await DirectMessageThreadModel.updateThreadMetadata(numericThreadId, {
      lastMessageAt: message.createdAt,
      lastMessagePreview: message.body
    });

    await DirectMessageParticipantModel.updateLastRead(numericThreadId, userId, {
      timestamp: new Date(),
      messageId: message.id
    });

    return toInboxMessage(message, userId);
  }

  static async markThreadRead(userId, threadId, timestamp) {
    if (!userId) {
      throw new Error('Authentication required to update read state');
    }
    if (!threadId) {
      throw Object.assign(new Error('Thread identifier is required'), { status: 400 });
    }

    const numericThreadId = Number.parseInt(threadId, 10);
    if (!Number.isFinite(numericThreadId)) {
      throw Object.assign(new Error('Thread identifier is invalid'), { status: 400 });
    }

    await DirectMessageParticipantModel.updateLastRead(numericThreadId, userId, {
      timestamp: timestamp ?? new Date(),
      messageId: null
    });
  }

  static async createSupportTicket(userId, payload = {}) {
    if (!userId) {
      throw new Error('Authentication required to create support ticket');
    }
    if (!payload.subject || !payload.description) {
      throw Object.assign(new Error('Subject and description are required'), { status: 400 });
    }

    const metadata = {
      contactName: payload.contactName ?? null,
      contactEmail: payload.contactEmail ?? null,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      description: payload.description
    };

    const ticket = await LearnerSupportRepository.createCase(userId, {
      subject: payload.subject,
      priority: payload.priority ?? 'normal',
      category: payload.category ?? 'General',
      metadata,
      messages: [
        {
          author: 'learner',
          body: payload.description,
          attachments: normaliseAttachments(payload.attachments)
        }
      ]
    });

    const contactUser = await UserModel.findById(userId);
    const contact = {
      fullName: [contactUser?.first_name, contactUser?.last_name].filter(Boolean).join(' ').trim(),
      email: contactUser?.email ?? payload.contactEmail ?? null
    };

    return toSupportTicket(ticket, contact);
  }
}
