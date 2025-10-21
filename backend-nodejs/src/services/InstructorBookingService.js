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

function sanitisePagination(page, perPage) {
  const numericPage = Number.parseInt(page, 10);
  const numericPerPage = Number.parseInt(perPage, 10);
  const safePage = Number.isFinite(numericPage) && numericPage > 0 ? numericPage : 1;
  const safePerPage = Number.isFinite(numericPerPage) && numericPerPage > 0 ? numericPerPage : 25;
  return {
    page: safePage,
    perPage: Math.min(100, safePerPage)
  };
}

function buildPagination(page, perPage, total) {
  const { page: safePage, perPage: safePerPage } = sanitisePagination(page, perPage);
  const totalPages = Math.max(1, Math.ceil(total / safePerPage));
  return { page: safePage, perPage: safePerPage, total, totalPages };
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

async function ensureNoScheduleConflicts(tutorId, start, end, connection, options = {}) {
  if (!tutorId || !start || !end) return;
  const conflicts =
    (await TutorBookingModel.findConflictingBookings(
      tutorId,
      start,
      end,
      { excludePublicId: options.excludePublicId },
      connection
    )) ?? [];
  if (conflicts.length > 0) {
    const error = new Error('Tutor already has a booking in this timeframe');
    error.status = 409;
    error.details = conflicts.map((booking) => booking.publicId);
    throw error;
  }
}

function calculateStats(bookings) {
  const now = new Date();
  return bookings.reduce(
    (acc, booking) => {
      acc.total += 1;
      const status = humaniseStatus(booking.status);
      const start = normaliseDate(booking.scheduledStart);
      const end = normaliseDate(booking.scheduledEnd ?? booking.scheduledStart);
      const effectiveEnd = end ?? start;

      const nonCancelled = status !== 'cancelled';
      if (status === 'cancelled') {
        acc.cancelled += 1;
      }

      if (status === 'completed' || (nonCancelled && effectiveEnd && effectiveEnd < now)) {
        acc.completed += 1;
      } else if (nonCancelled && start && start <= now && effectiveEnd && effectiveEnd >= now) {
        acc.inProgress += 1;
      } else if (nonCancelled && start && start > now) {
        acc.upcoming += 1;
      }

      const durationMinutes = Number.isFinite(booking.durationMinutes)
        ? booking.durationMinutes
        : start && effectiveEnd
          ? Math.max(0, Math.round((effectiveEnd - start) / (60 * 1000)))
          : 0;
      const rateMinor = Number.isFinite(booking.hourlyRateAmount) ? booking.hourlyRateAmount : 0;
      if (nonCancelled && rateMinor > 0 && durationMinutes > 0) {
        acc.earnedMinor += Math.round((rateMinor * durationMinutes) / 60);
      }

      return acc;
    },
    { total: 0, upcoming: 0, inProgress: 0, completed: 0, cancelled: 0, earnedMinor: 0 }
  );
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
    const { page: safePage, perPage: safePerPage } = sanitisePagination(page, perPage);
    const offset = (safePage - 1) * safePerPage;

    const statusKeysForCounts = status
      ? [status]
      : ['all', 'confirmed', 'completed', 'cancelled', 'requested'];

    const [items, summary, statusCounts, filteredCount] = await Promise.all([
      TutorBookingModel.listForInstructor(instructorUserId, {
        status,
        search,
        limit: safePerPage,
        offset
      }),
      TutorBookingModel.listForInstructor(instructorUserId, {
        status: status ?? 'all',
        search,
        limit: null,
        offset: 0
      }),
      Promise.all(
        statusKeysForCounts.map((statusKey) =>
          TutorBookingModel.countForInstructor(instructorUserId, { status: statusKey, search })
        )
      ),
      TutorBookingModel.countForInstructor(instructorUserId, { status, search })
    ]);

    const countMap = statusKeysForCounts.reduce((acc, key, index) => {
      acc[key] = Number(statusCounts[index] ?? 0);
      return acc;
    }, {});

    const total = Number(filteredCount ?? items.length);
    const stats = calculateStats(summary);

    if (countMap.all !== undefined) {
      stats.total = countMap.all;
    }
    if (countMap.confirmed !== undefined) {
      stats.upcoming = countMap.confirmed;
    }
    if (countMap.completed !== undefined) {
      stats.completed = countMap.completed;
    }
    if (countMap.cancelled !== undefined) {
      stats.cancelled = countMap.cancelled;
    }

    return {
      items,
      pagination: buildPagination(safePage, safePerPage, total),
      stats: {
        total: stats.total,
        upcoming: stats.upcoming,
        inProgress: stats.inProgress,
        completed: stats.completed,
        cancelled: stats.cancelled,
        revenueMinor: stats.earnedMinor,
        revenue: Number((stats.earnedMinor / 100).toFixed(2))
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

      if (payload.hourlyRateAmount !== undefined && Number(payload.hourlyRateAmount) < 0) {
        const error = new Error('Hourly rate cannot be negative');
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

      const durationMinutesRaw =
        payload.durationMinutes ?? Math.round((scheduledEnd - scheduledStart) / (60 * 1000));
      const durationMinutes = Number.isFinite(durationMinutesRaw) && durationMinutesRaw > 0 ? durationMinutesRaw : 0;
      if (durationMinutes <= 0) {
        const error = new Error('Duration must be positive');
        error.status = 422;
        throw error;
      }
      const normalisedStatus = humaniseStatus(payload.status ?? 'confirmed');

      await ensureNoScheduleConflicts(tutorProfile.id, scheduledStart, scheduledEnd, trx);

      const bookingPayload = {
        publicId: crypto.randomUUID(),
        tutorId: tutorProfile.id,
        learnerId,
        scheduledStart,
        scheduledEnd,
        durationMinutes,
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
      let candidateStart = booking.scheduledStart;
      let candidateEnd = booking.scheduledEnd;

      if (nextUpdates.scheduledStart !== undefined) {
        const start = normaliseDate(nextUpdates.scheduledStart);
        if (!start) {
          const error = new Error('Invalid start time');
          error.status = 422;
          throw error;
        }
        nextUpdates.scheduledStart = start;
        candidateStart = start;
      }
      if (nextUpdates.scheduledEnd !== undefined) {
        const end = normaliseDate(nextUpdates.scheduledEnd);
        if (!end) {
          const error = new Error('Invalid end time');
          error.status = 422;
          throw error;
        }
        nextUpdates.scheduledEnd = end;
        candidateEnd = end;
      }

      if (candidateStart && candidateEnd && candidateEnd <= candidateStart) {
        const error = new Error('End time must be after start time');
        error.status = 422;
        throw error;
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
        if (Number(nextUpdates.hourlyRateAmount) < 0) {
          const error = new Error('Hourly rate cannot be negative');
          error.status = 422;
          throw error;
        }
        nextUpdates.hourlyRateAmount = toMinorUnits(nextUpdates.hourlyRateAmount);
      }

      if (nextUpdates.metadata) {
        nextUpdates.metadata = { ...booking.metadata, ...nextUpdates.metadata };
      }

      if (candidateStart && candidateEnd) {
        await ensureNoScheduleConflicts(
          tutorProfile.id,
          candidateStart,
          candidateEnd,
          trx,
          { excludePublicId: bookingPublicId }
        );
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
