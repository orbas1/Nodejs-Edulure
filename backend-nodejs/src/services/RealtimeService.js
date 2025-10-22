import { Server } from 'socket.io';

import { env } from '../config/env.js';
import { verifyAccessToken } from '../config/jwtKeyStore.js';
import logger from '../config/logger.js';
import { sessionRegistry } from './SessionRegistry.js';
import UserModel from '../models/UserModel.js';
import DirectMessageParticipantModel from '../models/DirectMessageParticipantModel.js';
import courseLiveService from './CourseLiveService.js';
import { createCorsOriginValidator } from '../config/corsPolicy.js';

const log = logger.child({ service: 'RealtimeService' });

function buildAvatarUrl(name) {
  const seed = encodeURIComponent(name ?? 'Edulure Member');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=4338ca&radius=50`;
}

async function resolveUserFromToken(token) {
  const payload = verifyAccessToken(token);
  if (!payload.sid) {
    const error = new Error('Session missing in token');
    error.status = 401;
    throw error;
  }
  const session = await sessionRegistry.ensureActive(payload.sid);
  const userId = Number(payload.sub);
  const record = Number.isFinite(userId) ? await UserModel.findById(userId) : null;
  const firstName = record?.firstName ?? payload.given_name ?? '';
  const lastName = record?.lastName ?? payload.family_name ?? '';
  const displayName = `${firstName} ${lastName}`.trim() || record?.email || payload.name || 'Edulure Member';
  return {
    id: record?.id ?? userId,
    role: record?.role ?? payload.role ?? 'user',
    name: displayName,
    email: record?.email ?? payload.email ?? null,
    avatarUrl: buildAvatarUrl(displayName),
    sessionId: session.id
  };
}

class RealtimeService {
  constructor() {
    this.io = null;
    this.activeConnections = new Map();
  }

  async start(httpServer) {
    if (this.io) {
      return this.io;
    }

    this.activeConnections.clear();

    const corsPolicy = createCorsOriginValidator(env.app.corsOrigins ?? [], {
      allowDevelopmentOrigins: !env.isProduction
    });
    this.io = new Server(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (corsPolicy.isOriginAllowed(origin)) {
            return callback(null, true);
          }

          const error = new Error(`Origin ${origin ?? '<unknown>'} not allowed by CORS policy`);
          logger.warn({ origin, policy: corsPolicy.describe() }, 'Realtime connection blocked by CORS');
          return callback(error);
        },
        credentials: true
      }
    });

    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ??
          socket.handshake.headers?.authorization?.split(' ')[1] ??
          socket.handshake.query?.token;
        if (!token) {
          throw new Error('Authentication token missing');
        }
        const user = await resolveUserFromToken(token);
        socket.data.user = user;
        socket.data.joinedThreads = new Set();
        socket.data.joinedCourses = new Set();
        return next();
      } catch (error) {
        log.warn({ err: error }, 'socket authentication failed');
        return next(new Error('UNAUTHORIZED'));
      }
    });

    this.io.on('connection', (socket) => {
      const { user } = socket.data;
      log.info({ userId: user.id }, 'socket connected');
      socket.join(`user:${user.id}`);
      socket.emit('realtime.ready', { user });
      const userConnections = this.activeConnections.get(user.id) ?? new Set();
      userConnections.add(socket.id);
      this.activeConnections.set(user.id, userConnections);

      socket.on('inbox.join', async (payload) => {
        const threadId = Number(payload?.threadId);
        if (!Number.isFinite(threadId)) return;
        try {
          const participant = await DirectMessageParticipantModel.findParticipant(threadId, user.id);
          if (!participant) {
            socket.emit('inbox.error', { threadId, message: 'Thread not found' });
            return;
          }
          socket.join(`dm:${threadId}`);
          socket.data.joinedThreads.add(threadId);
          socket.emit('inbox.joined', { threadId });
        } catch (error) {
          log.warn({ err: error, threadId }, 'failed to join inbox thread');
        }
      });

      socket.on('inbox.leave', (payload) => {
        const threadId = Number(payload?.threadId);
        if (!Number.isFinite(threadId)) return;
        socket.leave(`dm:${threadId}`);
        socket.data.joinedThreads.delete(threadId);
        socket.emit('inbox.left', { threadId });
      });

      socket.on('course.join', (payload) => {
        const courseId = String(payload?.courseId ?? '').trim();
        if (!courseId) return;
        socket.join(`course:${courseId}`);
        socket.data.joinedCourses.add(courseId);
        const presence = courseLiveService.joinCourse(courseId, user);
        this.io.to(`course:${courseId}`).emit('course.presence', {
          courseId,
          presence
        });
      });

      socket.on('course.leave', (payload) => {
        const courseId = String(payload?.courseId ?? '').trim();
        if (!courseId) return;
        socket.leave(`course:${courseId}`);
        socket.data.joinedCourses.delete(courseId);
        const presence = courseLiveService.leaveCourse(courseId, user.id);
        this.io.to(`course:${courseId}`).emit('course.presence', {
          courseId,
          presence
        });
      });

      socket.on('course.message', (payload) => {
        const courseId = String(payload?.courseId ?? '').trim();
        if (!courseId) return;
        try {
          const message = courseLiveService.postMessage(courseId, user, payload?.body ?? '');
          this.io.to(`course:${courseId}`).emit('course.message', {
            courseId,
            message
          });
        } catch (error) {
          socket.emit('course.error', { courseId, message: error.message });
        }
      });

      socket.on('disconnect', () => {
        log.info({ userId: user.id }, 'socket disconnected');
        const connections = this.activeConnections.get(user.id);
        if (connections) {
          connections.delete(socket.id);
          if (!connections.size) {
            this.activeConnections.delete(user.id);
          }
        }
        socket.data.joinedCourses?.forEach((courseId) => {
          const presence = courseLiveService.leaveCourse(courseId, user.id);
          this.io.to(`course:${courseId}`).emit('course.presence', {
            courseId,
            presence
          });
        });
      });
    });

    return this.io;
  }

  stop() {
    if (!this.io) {
      return;
    }
    log.info('Shutting down realtime service');
    this.io.removeAllListeners();
    this.io.close();
    this.activeConnections.clear();
    courseLiveService.reset();
    this.io = null;
  }

  broadcastThreadUpsert(thread, participants, payload = {}) {
    if (!this.io) return;
    const participantIds = participants.map((participant) => participant.userId);
    participantIds.forEach((userId) => {
      this.io.to(`user:${userId}`).emit('inbox.thread.upserted', {
        thread,
        participants,
        ...payload
      });
    });
  }

  broadcastMessage(threadId, message, participants) {
    if (!this.io) return;
    this.io.to(`dm:${threadId}`).emit('dm.message.created', {
      threadId,
      message
    });
    participants.forEach((participant) => {
      this.io.to(`user:${participant.userId}`).emit('inbox.thread.activity', {
        threadId,
        message
      });
    });
  }

  broadcastReadReceipt(threadId, participant) {
    if (!this.io) return;
    this.io.to(`dm:${threadId}`).emit('dm.thread.read', {
      threadId,
      participant
    });
  }

  broadcastCoursePresence(courseId) {
    if (!this.io) return;
    const presence = courseLiveService.getPresence(courseId);
    this.io.to(`course:${courseId}`).emit('course.presence', {
      courseId,
      presence
    });
  }

  getConnectionSummary() {
    const totalConnections = Array.from(this.activeConnections.values()).reduce(
      (total, connections) => total + connections.size,
      0
    );

    return {
      connectedUsers: this.activeConnections.size,
      totalConnections,
      generatedAt: new Date().toISOString()
    };
  }

  broadcastCourseMessage(courseId, message) {
    if (!this.io) return;
    this.io.to(`course:${courseId}`).emit('course.message', {
      courseId,
      message
    });
  }
}

const realtimeService = new RealtimeService();

export default realtimeService;

