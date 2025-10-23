import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  db: {
    transaction: vi.fn(async (handler) => handler({ fn: { now: () => new Date().toISOString() } }))
  },
  liveClassroomModel: {
    findByIdentifier: vi.fn(),
    appendAttendanceCheckpoint: vi.fn()
  },
  liveClassroomRegistrationModel: {
    registerOrUpdate: vi.fn()
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../src/config/database.js', () => ({
  default: mocks.db
}));

vi.mock('../src/models/LiveClassroomModel.js', () => ({
  default: mocks.liveClassroomModel
}));

vi.mock('../src/models/LiveClassroomRegistrationModel.js', () => ({
  default: mocks.liveClassroomRegistrationModel
}));

vi.mock('../src/config/logger.js', () => ({
  default: { child: () => mocks.logger }
}));

const { db, liveClassroomModel, liveClassroomRegistrationModel, logger } = mocks;

import LearnerDashboardService from '../src/services/LearnerDashboardService.js';

describe('LearnerDashboardService live classroom attendance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.transaction.mockImplementation(async (handler) => handler({ fn: { now: () => new Date().toISOString() } }));
  });

  it('records join checkpoints with normalised streaming preferences', async () => {
    liveClassroomModel.findByIdentifier.mockResolvedValue({ id: 42, publicId: 'lc-42' });

    const acknowledgement = await LearnerDashboardService.joinLiveSession(7, 'lc-42', {
      quality: 'LOW',
      bandwidthCapKbps: 600,
      device: 'mobile'
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(liveClassroomRegistrationModel.registerOrUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        classroomId: 42,
        userId: 7,
        status: 'registered',
        metadata: expect.objectContaining({
          streaming: expect.objectContaining({ quality: 'low', bandwidthCapKbps: 600, device: 'mobile' })
        }),
        checkpoint: expect.objectContaining({ type: 'join', quality: 'low' })
      }),
      expect.anything()
    );
    expect(liveClassroomModel.appendAttendanceCheckpoint).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ type: 'join', quality: 'low', bandwidthCapKbps: 600 }),
      expect.anything()
    );
    expect(acknowledgement.meta).toEqual(
      expect.objectContaining({ quality: 'low', bandwidthCapKbps: 600, device: 'mobile' })
    );
  });

  it('records check-in telemetry with network diagnostics', async () => {
    liveClassroomModel.findByIdentifier.mockResolvedValue({ id: 55, publicId: 'lc-55' });

    const acknowledgement = await LearnerDashboardService.checkInToLiveSession(11, 'lc-55', {
      latencyMs: 420,
      downlinkKbps: 1200,
      device: 'desktop'
    });

    expect(liveClassroomRegistrationModel.registerOrUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        classroomId: 55,
        userId: 11,
        status: 'attended',
        metadata: expect.objectContaining({
          streaming: expect.objectContaining({ latencyMs: 420, downlinkKbps: 1200, device: 'desktop' })
        }),
        checkpoint: expect.objectContaining({ type: 'check-in', latencyMs: 420, downlinkKbps: 1200 })
      }),
      expect.anything()
    );
    expect(liveClassroomModel.appendAttendanceCheckpoint).toHaveBeenCalledWith(
      55,
      expect.objectContaining({ type: 'check-in', latencyMs: 420, downlinkKbps: 1200 }),
      expect.anything()
    );
    expect(acknowledgement.reference).toMatch(/^checkin_/);
    expect(acknowledgement.meta).toEqual(
      expect.objectContaining({ quality: 'standard', latencyMs: 420, downlinkKbps: 1200, device: 'desktop' })
    );
  });

  it('throws a 404 error when the classroom identifier cannot be resolved', async () => {
    liveClassroomModel.findByIdentifier.mockResolvedValue(null);

    await expect(LearnerDashboardService.joinLiveSession(3, 'missing', {})).rejects.toMatchObject({ status: 404 });
    expect(liveClassroomRegistrationModel.registerOrUpdate).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

