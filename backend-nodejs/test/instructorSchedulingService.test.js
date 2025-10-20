import { afterEach, describe, expect, it, vi } from 'vitest';

import InstructorSchedulingService from '../src/services/InstructorSchedulingService.js';

const tutorProfileModelMock = vi.hoisted(() => ({
  findByUserId: vi.fn()
}));

const slotModelMock = vi.hoisted(() => ({
  listByTutorId: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn()
}));

vi.mock('../src/models/TutorProfileModel.js', () => ({
  default: tutorProfileModelMock
}));

vi.mock('../src/models/TutorAvailabilitySlotModel.js', () => ({
  default: slotModelMock
}));

vi.mock('../src/config/database.js', () => ({
  default: {
    transaction: async (handler) => handler({})
  }
}));

describe('InstructorSchedulingService', () => {
  afterEach(() => {
    Object.values(tutorProfileModelMock).forEach((fn) => fn.mockReset());
    Object.values(slotModelMock).forEach((fn) => fn.mockReset());
  });

  it('lists roster entries with pagination metadata', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 42 });
    slotModelMock.listByTutorId.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => ({ id: index + 1, tutorId: 42 }))
    );

    const result = await InstructorSchedulingService.listRoster(9, { page: 1, perPage: 2 });
    expect(slotModelMock.listByTutorId).toHaveBeenCalledWith(42, { status: undefined, from: undefined, to: undefined }, expect.anything());
    expect(result.items).toHaveLength(2);
    expect(result.pagination).toMatchObject({ total: 5, totalPages: 3, page: 1, perPage: 2 });
  });

  it('creates a roster entry with generated metadata reference', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 7 });
    slotModelMock.create.mockImplementation(async (payload) => ({ id: 1, ...payload }));

    const created = await InstructorSchedulingService.createSlot(3, {
      startAt: '2024-11-01T10:00:00Z',
      endAt: '2024-11-01T11:00:00Z',
      status: 'open'
    });

    expect(slotModelMock.create).toHaveBeenCalled();
    expect(created.metadata.reference).toBeDefined();
  });

  it('throws when updating a slot that does not belong to instructor', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 10 });
    slotModelMock.findById.mockResolvedValue({ id: 5, tutorId: 99 });

    await expect(
      InstructorSchedulingService.updateSlot(8, 5, { status: 'held' })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('deletes a roster slot when owned by instructor', async () => {
    tutorProfileModelMock.findByUserId.mockResolvedValue({ id: 11 });
    slotModelMock.findById.mockResolvedValue({ id: 6, tutorId: 11 });

    await InstructorSchedulingService.deleteSlot(2, 6);
    expect(slotModelMock.deleteById).toHaveBeenCalledWith(6, expect.anything());
  });
});
