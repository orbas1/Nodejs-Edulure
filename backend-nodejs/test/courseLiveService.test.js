import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const randomUUIDMock = vi.hoisted(() => vi.fn(() => 'message-1'));
const loggerDebugSpy = vi.hoisted(() => vi.fn());

vi.mock('node:crypto', () => ({
  randomUUID: randomUUIDMock
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    child: () => ({
      debug: loggerDebugSpy
    })
  }
}));

const courseLiveServiceModulePromise = import('../src/services/CourseLiveService.js');

let courseLiveService;

beforeAll(async () => {
  ({ default: courseLiveService } = await courseLiveServiceModulePromise);
});

describe('CourseLiveService', () => {
  beforeEach(() => {
    courseLiveService.sessions.clear();
    courseLiveService.maxChatHistory = 200;
    randomUUIDMock.mockReset();
    randomUUIDMock.mockImplementation(() => 'message-1');
  });

  it('tracks presence when learners join and leave', () => {
    const presenceAfterJoin = courseLiveService.joinCourse('course-1', {
      id: 42,
      name: 'Ava Founder',
      role: 'learner',
      avatarUrl: 'https://cdn/img.png'
    });

    expect(presenceAfterJoin.totalViewers).toBe(1);
    expect(presenceAfterJoin.viewers[0]).toEqual(
      expect.objectContaining({ id: 42, name: 'Ava Founder', role: 'learner', avatarUrl: 'https://cdn/img.png' })
    );
    expect(presenceAfterJoin.viewers[0].joinedAt).toMatch(/T/);
    expect(presenceAfterJoin.viewers[0].lastSeenAt).toMatch(/T/);

    const presenceAfterLeave = courseLiveService.leaveCourse('course-1', 42);
    expect(presenceAfterLeave).toEqual({ totalViewers: 0, viewers: [] });
  });

  it('prunes chat history when posting messages beyond the retention limit', () => {
    courseLiveService.maxChatHistory = 3;
    randomUUIDMock.mockImplementationOnce(() => 'message-1');
    randomUUIDMock.mockImplementationOnce(() => 'message-2');
    randomUUIDMock.mockImplementationOnce(() => 'message-3');
    randomUUIDMock.mockImplementationOnce(() => 'message-4');

    courseLiveService.postMessage('course-99', { id: 91, name: 'Ops Lead' }, ' first ');
    courseLiveService.postMessage('course-99', { id: 91, name: 'Ops Lead' }, ' second ');
    courseLiveService.postMessage('course-99', { id: 91, name: 'Ops Lead' }, ' third ');
    const fourth = courseLiveService.postMessage('course-99', { id: 91, name: 'Ops Lead' }, 'fourth update');

    expect(fourth).toMatchObject({
      id: 'message-4',
      body: 'fourth update',
      courseId: 'course-99'
    });

    const messages = courseLiveService.listMessages('course-99');
    expect(messages).toHaveLength(3);
    expect(messages.map((message) => message.id)).toEqual(['message-2', 'message-3', 'message-4']);
  });

  it('enforces non-empty messages and honours list limits', () => {
    expect(() => courseLiveService.postMessage('course-2', { id: 7 }, '  ')).toThrowError('Message body required');

    randomUUIDMock.mockImplementation((() => {
      let counter = 0;
      return () => `msg-${++counter}`;
    })());

    courseLiveService.postMessage('course-2', { id: 7 }, 'Status 1');
    courseLiveService.postMessage('course-2', { id: 8 }, 'Status 2');
    courseLiveService.postMessage('course-2', { id: 9 }, 'Status 3');

    const limited = courseLiveService.listMessages('course-2', { limit: 2 });
    expect(limited).toHaveLength(2);
    expect(limited[0].id).toBe('msg-2');
    expect(limited[1].id).toBe('msg-3');
  });

  it('updates presence heartbeat for existing viewers', () => {
    courseLiveService.joinCourse('course-3', { id: 17, name: 'Ops Analyst' });
    const beforeTouch = courseLiveService.getPresence('course-3').viewers[0].lastSeenAt;

    const updatedPresence = courseLiveService.touchPresence('course-3', 17);

    expect(updatedPresence.totalViewers).toBe(1);
    const viewer = updatedPresence.viewers[0];
    expect(viewer.lastSeenAt).not.toBe(beforeTouch);
    expect(viewer.joinedAt).toMatch(/T/);
  });
});
