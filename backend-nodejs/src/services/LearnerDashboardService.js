import crypto from 'crypto';

import db from '../config/database.js';
import logger from '../config/logger.js';
import TutorBookingModel from '../models/TutorBookingModel.js';
import TutorProfileModel from '../models/TutorProfileModel.js';
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

function parseDate(value, fallback) {
  if (!value) {
    return fallback instanceof Date ? fallback : new Date(fallback ?? Date.now());
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback instanceof Date ? fallback : new Date(fallback ?? Date.now());
  }

  return date;
}

function normaliseDurationMinutes(value, fallback = 60) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 15 && numeric <= 600) {
    return Math.round(numeric);
  }
  return fallback;
}

function formatBookingAcknowledgement(booking, message, overrides = {}) {
  return buildAcknowledgement({
    reference: booking.publicId,
    message,
    meta: {
      status: booking.status,
      scheduledStart: booking.scheduledStart?.toISOString?.() ?? null,
      scheduledEnd: booking.scheduledEnd?.toISOString?.() ?? null,
      durationMinutes: booking.durationMinutes ?? null,
      tutorId: booking.tutorId,
      topic: booking.metadata?.topic ?? null,
      timezone: booking.metadata?.timezone ?? null,
      ...overrides
    }
  });
}

export default class LearnerDashboardService {
  static async createTutorBookingRequest(userId, payload = {}) {
    if (!userId) {
      const error = new Error('Authentication required to create a tutor booking');
      error.status = 401;
      throw error;
    }

    const tutorId = Number(payload.tutorId ?? payload.profileId ?? payload.tutorProfileId);
    if (!Number.isInteger(tutorId) || tutorId <= 0) {
      const error = new Error('A valid tutor identifier is required');
      error.status = 422;
      throw error;
    }

    const tutorProfile = await TutorProfileModel.findById(tutorId, db);
    if (!tutorProfile) {
      const error = new Error('Tutor profile not found');
      error.status = 404;
      throw error;
    }

    const now = new Date();
    const defaultDuration = normaliseDurationMinutes(
      payload.durationMinutes,
      tutorProfile.metadata?.defaultSessionMinutes ?? 60
    );
    const scheduledStart = parseDate(
      payload.scheduledStart ?? payload.preferredStart,
      now.getTime() + 60 * 60 * 1000
    );
    const scheduledEnd = parseDate(
      payload.scheduledEnd,
      scheduledStart.getTime() + defaultDuration * 60 * 1000
    );

    const hourlyRateAmount = Number.isFinite(Number(payload.hourlyRateAmount))
      ? Number(payload.hourlyRateAmount)
      : tutorProfile.hourlyRateAmount ?? 0;

    const metadata = {
      ...(tutorProfile.metadata ?? {}),
      topic: payload.topic ?? tutorProfile.metadata?.primaryFocus ?? 'Mentorship session',
      message: payload.message ?? null,
      source: 'learner-dashboard',
      timezone: payload.timezone ?? payload.timeZone ?? tutorProfile.metadata?.timezone ?? null
    };

    const booking = await TutorBookingModel.create(
      {
        publicId: crypto.randomUUID(),
        tutorId,
        learnerId: userId,
        scheduledStart,
        scheduledEnd,
        durationMinutes: defaultDuration,
        hourlyRateAmount,
        hourlyRateCurrency: payload.hourlyRateCurrency ?? tutorProfile.hourlyRateCurrency ?? 'USD',
        status: 'requested',
        metadata
      },
      db
    );

    log.info({ userId, tutorId, bookingId: booking.publicId }, 'Learner requested new tutor booking');
    return formatBookingAcknowledgement(booking, 'Tutor booking request submitted');
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

  static async listTutorBookings(userId) {
    if (!userId) {
      return [];
    }
    const bookings = await TutorBookingModel.listByLearnerId(userId, { limit: 100 }, db);
    return bookings;
  }

  static async updateTutorBooking(userId, bookingPublicId, payload = {}) {
    if (!userId) {
      const error = new Error('Authentication required to update a tutor booking');
      error.status = 401;
      throw error;
    }
    if (!bookingPublicId) {
      const error = new Error('A booking reference is required');
      error.status = 422;
      throw error;
    }

    const booking = await TutorBookingModel.findByPublicId(bookingPublicId, db);
    if (!booking || booking.learnerId !== userId) {
      const error = new Error('Tutor booking not found');
      error.status = 404;
      throw error;
    }

    if (booking.status === 'completed' || booking.status === 'cancelled') {
      const error = new Error('Completed or cancelled bookings cannot be modified');
      error.status = 409;
      throw error;
    }

    const updates = {};
    let metadata = { ...(booking.metadata ?? {}) };

    if (payload.topic !== undefined) {
      metadata = { ...metadata, topic: payload.topic || null };
    }
    if (payload.message !== undefined) {
      metadata = { ...metadata, message: payload.message || null };
    }
    if (payload.timezone !== undefined || payload.timeZone !== undefined) {
      metadata = { ...metadata, timezone: payload.timezone ?? payload.timeZone ?? null };
    }

    if (payload.scheduledStart || payload.scheduledEnd || payload.durationMinutes) {
      const duration = normaliseDurationMinutes(payload.durationMinutes ?? booking.durationMinutes);
      const scheduledStart = parseDate(payload.scheduledStart, booking.scheduledStart ?? new Date());
      const scheduledEnd = parseDate(
        payload.scheduledEnd,
        scheduledStart.getTime() + duration * 60 * 1000
      );
      updates.scheduledStart = scheduledStart;
      updates.scheduledEnd = scheduledEnd;
      updates.durationMinutes = duration;
    }

    if (payload.hourlyRateAmount !== undefined) {
      updates.hourlyRateAmount = Number(payload.hourlyRateAmount);
    }

    if (payload.hourlyRateCurrency !== undefined) {
      updates.hourlyRateCurrency = payload.hourlyRateCurrency;
    }

    if (payload.status && ['requested', 'confirmed', 'completed'].includes(payload.status)) {
      updates.status = payload.status;
      if (payload.status === 'confirmed' && !booking.confirmedAt) {
        updates.confirmedAt = new Date();
      }
      if (payload.status === 'completed' && !booking.completedAt) {
        updates.completedAt = new Date();
      }
    }

    updates.metadata = metadata;

    const updated = await TutorBookingModel.updateByPublicId(bookingPublicId, updates, db);
    log.info({ userId, bookingId: bookingPublicId }, 'Learner updated tutor booking');
    return formatBookingAcknowledgement(updated, 'Tutor booking updated');
  }

  static async cancelTutorBooking(userId, bookingPublicId, payload = {}) {
    if (!userId) {
      const error = new Error('Authentication required to cancel a tutor booking');
      error.status = 401;
      throw error;
    }
    if (!bookingPublicId) {
      const error = new Error('A booking reference is required');
      error.status = 422;
      throw error;
    }

    const booking = await TutorBookingModel.findByPublicId(bookingPublicId, db);
    if (!booking || booking.learnerId !== userId) {
      const error = new Error('Tutor booking not found');
      error.status = 404;
      throw error;
    }

    if (booking.status === 'cancelled') {
      return formatBookingAcknowledgement(booking, 'Tutor booking already cancelled');
    }

    const metadata = {
      ...(booking.metadata ?? {}),
      cancellationReason: payload.reason ?? payload.cancellationReason ?? null,
      cancellationNotes: payload.notes ?? payload.note ?? null,
      cancelledByLearner: true
    };

    const cancelled = await TutorBookingModel.updateByPublicId(
      bookingPublicId,
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        metadata
      },
      db
    );

    log.info({ userId, bookingId: bookingPublicId }, 'Learner cancelled tutor booking');
    return formatBookingAcknowledgement(cancelled, 'Tutor booking cancelled');
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
