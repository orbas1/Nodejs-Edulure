import { randomUUID } from 'node:crypto';

import logger from '../config/logger.js';

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
  constructor() {
    this.sessions = new Map();
    this.maxChatHistory = 200;
  }

  ensureSession(courseId) {
    if (!this.sessions.has(courseId)) {
      this.sessions.set(courseId, {
        viewers: new Map(),
        messages: [],
        createdAt: new Date()
      });
    }
    return this.sessions.get(courseId);
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
      viewer.lastSeenAt = new Date();
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
      return {
        totalViewers: 0,
        viewers: []
      };
    }
    return {
      totalViewers: session.viewers.size,
      viewers: Array.from(session.viewers.values()).map((entry) => ({
        ...entry.user,
        joinedAt: entry.joinedAt.toISOString(),
        lastSeenAt: entry.lastSeenAt.toISOString()
      }))
    };
  }
}

const courseLiveService = new CourseLiveService();

export default courseLiveService;

