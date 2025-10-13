import { randomUUID, createHmac } from 'node:crypto';

import { env } from '../config/env.js';
import courseLiveService from './CourseLiveService.js';

function buildSignature(courseId, userId, sessionId, expiresAt) {
  const secret = env.security.drmSignatureSecret;
  const payload = `${courseId}:${userId}:${sessionId}:${expiresAt.toISOString()}`;
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

class VideoPlaybackService {
  constructor() {
    this.baseUrl = env.video?.basePlaybackUrl ?? 'https://video.edulure.local/streams';
    this.tokenTtlMinutes = env.video?.tokenTtlMinutes ?? 90;
    this.liveEdgeLatencySeconds = env.video?.liveEdgeLatencySeconds ?? 3;
  }

  getPlaybackSession(courseId, user) {
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + this.tokenTtlMinutes * 60 * 1000);
    const signature = buildSignature(courseId, user.id, sessionId, expiresAt);
    const playbackUrl = `${this.baseUrl}/${encodeURIComponent(courseId)}/master.m3u8?token=${signature}&expires=${encodeURIComponent(
      expiresAt.toISOString()
    )}`;

    return {
      sessionId,
      playback: {
        type: 'hls',
        url: playbackUrl,
        expiresAt: expiresAt.toISOString(),
        liveEdgeLatencySeconds: this.liveEdgeLatencySeconds
      },
      chat: {
        channel: `course:${courseId}`
      },
      live: {
        isLive: true,
        presence: courseLiveService.getPresence(courseId)
      }
    };
  }
}

const videoPlaybackService = new VideoPlaybackService();

export default videoPlaybackService;

