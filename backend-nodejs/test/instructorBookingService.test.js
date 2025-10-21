import { afterEach, describe, expect, it, vi } from 'vitest';

import InstructorBookingService from '../src/services/InstructorBookingService.js';

const tutorProfileModelMock = vi.hoisted(() => ({
  findByUserId: vi.fn()
}));

const tutorBookingModelMock = vi.hoisted(() => ({
  listForInstructor: vi.fn(),
  countForInstructor: vi.fn(),
  create: vi.fn(),
  findByPublicId: vi.fn(),
  updateByPublicId: vi.fn(),
  deleteByPublicId: vi.fn(),
  findConflictingBookings: vi.fn()
}));

const userModelMock = vi.hoisted(() => ({
  forUpdateByEmail: vi.fn(),
  updateById: vi.fn(),
  create: vi.fn()
}));

vi.mock('../src/models/TutorProfileModel.js', () => ({
  default: tutorProfileModelMock
}));

vi.mock('../src/models/TutorBookingModel.js', () => ({
  default: tutorBookingModelMock
}));

vi.mock('../src/models/UserModel.js', () => ({
  default: userModelMock
}));

vi.mock('../src/config/database.js', () => ({
  default: {
    transaction: async (handler) => handler({})
  }
}));

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(async () => 'hashed-password') }
}));

