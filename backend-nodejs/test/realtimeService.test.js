import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('socket.io', () => ({
  Server: vi.fn()
}));

vi.mock('../src/config/env.js', () => ({
  env: {
    app: { corsOrigins: [] },
    isProduction: false
  }
}));

vi.mock('../src/config/jwtKeyStore.js', () => ({
  verifyAccessToken: vi.fn(() => ({ sid: 'session-1', sub: '1', role: 'admin' }))
}));

vi.mock('../src/services/SessionRegistry.js', () => ({
  sessionRegistry: {
    ensureActive: vi.fn(async (sid) => ({ id: sid }))
  }
}));

vi.mock('../src/models/UserModel.js', () => ({
  default: {
    findById: vi.fn(async () => ({ id: 1, firstName: 'Ada', lastName: 'Lovelace', role: 'admin', email: 'ada@example.com' }))
  }
}));

vi.mock('../src/models/DirectMessageParticipantModel.js', () => ({
  default: {
    findParticipant: vi.fn(async () => ({ id: 99, userId: 1 }))
  }
}));

const courseLiveServiceMock = {
  joinCourse: vi.fn(() => ({ participants: [] })),
  leaveCourse: vi.fn(() => ({ participants: [] })),
  postMessage: vi.fn(() => ({ id: 1, body: 'hello' })),
  getPresence: vi.fn(() => ({ participants: [] })),
  reset: vi.fn()
};

vi.mock('../src/services/CourseLiveService.js', () => ({
  default: courseLiveServiceMock
}));

vi.mock('../src/config/corsPolicy.js', () => ({
  createCorsOriginValidator: vi.fn(() => ({
    isOriginAllowed: () => true,
    describe: () => ({})
  }))
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

let realtimeService;

describe('RealtimeService', () => {
  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../src/services/RealtimeService.js');
    realtimeService = module.default;
    realtimeService.activeConnections.clear();
    realtimeService.io = null;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-25T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('summarises active connections across sockets', () => {
    realtimeService.activeConnections.set(1, new Set(['a', 'b']));
    realtimeService.activeConnections.set(2, new Set(['c']));

    const summary = realtimeService.getConnectionSummary();

    expect(summary).toEqual({
      connectedUsers: 2,
      totalConnections: 3,
      generatedAt: '2025-02-25T12:00:00.000Z'
    });
  });

  it('broadcasts thread upserts to each participant channel', () => {
    const emitMock = vi.fn();
    const toMock = vi.fn(() => ({ emit: emitMock }));
    realtimeService.io = { to: toMock };

    realtimeService.broadcastThreadUpsert({ id: 7 }, [{ userId: 4 }, { userId: 9 }]);

    expect(toMock).toHaveBeenCalledWith('user:4');
    expect(toMock).toHaveBeenCalledWith('user:9');
    expect(emitMock).toHaveBeenCalledWith('inbox.thread.upserted', expect.objectContaining({ thread: { id: 7 } }));
  });

  it('broadcasts messages to thread and participant inboxes', () => {
    const threadEmit = vi.fn();
    const userEmit = vi.fn();
    const toMock = vi.fn((room) => ({ emit: room.startsWith('dm:') ? threadEmit : userEmit }));
    realtimeService.io = { to: toMock };

    realtimeService.broadcastMessage(3, { id: 1 }, [{ userId: 4 }, { userId: 6 }]);

    expect(toMock).toHaveBeenCalledWith('dm:3');
    expect(threadEmit).toHaveBeenCalledWith('dm.message.created', expect.objectContaining({ threadId: 3 }));
    expect(userEmit).toHaveBeenCalledWith('inbox.thread.activity', expect.objectContaining({ threadId: 3 }));
  });

  it('broadcasts course presence using live service snapshot', () => {
    const emitMock = vi.fn();
    const toMock = vi.fn(() => ({ emit: emitMock }));
    realtimeService.io = { to: toMock };

    realtimeService.broadcastCoursePresence('course-1');

    expect(courseLiveServiceMock.getPresence).toHaveBeenCalledWith('course-1');
    expect(emitMock).toHaveBeenCalledWith('course.presence', {
      courseId: 'course-1',
      presence: { participants: [] }
    });
  });
});
