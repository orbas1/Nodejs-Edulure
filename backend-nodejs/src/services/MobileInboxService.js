import LearnerSupportRepository from '../repositories/LearnerSupportRepository.js';
import logger from '../config/logger.js';

const serviceLogger = logger.child({ module: 'mobile-inbox-service' });

function resolveDisplayName(user) {
  if (!user) {
    return 'You';
  }
  if (user.name) {
    return user.name;
  }
  const parts = [];
  if (user.firstName) parts.push(user.firstName);
  if (user.lastName) parts.push(user.lastName);
  if (parts.length) {
    return parts.join(' ');
  }
  if (user.email) {
    return user.email.split('@')[0];
  }
  return 'You';
}

function mapAttachment(attachment, index) {
  if (!attachment) {
    return null;
  }
  const label = attachment.name ?? attachment.label ?? `Attachment ${index + 1}`;
  const url = attachment.url ?? attachment.href ?? '';
  if (!url) {
    return null;
  }
  return {
    label,
    url,
    type: attachment.type ?? attachment.mimeType ?? 'link'
  };
}

function mapMessage(message, currentUserName, supportName) {
  const attachments = Array.isArray(message.attachments)
    ? message.attachments.map((item, index) => mapAttachment(item, index)).filter(Boolean)
    : [];

  const sentAt = message.createdAt ? new Date(message.createdAt) : new Date();
  const fromLearner = (message.author ?? 'learner').toLowerCase() === 'learner';

  return {
    id: String(message.id ?? `${message.caseId ?? 'msg'}-${sentAt.getTime()}`),
    author: fromLearner ? currentUserName : supportName,
    body: message.body ?? '',
    sentAt: sentAt.toISOString(),
    fromMe: fromLearner,
    attachments,
    deliveryStatus: 'sent'
  };
}

function mapTicketToThread(ticket, currentUser) {
  const currentUserName = resolveDisplayName(currentUser);
  const supportName = ticket.owner ?? ticket.lastAgent ?? 'Support Team';
  const createdAt = ticket.createdAt ? new Date(ticket.createdAt) : new Date();
  const updatedAt = ticket.updatedAt ? new Date(ticket.updatedAt) : createdAt;

  return {
    id: String(ticket.id ?? ticket.reference ?? `ticket-${createdAt.getTime()}`),
    title: ticket.subject ?? 'Support request',
    channel: 'support',
    topic: ticket.category ?? 'General',
    participants: [
      { id: `user-${currentUser?.id ?? 'me'}`, displayName: currentUserName, role: 'learner' },
      { id: 'support-team', displayName: supportName, role: 'support' }
    ],
    messages: Array.isArray(ticket.messages)
      ? ticket.messages.map((message) => mapMessage(message, currentUserName, supportName))
      : [],
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    lastReadAt: ticket.followUpDueAt ?? null,
    topicMeta: {
      priority: ticket.priority,
      status: ticket.status,
      reference: ticket.reference,
      knowledgeSuggestions: ticket.knowledgeSuggestions ?? []
    }
  };
}

export default class MobileInboxService {
  static async listThreads(userId, currentUser = {}) {
    const tickets = await LearnerSupportRepository.listCases(userId);
    if (!tickets.length) {
      return [];
    }
    return tickets.map((ticket) => mapTicketToThread(ticket, currentUser));
  }

  static async appendMessage(userId, threadId, payload = {}) {
    const message = await LearnerSupportRepository.addMessage(userId, threadId, {
      author: 'learner',
      body: payload.body ?? '',
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      createdAt: payload.createdAt ?? new Date().toISOString()
    });

    if (!message) {
      const error = new Error('Thread not found');
      error.status = 404;
      throw error;
    }

    serviceLogger.info({ userId, threadId }, 'Learner appended inbox message');
    const currentUserName = resolveDisplayName(payload.currentUser ?? { id: userId });
    return mapMessage(message, currentUserName, payload.supportName ?? 'Support Team');
  }
}

