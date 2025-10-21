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
    const now = new Date('2024-11-01T10:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    tutorBookingModelMock.listForInstructor
      .mockResolvedValueOnce([
        {
          publicId: 'a',
          status: 'confirmed',
          scheduledStart: new Date('2024-11-02T10:00:00Z'),
          scheduledEnd: new Date('2024-11-02T11:00:00Z'),
          durationMinutes: 60,
          hourlyRateAmount: 6000
        },
        {
          publicId: 'b',
          status: 'completed',
          scheduledStart: new Date('2024-10-25T10:00:00Z'),
          scheduledEnd: new Date('2024-10-25T11:00:00Z'),
          durationMinutes: 60,
          hourlyRateAmount: 6000
        }
      ])
      .mockResolvedValueOnce([
        {
          publicId: 'a',
          status: 'confirmed',
          scheduledStart: new Date('2024-11-02T10:00:00Z'),
          scheduledEnd: new Date('2024-11-02T11:00:00Z'),
          durationMinutes: 60,
          hourlyRateAmount: 6000
        },
        {
          publicId: 'b',
          status: 'completed',
          scheduledStart: new Date('2024-10-25T10:00:00Z'),
          scheduledEnd: new Date('2024-10-25T11:00:00Z'),
          durationMinutes: 60,
          hourlyRateAmount: 6000
        },
        {
          publicId: 'c',
          status: 'cancelled',
          scheduledStart: new Date('2024-10-28T10:00:00Z'),
          scheduledEnd: new Date('2024-10-28T11:00:00Z'),
          durationMinutes: 60,
          hourlyRateAmount: 6000
        }
      ]);
    tutorBookingModelMock.countForInstructor.mockResolvedValue(2);

    const result = await InstructorBookingService.listBookings(5, { page: 1, perPage: 10 });
    expect(result.items).toHaveLength(2);
    expect(result.stats).toMatchObject({
      total: 3,
      upcoming: 1,
      inProgress: 0,
      completed: 1,
      cancelled: 1,
      revenueMinor: 12000
    });
  });

  it('creates a booking for an existing learner', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 7, hourlyRateCurrency: 'USD' });
    userModelMock.forUpdateByEmail.mockResolvedValue({ id: 55 });
    tutorBookingModelMock.create.mockImplementation(async (payload) => ({ ...payload, id: 10 }));
    tutorBookingModelMock.findConflictingBookings.mockResolvedValue([]);

    const created = await InstructorBookingService.createBooking(3, {
      learnerEmail: 'learner@example.com',
      scheduledStart: '2024-11-05T15:00:00Z',
      scheduledEnd: '2024-11-05T16:00:00Z'
    });

    expect(userModelMock.create).not.toHaveBeenCalled();
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

    expect(userModelMock.create).toHaveBeenCalled();
    expect(tutorBookingModelMock.create).toHaveBeenCalled();
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

  it('prevents schedule conflicts when updating a booking', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 9 });
    tutorBookingModelMock.findByPublicId.mockResolvedValue({
      tutorProfile: { id: 9 },
      metadata: {},
      scheduledStart: new Date('2024-11-05T15:00:00Z'),
      scheduledEnd: new Date('2024-11-05T16:00:00Z')
    });
    tutorBookingModelMock.findConflictingBookings.mockResolvedValue([{ publicId: 'other' }]);

    await expect(
      InstructorBookingService.updateBooking(4, 'abc', {
        scheduledStart: '2024-11-05T15:30:00Z',
        scheduledEnd: '2024-11-05T16:30:00Z'
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('cancels a booking with a soft delete', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 9 });
    tutorBookingModelMock.findByPublicId.mockResolvedValue({ tutorProfile: { id: 9 }, metadata: {} });
    tutorBookingModelMock.updateByPublicId.mockResolvedValue({ publicId: 'abc', status: 'cancelled' });

    const result = await InstructorBookingService.cancelBooking(4, 'abc');
    expect(result.status).toBe('cancelled');
    expect(tutorBookingModelMock.deleteByPublicId).not.toHaveBeenCalled();
  });
});
