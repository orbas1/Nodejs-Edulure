import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';

import db from '../config/database.js';
import TutorBookingModel from '../models/TutorBookingModel.js';
import TutorProfileModel from '../models/TutorProfileModel.js';
import UserModel from '../models/UserModel.js';

function toMinorUnits(amount) {
  if (amount === null || amount === undefined) return 0;
  const numeric = typeof amount === 'string' ? Number.parseFloat(amount) : Number(amount);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

function normaliseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildPagination(page, perPage, total) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  return { page, perPage, total, totalPages };
}

function humaniseStatus(status) {
  switch (status) {
    case 'confirmed':
    case 'completed':
    case 'cancelled':
    case 'requested':
      return status;
    default:
      return 'requested';
  }
}

async function resolveLearnerId({ email, firstName, lastName }, connection) {
  if (!email) {
    const error = new Error('Learner email is required');
    error.status = 422;
    throw error;
  }
  const normalisedEmail = email.trim().toLowerCase();
  const existing = await UserModel.forUpdateByEmail(normalisedEmail, connection);
  if (existing) {
    if (firstName || lastName) {
      await UserModel.updateById(existing.id, { firstName, lastName }, connection);
    }
    return existing.id;
  }
  const passwordHash = await bcrypt.hash(crypto.randomBytes(12).toString('hex'), 10);
  const created = await UserModel.create(
    {
      email: normalisedEmail,
      firstName: firstName ?? normalisedEmail.split('@')[0],
      lastName: lastName ?? null,
      passwordHash,
      role: 'learner'
    },
    connection
  );
  return created.id;
}

export default class InstructorBookingService {
  static async resolveTutorProfile(instructorUserId, connection = db) {
    const profile = await TutorProfileModel.findByUserId(instructorUserId, connection);
    if (!profile) {
      const error = new Error('Tutor profile not found for instructor');
      error.status = 404;
      throw error;
    }
    return profile;
  }

  static async listBookings(instructorUserId, { page = 1, perPage = 25, status, search } = {}) {
    await this.resolveTutorProfile(instructorUserId);
    const offset = (page - 1) * perPage;

    const [items, total, summary] = await Promise.all([
      TutorBookingModel.listForInstructor(instructorUserId, { status, search, limit: perPage, offset }),
      TutorBookingModel.countForInstructor(instructorUserId, { status, search }),
      TutorBookingModel.listForInstructor(instructorUserId, {
        status: status ?? 'all',
        search,
        limit: null,
        offset: 0
      })
    ]);

    const stats = summary.reduce(
      (acc, booking) => {
        acc.total += 1;
        const bookingStatus = humaniseStatus(booking.status);
        if (bookingStatus === 'confirmed' || bookingStatus === 'requested') {
          acc.upcoming += 1;
        } else if (bookingStatus === 'completed') {
          acc.completed += 1;
        } else if (bookingStatus === 'cancelled') {
          acc.cancelled += 1;
        }
        return acc;
      },
      { total: 0, upcoming: 0, completed: 0, cancelled: 0 }
    );

    return {
      items,
      pagination: buildPagination(page, perPage, total),
      stats: {
        total: stats.total,
        upcoming: stats.upcoming,
        completed: stats.completed,
        cancelled: stats.cancelled
      }
    };
  }