describe('InstructorBookingService', () => {
  afterEach(() => {
    Object.values(tutorProfileModelMock).forEach((fn) => fn.mockReset());
    Object.values(tutorBookingModelMock).forEach((fn) => fn.mockReset());
    Object.values(userModelMock).forEach((fn) => fn.mockReset());
    vi.useRealTimers();
  });

  it('lists bookings with aggregated stats', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 21, hourlyRateCurrency: 'USD' });
    tutorBookingModelMock.listForInstructor.mockResolvedValue([
      { publicId: 'a', status: 'confirmed' },
      { publicId: 'b', status: 'completed' }
    ]);

    tutorBookingModelMock.countForInstructor.mockImplementation(async (_instructorId, filters = {}) => {
      switch (filters.status) {
        case 'all':
          return 3;
        case 'confirmed':
          return 1;
        case 'requested':
          return 0;
        case 'completed':
          return 1;
        case 'cancelled':
          return 1;
        default:
          return 2;
      }
    });

    const result = await InstructorBookingService.listBookings(5, { page: 1, perPage: 10 });

    expect(tutorBookingModelMock.listForInstructor).toHaveBeenCalledWith(5, {
      limit: 10,
      offset: 0,
      search: undefined,
      status: undefined
    });

    expect(result.items).toHaveLength(2);
    expect(result.pagination).toEqual({ page: 1, perPage: 10, total: 2, totalPages: 1 });
    expect(result.stats).toMatchObject({ total: 3, upcoming: 1, completed: 1, cancelled: 1 });
  });

  it('creates a booking for an existing learner', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 7, hourlyRateCurrency: 'USD' });
    userModelMock.forUpdateByEmail.mockResolvedValue({ id: 55 });
    userModelMock.updateById.mockResolvedValue({ id: 55 });
    tutorBookingModelMock.create.mockImplementation(async (payload) => ({ ...payload, id: 10 }));
    tutorBookingModelMock.findConflictingBookings.mockResolvedValue([]);

    const created = await InstructorBookingService.createBooking(3, {
      learnerEmail: 'learner@example.com',
      scheduledStart: '2024-11-05T15:00:00Z',
      scheduledEnd: '2024-11-05T16:00:00Z'
    });

    expect(userModelMock.create).not.toHaveBeenCalled();
    expect(userModelMock.updateById).not.toHaveBeenCalled();
    expect(created.tutorId).toBe(7);
    expect(created.status).toBeDefined();
  });

  it('creates a booking and provisions a new learner account', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 7, hourlyRateCurrency: 'USD' });
    userModelMock.forUpdateByEmail.mockResolvedValue(null);
    userModelMock.create.mockResolvedValue({ id: 88 });
    tutorBookingModelMock.create.mockImplementation(async (payload) => ({ ...payload, id: 11 }));
    tutorBookingModelMock.findConflictingBookings.mockResolvedValue([]);

    await InstructorBookingService.createBooking(3, {
      learnerEmail: 'new@example.com',
      learnerFirstName: 'New',
      scheduledStart: '2024-11-05T15:00:00Z',
      scheduledEnd: '2024-11-05T16:30:00Z',
      hourlyRateAmount: 120
    });

    expect(userModelMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        role: 'learner',
        passwordHash: 'hashed-password'
      }),
      expect.any(Object)
    );

    const [bookingPayload] = tutorBookingModelMock.create.mock.calls[0];
    expect(bookingPayload).toMatchObject({
      tutorId: 7,
      learnerId: 88,
      status: 'confirmed',
      durationMinutes: 90,
      hourlyRateAmount: 12000,
      hourlyRateCurrency: 'USD'
    });
    expect(bookingPayload.metadata).toMatchObject({
      topic: 'Mentorship session',
      source: 'instructor-dashboard'
    });
    expect(bookingPayload.publicId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('updates existing learner profile data when provided on booking creation', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 12, hourlyRateCurrency: 'GBP' });
    userModelMock.forUpdateByEmail.mockResolvedValue({ id: 455, firstName: 'Old' });
    userModelMock.updateById.mockResolvedValue({ id: 455 });
    tutorBookingModelMock.create.mockImplementation(async (payload) => ({ ...payload, id: 22 }));

    await InstructorBookingService.createBooking(12, {
      learnerEmail: 'Returning@Example.com',
      learnerFirstName: 'Returning',
      learnerLastName: 'Learner',
      scheduledStart: '2024-12-10T09:00:00Z',
      scheduledEnd: '2024-12-10T10:00:00Z',
      hourlyRateAmount: '75.50'
    });

    expect(userModelMock.updateById).toHaveBeenCalledWith(
      455,
      { firstName: 'Returning', lastName: 'Learner' },
      expect.any(Object)
    );
    const [bookingPayload] = tutorBookingModelMock.create.mock.calls[0];
    expect(bookingPayload.hourlyRateAmount).toBe(7550);
    expect(bookingPayload.hourlyRateCurrency).toBe('GBP');
  });

  it('throws when a tutor profile cannot be resolved for the instructor', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue(null);

    await expect(
      InstructorBookingService.createBooking(1, {
        learnerEmail: 'missing-profile@example.com',
        scheduledStart: '2024-10-01T10:00:00Z',
        scheduledEnd: '2024-10-01T11:00:00Z'
      })
    ).rejects.toMatchObject({ status: 404 });

    expect(tutorBookingModelMock.create).not.toHaveBeenCalled();
  });

  it('validates booking times and rejects invalid schedules', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 7, hourlyRateCurrency: 'USD' });

    await expect(
      InstructorBookingService.createBooking(3, {
        learnerEmail: 'timing@example.com',
        scheduledStart: '2024-11-05T15:00:00Z',
        scheduledEnd: '2024-11-05T14:00:00Z'
      })
    ).rejects.toMatchObject({ status: 422 });

    expect(tutorBookingModelMock.create).not.toHaveBeenCalled();
  });

  it('prevents creating bookings that conflict with existing ones', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 4, hourlyRateCurrency: 'USD' });
    userModelMock.forUpdateByEmail.mockResolvedValue({ id: 12 });
    tutorBookingModelMock.findConflictingBookings.mockResolvedValue([{ publicId: 'existing' }]);

    await expect(
      InstructorBookingService.createBooking(9, {
        learnerEmail: 'conflict@example.com',
        scheduledStart: '2024-11-05T15:00:00Z',
        scheduledEnd: '2024-11-05T16:00:00Z'
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('prevents updates for bookings owned by other tutors', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 9 });
    tutorBookingModelMock.findByPublicId.mockResolvedValue({ tutorProfile: { id: 1 } });

    await expect(
      InstructorBookingService.updateBooking(4, 'booking-1', { status: 'confirmed' })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('updates bookings with merged metadata and timeline enforcement', async () => {
    const existingMetadata = { topic: 'Initial session', attachments: ['doc-1'] };
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 9 });
    tutorBookingModelMock.findByPublicId.mockResolvedValue({ tutorProfile: { id: 9 }, metadata: existingMetadata });
    tutorBookingModelMock.updateByPublicId.mockImplementation(async (_id, updates) => updates);

    const updates = await InstructorBookingService.updateBooking(4, 'booking-1', {
      scheduledStart: '2024-11-06T10:00:00Z',
      scheduledEnd: '2024-11-06T11:30:00Z',
      status: 'completed',
      hourlyRateAmount: '135.75',
      metadata: { notes: 'Wrap-up coaching call' }
    });

    expect(tutorBookingModelMock.updateByPublicId).toHaveBeenCalledWith(
      'booking-1',
      expect.objectContaining({
        status: 'completed',
        completedAt: expect.any(Date),
        scheduledStart: expect.any(Date),
        scheduledEnd: expect.any(Date),
        hourlyRateAmount: 13575,
        metadata: {
          topic: 'Initial session',
          attachments: ['doc-1'],
          notes: 'Wrap-up coaching call'
        }
      }),
      expect.any(Object)
    );

    expect(updates.status).toBe('completed');
    expect(updates.metadata.notes).toBe('Wrap-up coaching call');
  });

  it('rejects schedule adjustments that are not valid dates', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 12 });
    tutorBookingModelMock.findByPublicId.mockResolvedValue({ tutorProfile: { id: 12 }, metadata: {} });

    await expect(
      InstructorBookingService.updateBooking(12, 'booking-2', { scheduledStart: 'not-a-date' })
    ).rejects.toMatchObject({ status: 422 });

    expect(tutorBookingModelMock.updateByPublicId).not.toHaveBeenCalled();
  });

  it('cancels a booking with a soft delete', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 9 });
    tutorBookingModelMock.findByPublicId.mockResolvedValue({ tutorProfile: { id: 9 }, metadata: { topic: 'Session' } });
    tutorBookingModelMock.updateByPublicId.mockResolvedValue({ publicId: 'abc', status: 'cancelled' });

    const result = await InstructorBookingService.cancelBooking(4, 'abc', { reason: 'Learner request' });
    expect(result.status).toBe('cancelled');
    expect(tutorBookingModelMock.deleteByPublicId).not.toHaveBeenCalled();
    expect(tutorBookingModelMock.updateByPublicId).toHaveBeenCalledWith(
      'abc',
      expect.objectContaining({
        status: 'cancelled',
        metadata: expect.objectContaining({
          topic: 'Session',
          cancellationReason: 'Learner request'
        })
      }),
      expect.any(Object)
    );
  });

  it('supports hard delete cancellation when requested', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 5 });
    tutorBookingModelMock.findByPublicId.mockResolvedValue({ tutorProfile: { id: 5 }, metadata: {} });
    tutorBookingModelMock.deleteByPublicId.mockResolvedValue(1);

    const outcome = await InstructorBookingService.cancelBooking(5, 'to-delete', { hardDelete: true });

    expect(outcome).toBeNull();
    expect(tutorBookingModelMock.deleteByPublicId).toHaveBeenCalledWith('to-delete', expect.any(Object));
    expect(tutorBookingModelMock.updateByPublicId).not.toHaveBeenCalled();
  });
});
