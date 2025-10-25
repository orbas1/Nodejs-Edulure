import { Server } from 'socket.io';

import { env } from '../config/env.js';
import { verifyAccessToken } from '../config/jwtKeyStore.js';
import logger from '../config/logger.js';
import { sessionRegistry } from './SessionRegistry.js';
import UserModel from '../models/UserModel.js';
import DirectMessageParticipantModel from '../models/DirectMessageParticipantModel.js';
import courseLiveService from './CourseLiveService.js';
import UserPresenceSessionModel from '../models/UserPresenceSessionModel.js';
import { createCorsOriginValidator } from '../config/corsPolicy.js';

const log = logger.child({ service: 'RealtimeService' });

let communityChatService;
async function getCommunityChatService() {
  if (!communityChatService) {
    const module = await import('./CommunityChatService.js');
    communityChatService = module.default ?? module;
  }
  return communityChatService;
}

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

      socket.data.joinedCommunities = new Set();
      socket.data.joinedCommunityChannels = new Map();

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

      socket.on('community.join', async (payload = {}) => {
        const communityId = Number(payload.communityId);
        if (!Number.isFinite(communityId)) {
          return;
        }
        try {
          const chatService = await getCommunityChatService();
          await chatService.ensureCommunityMember(communityId, user.id);
          socket.join(`community:${communityId}`);
          socket.data.joinedCommunities.add(communityId);
          socket.emit('community.joined', { communityId });
        } catch (error) {
          log.warn({ err: error, communityId, userId: user.id }, 'community join failed');
          socket.emit('community.error', {
            communityId,
            message: error?.message ?? 'Unable to join community'
          });
        }
      });

      socket.on('community.leave', (payload = {}) => {
        const communityId = Number(payload.communityId);
        if (!Number.isFinite(communityId)) {
          return;
        }

        socket.leave(`community:${communityId}`);
        socket.data.joinedCommunities.delete(communityId);

        const joinedChannels = socket.data.joinedCommunityChannels.get(communityId);
        if (joinedChannels) {
          joinedChannels.forEach((channelId) => {
            socket.leave(`community:${communityId}:channel:${channelId}`);
          });
          socket.data.joinedCommunityChannels.delete(communityId);
        }

        socket.emit('community.left', { communityId });
      });

      socket.on('community.channel.join', async (payload = {}) => {
        const communityId = Number(payload.communityId);
        const channelId = Number(payload.channelId);
        if (!Number.isFinite(communityId) || !Number.isFinite(channelId)) {
          return;
        }

        try {
          const chatService = await getCommunityChatService();
          await chatService.ensureChannelAccess(communityId, channelId, user.id);
          socket.join(`community:${communityId}:channel:${channelId}`);
          const joinedChannels = socket.data.joinedCommunityChannels.get(communityId) ?? new Set();
          joinedChannels.add(channelId);
          socket.data.joinedCommunityChannels.set(communityId, joinedChannels);
          socket.emit('community.channel.joined', { communityId, channelId });
        } catch (error) {
          log.warn({ err: error, communityId, channelId, userId: user.id }, 'community channel join failed');
          socket.emit('community.error', {
            communityId,
            channelId,
            message: error?.message ?? 'Unable to join channel'
          });
        }
      });

      socket.on('community.channel.leave', (payload = {}) => {
        const communityId = Number(payload.communityId);
        const channelId = Number(payload.channelId);
        if (!Number.isFinite(communityId) || !Number.isFinite(channelId)) {
          return;
        }

        socket.leave(`community:${communityId}:channel:${channelId}`);
        const joinedChannels = socket.data.joinedCommunityChannels.get(communityId);
        if (joinedChannels) {
          joinedChannels.delete(channelId);
          if (!joinedChannels.size) {
            socket.data.joinedCommunityChannels.delete(communityId);
          }
        }
        socket.emit('community.channel.left', { communityId, channelId });
      });

      socket.on('community.typing', (payload = {}) => {
        const communityId = Number(payload.communityId);
        const channelId = Number(payload.channelId);
        if (!Number.isFinite(communityId) || !Number.isFinite(channelId)) {
          return;
        }

        if (!socket.data.joinedCommunities.has(communityId)) {
          return;
        }
        const joinedChannels = socket.data.joinedCommunityChannels.get(communityId);
        if (!joinedChannels?.has(channelId)) {
          return;
        }

        const typingPayload = {
          communityId,
          channelId,
          user: {
            id: user.id,
            name: user.name,
            role: user.role
          },
          isTyping: Boolean(payload.isTyping),
          metadata: payload.metadata ?? {},
          timestamp: new Date().toISOString()
        };

        this.io
          .to(`community:${communityId}:channel:${channelId}`)
          .emit('community.typing', typingPayload);
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

        const communityIds = Array.from(socket.data.joinedCommunities ?? []);
        socket.data.joinedCommunities.clear?.();
        socket.data.joinedCommunityChannels.clear?.();

        (async () => {
          try {
            if (user.sessionId) {
              await UserPresenceSessionModel.clear(user.sessionId);
            }
          } catch (error) {
            log.warn({ err: error, userId: user.id }, 'failed to clear presence session on disconnect');
          }

          await Promise.all(
            communityIds.map(async (communityId) => {
              try {
                await this.broadcastCommunityPresence(communityId);
              } catch (error) {
                log.warn({ err: error, communityId, userId: user.id }, 'failed to broadcast community presence on disconnect');
              }
            })
          );
        })();
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

  broadcastCommunityMessage(communityId, channelId, message, metadata = {}) {
    if (!this.io) return;
    const numericCommunityId = Number(communityId);
    const numericChannelId = Number(channelId);
    if (!Number.isFinite(numericCommunityId) || !Number.isFinite(numericChannelId)) {
      return;
    }

    const payload = {
      communityId: numericCommunityId,
      channelId: numericChannelId,
      message,
      metadata: {
        broadcastedAt: new Date().toISOString(),
        ...metadata
      }
    };

    this.io.to(`community:${numericCommunityId}`).emit('community.message', payload);
    this.io.to(`community:${numericCommunityId}:channel:${numericChannelId}`).emit('community.message', payload);
  }

  broadcastCommunityReaction(communityId, channelId, reactionSummary) {
    if (!this.io) return;
    const numericCommunityId = Number(communityId);
    const numericChannelId = Number(channelId);
    if (!Number.isFinite(numericCommunityId) || !Number.isFinite(numericChannelId)) {
      return;
    }

    this.io
      .to(`community:${numericCommunityId}:channel:${numericChannelId}`)
      .emit('community.reaction', {
        communityId: numericCommunityId,
        channelId: numericChannelId,
        reaction: reactionSummary
      });
  }

  async broadcastCommunityPresence(communityId, presenceList) {
    if (!this.io) return;
    const numericCommunityId = Number(communityId);
    if (!Number.isFinite(numericCommunityId)) {
      return;
    }

    let presence = presenceList;
    if (!presence) {
      try {
        const chatService = await getCommunityChatService();
        presence = await chatService.listPresence(numericCommunityId);
      } catch (error) {
        log.warn({ err: error, communityId: numericCommunityId }, 'failed to load presence for broadcast');
        return;
      }
    }

    this.io.to(`community:${numericCommunityId}`).emit('community.presence', {
      communityId: numericCommunityId,
      presence
    });
  }
}

const realtimeService = new RealtimeService();

export default realtimeService;

