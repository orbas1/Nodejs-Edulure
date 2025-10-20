import crypto from 'crypto';

import logger from '../config/logger.js';
import LearnerSupportRepository from '../repositories/LearnerSupportRepository.js';

const log = logger.child({ service: 'LearnerDashboardService' });

function generateReference(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

function buildAcknowledgement({
  reference,
  message,
  meta = {}
}) {
  return {
    reference,
    message,
    meta
  };
}

export default class LearnerDashboardService {
  static async createTutorBookingRequest(userId, payload = {}) {
    const bookingId = generateReference('booking');
    log.info({ userId, bookingId, payload }, 'Learner requested new tutor booking');
    return buildAcknowledgement({
      reference: bookingId,
      message: 'Tutor booking request submitted',
      meta: {
        status: 'requested',
        topic: payload.topic ?? 'Mentorship session',
        preferredDate: payload.preferredDate ?? null
      }
    });
  }

  static async exportTutorSchedule(userId) {
    const exportId = generateReference('schedule');
    log.info({ userId, exportId }, 'Learner requested tutor schedule export');
    return buildAcknowledgement({
      reference: exportId,
      message: 'Tutor agenda export ready',
      meta: {
        downloadUrl: `/exports/${exportId}.ics`
      }
    });
  }

  static async createCourseGoal(userId, courseId, payload = {}) {
    const goalId = generateReference('goal');
    log.info({ userId, courseId, goalId, payload }, 'Learner created a new course goal');
    return buildAcknowledgement({
      reference: goalId,
      message: 'Learning goal created',
      meta: {
        courseId,
        target: payload.target ?? null,
        dueDate: payload.dueDate ?? null
      }
    });
  }

  static async resumeEbook(userId, ebookId) {
    log.info({ userId, ebookId }, 'Learner resumed ebook');
    return buildAcknowledgement({
      reference: ebookId,
      message: 'E-book resumed'
    });
  }

  static async shareEbook(userId, ebookId, payload = {}) {
    const shareId = generateReference('share');
    log.info({ userId, ebookId, shareId, payload }, 'Learner shared ebook highlight');
    return buildAcknowledgement({
      reference: shareId,
      message: 'E-book highlight shared',
      meta: {
        recipients: Array.isArray(payload.recipients) ? payload.recipients : payload.recipient ? [payload.recipient] : []
      }
    });
  }

  static async downloadInvoice(userId, invoiceId) {
    log.info({ userId, invoiceId }, 'Learner requested invoice download');
    return buildAcknowledgement({
      reference: invoiceId,
      message: 'Invoice download ready',
      meta: {
        downloadUrl: `/billing/invoices/${invoiceId}.pdf`
      }
    });
  }

  static async updateBillingPreferences(userId, payload = {}) {
    const preferenceId = generateReference('billing');
    log.info({ userId, preferenceId, payload }, 'Learner updated billing preferences');
    return buildAcknowledgement({
      reference: preferenceId,
      message: 'Billing preferences updated',
      meta: {
        autoRenew: payload.autoRenew ?? null,
        paymentMethod: payload.paymentMethod ?? null
      }
    });
  }

  static async joinLiveSession(userId, sessionId) {
    log.info({ userId, sessionId }, 'Learner joined live session');
    return buildAcknowledgement({
      reference: sessionId,
      message: 'Live session joined'
    });
  }

  static async checkInToLiveSession(userId, sessionId) {
    const checkInId = generateReference('checkin');
    log.info({ userId, sessionId, checkInId }, 'Learner checked in to live session');
    return buildAcknowledgement({
      reference: checkInId,
      message: 'Live session check-in recorded',
      meta: {
        sessionId
      }
    });
  }

  static async triggerCommunityAction(userId, communityId, payload = {}) {
    const actionId = generateReference('community');
    log.info({ userId, communityId, payload, actionId }, 'Learner launched community action');
    return buildAcknowledgement({
      reference: actionId,
      message: 'Community action triggered',
      meta: {
        communityId,
        action: payload.action ?? 'general'
      }
    });
  }

  static async listSupportTickets(userId) {
    const cases = await LearnerSupportRepository.listCases(userId);
    return cases;
  }

  static async createSupportTicket(userId, payload = {}) {
    if (!payload.subject) {
      throw new Error('Subject is required to create a support ticket');
    }
    const initialMessages = [];
    if (payload.description) {
      initialMessages.push({
        author: 'learner',
        body: payload.description,
        attachments: payload.attachments ?? [],
        createdAt: new Date().toISOString()
      });
    }
    const ticket = await LearnerSupportRepository.createCase(userId, {
      subject: payload.subject,
      category: payload.category ?? 'General',
      priority: payload.priority ?? 'normal',
      status: 'open',
      channel: 'Portal',
      initialMessages,
      metadata: payload.metadata ?? {}
    });
    log.info({ userId, ticketId: ticket?.id }, 'Learner created support ticket');
    return ticket;
  }

  static async updateSupportTicket(userId, ticketId, payload = {}) {
    const ticket = await LearnerSupportRepository.updateCase(userId, ticketId, payload);
    if (!ticket) {
      throw new Error('Support ticket not found');
    }
    log.info({ userId, ticketId }, 'Learner updated support ticket');
    return ticket;
  }

  static async addSupportTicketMessage(userId, ticketId, payload = {}) {
    if (!payload.body && !Array.isArray(payload.attachments)) {
      throw new Error('Message content is required');
    }
    const message = await LearnerSupportRepository.addMessage(userId, ticketId, {
      author: payload.author ?? 'learner',
      body: payload.body ?? '',
      attachments: payload.attachments ?? [],
      createdAt: payload.createdAt ?? new Date().toISOString()
    });
    if (!message) {
      throw new Error('Support ticket not found');
    }
    log.info({ userId, ticketId }, 'Learner added support ticket message');
    return message;
  }

  static async closeSupportTicket(userId, ticketId, payload = {}) {
    const ticket = await LearnerSupportRepository.closeCase(userId, ticketId, {
      resolutionNote: payload.resolutionNote ?? payload.note ?? null,
      satisfaction: payload.satisfaction ?? null
    });
    if (!ticket) {
      throw new Error('Support ticket not found');
    }
    log.info({ userId, ticketId }, 'Learner closed support ticket');
    return ticket;
  }
}
