import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('slugify', () => ({
  default: (value) => (value ? String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-') : '')
}));

vi.mock('../src/config/database.js', () => ({
  default: () => {
    throw new Error('unexpected database usage in test environment');
  }
}));

import LiveClassroomModel from '../src/models/LiveClassroomModel.js';

describe('LiveClassroomModel.appendAttendanceCheckpointByPublicId', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('appends attendance checkpoints and updates analytics metadata', async () => {
    const existingMetadata = {
      attendanceCheckpoints: [
        {
          id: 'checkpoint-1',
          type: 'attendance',
          source: 'host',
          userId: 'instructor-1',
          recordedAt: '2025-01-01T00:00:00.000Z'
        },
        {
          id: 'checkpoint-2',
          type: 'attendance',
          source: 'learner',
          userId: 'learner-1',
          recordedAt: '2025-01-01T00:05:00.000Z'
        }
      ],
      attendanceAnalytics: {
        total: 2,
        lastRecordedAt: '2025-01-01T00:05:00.000Z',
        lastRecordedBy: 'learner-1'
      }
    };

    vi.spyOn(LiveClassroomModel, 'findByPublicId').mockResolvedValue({
      id: 42,
      metadata: existingMetadata
    });

    const updates = [];
    const connection = Object.assign(
      (table) => ({
        where: () => ({
          update: async (payload) => {
            updates.push({ table, payload });
            return 1;
          }
        })
      }),
      { fn: { now: () => new Date('2025-01-01T01:00:00.000Z') } }
    );

    const checkpoint = {
      recordedAt: '2025-01-01T00:10:00.000Z',
      userId: 'learner-2',
      source: 'learner'
    };

    const result = await LiveClassroomModel.appendAttendanceCheckpointByPublicId(
      'public-1',
      checkpoint,
      connection
    );

    expect(LiveClassroomModel.findByPublicId).toHaveBeenCalledWith('public-1', connection);
    expect(result.attendanceCheckpoints).toHaveLength(3);
    expect(result.attendanceAnalytics).toMatchObject({
      total: 3,
      lastRecordedBy: 'learner-2',
      lastRecordedAt: '2025-01-01T00:10:00.000Z'
    });

    expect(updates).toHaveLength(1);
    const storedMetadata = JSON.parse(updates[0].payload.metadata);
    expect(storedMetadata.attendanceCheckpoints).toHaveLength(3);
    expect(storedMetadata.attendanceAnalytics.total).toBe(3);
    expect(storedMetadata.attendanceAnalytics.lastRecordedBy).toBe('learner-2');
    expect(updates[0].payload.updated_at.toISOString()).toBe('2025-01-01T01:00:00.000Z');
  });

  it('returns null when classroom cannot be found', async () => {
    vi.spyOn(LiveClassroomModel, 'findByPublicId').mockResolvedValue(null);

    const connection = Object.assign(
      () => ({
        where: () => ({
          update: async () => {
            throw new Error('should not update when classroom missing');
          }
        })
      }),
      { fn: { now: () => new Date() } }
    );

    const result = await LiveClassroomModel.appendAttendanceCheckpointByPublicId(
      'missing',
      {},
      connection
    );

    expect(result).toBeNull();
  });
});
