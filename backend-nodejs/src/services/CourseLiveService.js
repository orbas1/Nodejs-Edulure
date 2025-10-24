import { randomUUID } from 'node:crypto';

import logger from '../config/logger.js';
import { recordLiveCourseMessagePosted, updateLiveCoursePresenceMetrics } from '../observability/metrics.js';

const log = logger.child({ service: 'CourseLiveService' });

function serialiseUser(user) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    name: user.name ?? 'Learner',
    role: user.role ?? 'user',
    avatarUrl: user.avatarUrl ?? null
  };
}

function pruneMessages(messages, limit) {
  if (messages.length <= limit) {
    return messages;
  }
  const start = messages.length - limit;
  return messages.slice(start);
}

class CourseLiveService {
  constructor({ maxChatHistory = 200, idleTimeoutMs = 120000, sessionRetentionMs = 900000 } = {}) {
    this.sessions = new Map();
    this.maxChatHistory = Math.max(Number(maxChatHistory) || 200, 1);
    this.idleTimeoutMs = Math.max(Number(idleTimeoutMs) || 120000, 1000);
    this.sessionRetentionMs = Math.max(Number(sessionRetentionMs) || 900000, 60000);
  }

  ensureSession(courseId) {
    if (!this.sessions.has(courseId)) {
      this.sessions.set(courseId, {
        viewers: new Map(),
        messages: [],
        createdAt: new Date()
      });
      this.updatePresenceMetrics();
    }
    return this.sessions.get(courseId);
  }

  purgeStaleViewers(courseId, session, now = new Date()) {
    let removed = 0;
    for (const [viewerId, entry] of session.viewers.entries()) {
      const lastSeen = entry.lastSeenAt instanceof Date
        ? entry.lastSeenAt
        : entry.lastSeenAt
          ? new Date(entry.lastSeenAt)
          : null;
      if (!lastSeen || Number.isNaN(lastSeen.getTime()) || now.getTime() - lastSeen.getTime() > this.idleTimeoutMs) {
        session.viewers.delete(viewerId);
        removed += 1;
      }
    }

    if (removed > 0) {
      log.debug({ courseId, removed }, 'course live presence purged stale viewers');
    }

    return removed;
  }

  maybeCleanupSession(courseId, session, now = new Date()) {
    if (session.viewers.size > 0) {
      return false;
    }

    const createdAt = session.createdAt instanceof Date ? session.createdAt : new Date(session.createdAt ?? now);
    const sessionAgeMs = now.getTime() - createdAt.getTime();
    const shouldRemove = session.messages.length === 0 || sessionAgeMs >= this.sessionRetentionMs;

    if (shouldRemove) {
      this.sessions.delete(courseId);
      log.debug({ courseId }, 'course live session removed after inactivity');
      return true;
    }

    session.createdAt = createdAt;
    return false;
  }

  updatePresenceMetrics() {
    let viewerCount = 0;
    for (const session of this.sessions.values()) {
      viewerCount += session.viewers.size;
    }
    updateLiveCoursePresenceMetrics({ sessionCount: this.sessions.size, viewerCount });
  }

  joinCourse(courseId, user) {
    const session = this.ensureSession(courseId);
    session.viewers.set(user.id, {
      user: serialiseUser(user),
      joinedAt: new Date(),
      lastSeenAt: new Date()
    });
    log.debug({ courseId, userId: user.id }, 'course live presence joined');
    return this.getPresence(courseId);
  }

  leaveCourse(courseId, userId) {
    const session = this.sessions.get(courseId);
    if (!session) {
      return this.getPresence(courseId);
    }
    session.viewers.delete(userId);
    log.debug({ courseId, userId }, 'course live presence left');
    return this.getPresence(courseId);
  }

  touchPresence(courseId, userId) {
    const session = this.sessions.get(courseId);
    if (!session) return this.getPresence(courseId);
    const viewer = session.viewers.get(userId);
    if (viewer) {
      const now = new Date();
      if (viewer.lastSeenAt instanceof Date && now.getTime() <= viewer.lastSeenAt.getTime()) {
        viewer.lastSeenAt = new Date(viewer.lastSeenAt.getTime() + 1);
      } else {
        viewer.lastSeenAt = now;
      }
    }
    return this.getPresence(courseId);
  }

  postMessage(courseId, user, body) {
    const session = this.ensureSession(courseId);
    const trimmed = String(body ?? '').trim();
    if (!trimmed) {
      throw new Error('Message body required');
    }
    const message = {
      id: randomUUID(),
      courseId,
      body: trimmed,
      user: serialiseUser(user),
      sentAt: new Date().toISOString()
    };
    session.messages.push(message);
    session.messages = pruneMessages(session.messages, this.maxChatHistory);
    log.debug({ courseId, userId: user.id }, 'course live chat message appended');
    recordLiveCourseMessagePosted();
    return message;
  }

  listMessages(courseId, { limit = 50 } = {}) {
    const session = this.ensureSession(courseId);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), this.maxChatHistory);
    return pruneMessages(session.messages, safeLimit);
  }

  getPresence(courseId) {
    const session = this.sessions.get(courseId);
    if (!session) {
      this.updatePresenceMetrics();
      return {
        totalViewers: 0,
        viewers: []
      };
    }
    const now = new Date();
    this.purgeStaleViewers(courseId, session, now);
    if (this.maybeCleanupSession(courseId, session, now)) {
      this.updatePresenceMetrics();
      return {
        totalViewers: 0,
        viewers: []
      };
    }

    const presence = {
      totalViewers: session.viewers.size,
      viewers: Array.from(session.viewers.values()).map((entry) => ({
        ...entry.user,
        joinedAt: entry.joinedAt.toISOString(),
        lastSeenAt: entry.lastSeenAt.toISOString()
      }))
    };

    this.updatePresenceMetrics();
    return presence;
  }

  reset() {
    this.sessions.clear();
    this.updatePresenceMetrics();
  }
}

const courseLiveService = new CourseLiveService();

export default courseLiveService;