  static async createBooking(instructorUserId, payload = {}) {
    return db.transaction(async (trx) => {
      const tutorProfile = await this.resolveTutorProfile(instructorUserId, trx);
      const scheduledStart = normaliseDate(payload.scheduledStart);
      const scheduledEnd = normaliseDate(payload.scheduledEnd);

      if (!scheduledStart || !scheduledEnd || scheduledEnd <= scheduledStart) {
        const error = new Error('Valid scheduled start and end times are required');
        error.status = 422;
        throw error;
      }

      const learnerId = await resolveLearnerId(
        {
          email: payload.learnerEmail,
          firstName: payload.learnerFirstName,
          lastName: payload.learnerLastName
        },
        trx
      );

      const durationMinutes = payload.durationMinutes ?? Math.round((scheduledEnd - scheduledStart) / (60 * 1000));
      const normalisedStatus = humaniseStatus(payload.status ?? 'confirmed');

      const bookingPayload = {
        publicId: crypto.randomUUID(),
        tutorId: tutorProfile.id,
        learnerId,
        scheduledStart,
        scheduledEnd,
        durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : 60,
        hourlyRateAmount: toMinorUnits(payload.hourlyRateAmount),
        hourlyRateCurrency: payload.hourlyRateCurrency ?? tutorProfile.hourlyRateCurrency ?? 'USD',
        meetingUrl: payload.meetingUrl ?? null,
        status: normalisedStatus,
        requestedAt: new Date(),
        confirmedAt: normalisedStatus === 'confirmed' ? new Date() : null,
        metadata: {
          topic: payload.topic ?? 'Mentorship session',
          notes: payload.notes ?? null,
          source: payload.source ?? 'instructor-dashboard'
        }
      };

      return TutorBookingModel.create(bookingPayload, trx);
    });
  }

  static async updateBooking(instructorUserId, bookingPublicId, updates = {}) {
    return db.transaction(async (trx) => {
      const tutorProfile = await this.resolveTutorProfile(instructorUserId, trx);
      const booking = await TutorBookingModel.findByPublicId(bookingPublicId, trx);
      if (!booking || booking.tutorProfile?.id !== tutorProfile.id) {
        const error = new Error('Booking not found');
        error.status = 404;
        throw error;
      }

      const nextUpdates = { ...updates };
      if (nextUpdates.scheduledStart !== undefined) {
        const start = normaliseDate(nextUpdates.scheduledStart);
        if (!start) {
          const error = new Error('Invalid start time');
          error.status = 422;
          throw error;
        }
        nextUpdates.scheduledStart = start;
      }
      if (nextUpdates.scheduledEnd !== undefined) {
        const end = normaliseDate(nextUpdates.scheduledEnd);
        if (!end) {
          const error = new Error('Invalid end time');
          error.status = 422;
          throw error;
        }
        nextUpdates.scheduledEnd = end;
      }
      if (nextUpdates.status !== undefined) {
        nextUpdates.status = humaniseStatus(nextUpdates.status);
        if (nextUpdates.status === 'confirmed') {
          nextUpdates.confirmedAt = new Date();
        }
        if (nextUpdates.status === 'cancelled') {
          nextUpdates.cancelledAt = new Date();
        }
        if (nextUpdates.status === 'completed') {
          nextUpdates.completedAt = new Date();
        }
      }

      if (nextUpdates.hourlyRateAmount !== undefined) {
        nextUpdates.hourlyRateAmount = toMinorUnits(nextUpdates.hourlyRateAmount);
      }

      if (nextUpdates.metadata) {
        nextUpdates.metadata = { ...booking.metadata, ...nextUpdates.metadata };
      }

      return TutorBookingModel.updateByPublicId(bookingPublicId, nextUpdates, trx);
    });
  }

  static async cancelBooking(instructorUserId, bookingPublicId, options = {}) {
    return db.transaction(async (trx) => {
      const tutorProfile = await this.resolveTutorProfile(instructorUserId, trx);
      const booking = await TutorBookingModel.findByPublicId(bookingPublicId, trx);
      if (!booking || booking.tutorProfile?.id !== tutorProfile.id) {
        const error = new Error('Booking not found');
        error.status = 404;
        throw error;
      }

      if (options.hardDelete) {
        await TutorBookingModel.deleteByPublicId(bookingPublicId, trx);
        return null;
      }

      return TutorBookingModel.updateByPublicId(
        bookingPublicId,
        {
          status: 'cancelled',
          cancelledAt: new Date(),
          metadata: { ...booking.metadata, cancellationReason: options.reason ?? 'Cancelled by instructor' }
        },
        trx
      );
    });
  }
}
