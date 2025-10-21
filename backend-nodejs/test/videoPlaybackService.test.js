import { describe, expect, it, vi } from 'vitest';
import videoPlaybackService from '../src/services/VideoPlaybackService.js';
import courseLiveService from '../src/services/CourseLiveService.js';

vi.mock('../src/services/CourseLiveService.js', () => ({
  default: {
    getPresence: vi.fn(() => ({ totalViewers: 3, viewers: [] }))
  }
}));

describe('VideoPlaybackService', () => {
  it('builds playback sessions with signed urls and live metadata', () => {
    const expiresSpy = vi.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-01T00:00:00Z').getTime());

    const user = { id: 15 };
    const session = videoPlaybackService.getPlaybackSession('course-123', user);

    expect(session.sessionId).toMatch(/^[a-f0-9-]{36}$/i);
    expect(session.playback.url).toContain('course-123');
    expect(session.playback.url).toContain('token=');
    expect(session.playback.expiresAt).toBe('2024-01-01T01:30:00.000Z');
    expect(session.live.presence).toEqual({ totalViewers: 3, viewers: [] });
    expect(courseLiveService.getPresence).toHaveBeenCalledWith('course-123');

    expiresSpy.mockRestore();
  });
});
