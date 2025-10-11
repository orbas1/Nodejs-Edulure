import db from '../config/database.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import DomainEventModel from '../models/DomainEventModel.js';
import FollowRecommendationModel from '../models/FollowRecommendationModel.js';
import SocialAuditLogModel from '../models/SocialAuditLogModel.js';
import UserBlockModel from '../models/UserBlockModel.js';
import UserFollowModel from '../models/UserFollowModel.js';
import UserModel from '../models/UserModel.js';
import UserMuteModel from '../models/UserMuteModel.js';
import UserPrivacySettingModel from '../models/UserPrivacySettingModel.js';

const {
  social: {
    pagination: {
      follows: { defaultPageSize: followDefaultPageSize, maxPageSize: followMaxPageSize }
    },
    recommendations,
    mute
  }
} = env;

function normalizePageSize(requested, fallback, maximum) {
  if (!requested) return fallback;
  return Math.min(Math.max(1, Number(requested)), maximum);
}

async function ensureUserExists(userId) {
  const user = await UserModel.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  return user;
}

async function assertNotBlocked(actorId, targetUserId, connection) {
  const isBlockedByActor = await UserBlockModel.isBlocked(actorId, targetUserId, connection);
  if (isBlockedByActor) {
    const error = new Error('Unblock the user before performing this action');
    error.status = 409;
    throw error;
  }

  const isBlockedByTarget = await UserBlockModel.isBlocked(targetUserId, actorId, connection);
  if (isBlockedByTarget) {
    const error = new Error('You are blocked by this user');
    error.status = 403;
    throw error;
  }
}

async function validatePrivacyAccess(viewerId, subjectId, connection) {
  if (viewerId === subjectId) {
    return { allowed: true };
  }

  const privacy = await UserPrivacySettingModel.getForUser(subjectId, connection);
  const isBlocked =
    (await UserBlockModel.isBlocked(viewerId, subjectId, connection)) ||
    (await UserBlockModel.isBlocked(subjectId, viewerId, connection));

  if (isBlocked) {
    return { allowed: false, reason: 'blocked' };
  }

  if (privacy.profileVisibility === 'public') {
    return { allowed: true, privacy };
  }

  const isFollower = await UserFollowModel.isFollowing(viewerId, subjectId, connection);
  if (privacy.profileVisibility === 'followers' && isFollower) {
    return { allowed: true, privacy };
  }

  return { allowed: false, reason: 'privacy' };
}

async function buildViewerContext(viewerId, subjectId, connection) {
  const [viewerFollows, subjectFollows] = await Promise.all([
    UserFollowModel.isFollowing(viewerId, subjectId, connection),
    UserFollowModel.isFollowing(subjectId, viewerId, connection)
  ]);

  return {
    viewerFollowsSubject: viewerFollows,
    subjectFollowsViewer: subjectFollows
  };
}

async function safeExecute(callback, context, message) {
  try {
    await callback();
  } catch (error) {
    logger.warn({ ...context, err: error }, message);
  }
}

export default class SocialGraphService {
  static async followUser(actorId, targetUserId, payload = {}) {
    if (actorId === Number(targetUserId)) {
      const error = new Error('You cannot follow yourself');
      error.status = 400;
      throw error;
    }

    await ensureUserExists(targetUserId);

    return db.transaction(async (trx) => {
      await assertNotBlocked(actorId, targetUserId, trx);

      const privacy = await UserPrivacySettingModel.getForUser(targetUserId, trx);
      const existing = await UserFollowModel.findRelationship(actorId, targetUserId, trx);

      if (existing && existing.status === 'accepted') {
        return existing;
      }

      const requiresApproval = privacy.followApprovalRequired || privacy.profileVisibility === 'private';
      const status = requiresApproval ? 'pending' : 'accepted';

      const relationship = await UserFollowModel.upsertRelationship(
        actorId,
        targetUserId,
        {
          status,
          source: payload.source ?? 'manual',
          reason: payload.reason ?? null,
          metadata: payload.metadata ?? {},
          acceptedAt: requiresApproval ? null : trx.fn.now()
        },
        trx
      );

      await SocialAuditLogModel.record(
        {
          userId: actorId,
          targetUserId,
          action: status === 'accepted' ? 'follow.accepted' : 'follow.requested',
          source: payload.source ?? 'manual',
          metadata: {
            previousStatus: existing?.status ?? null
          }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: targetUserId,
          eventType: status === 'accepted' ? 'social.follow.accepted' : 'social.follow.requested',
          payload: {
            followerId: actorId,
            targetUserId,
            requiresApproval
          },
          performedBy: actorId
        },
        trx
      );

      logger.info(
        {
          followerId: actorId,
          targetUserId,
          status,
          requiresApproval
        },
        'Follow relationship processed'
      );

      if (status === 'accepted') {
        await safeExecute(
          () => FollowRecommendationModel.markConsumed(targetUserId, actorId, 'followed-back', trx),
          { followerId: actorId, targetUserId },
          'Failed to mark recommendation as consumed after follow acceptance'
        );

        await safeExecute(
          async () => {
            const mutualFollowersCount = await UserFollowModel.countFollowers(actorId, trx);
            await FollowRecommendationModel.upsert(
              targetUserId,
              actorId,
              {
                score: 75,
                mutualFollowersCount,
                reasonCode: 'follow_back_suggestion',
                metadata: { triggeredBy: 'follow.accepted' }
              },
              trx
            );
          },
          { followerId: actorId, targetUserId },
          'Failed to enqueue reciprocal follow recommendation'
        );
      }

      return relationship;
    });
  }

  static async approveFollow(targetUserId, followerId, actorId) {
    if (actorId !== Number(targetUserId)) {
      const error = new Error('Only the target user can approve follow requests');
      error.status = 403;
      throw error;
    }

    await ensureUserExists(followerId);

    return db.transaction(async (trx) => {
      const relationship = await UserFollowModel.findRelationship(followerId, targetUserId, trx);
      if (!relationship || relationship.status !== 'pending') {
        const error = new Error('No pending follow request found');
        error.status = 404;
        throw error;
      }

      const updated = await UserFollowModel.updateStatus(
        followerId,
        targetUserId,
        'accepted',
        { acceptedAt: trx.fn.now() },
        trx
      );

      await SocialAuditLogModel.record(
        {
          userId: targetUserId,
          targetUserId: followerId,
          action: 'follow.approved',
          metadata: { previousStatus: relationship.status }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: targetUserId,
          eventType: 'social.follow.approved',
          payload: {
            followerId,
            approverId: actorId
          },
          performedBy: actorId
        },
        trx
      );

      await safeExecute(
        () => FollowRecommendationModel.markConsumed(targetUserId, followerId, 'approved', trx),
        { followerId, targetUserId },
        'Failed to mark recommendation as consumed after follow approval'
      );

      await safeExecute(
        async () => {
          const mutualFollowersCount = await UserFollowModel.countFollowers(targetUserId, trx);
          await FollowRecommendationModel.upsert(
            followerId,
            targetUserId,
            {
              score: 70,
              mutualFollowersCount,
              reasonCode: 'follow_back_suggestion',
              metadata: { triggeredBy: 'follow.approved' }
            },
            trx
          );
        },
        { followerId, targetUserId },
        'Failed to queue reciprocal recommendation after approval'
      );

      logger.info(
        {
          followerId,
          targetUserId,
          actorId
        },
        'Follow request approved'
      );

      return updated;
    });
  }

  static async declineFollow(targetUserId, followerId, actorId) {
    if (actorId !== Number(targetUserId)) {
      const error = new Error('Only the target user can decline follow requests');
      error.status = 403;
      throw error;
    }

    return db.transaction(async (trx) => {
      const relationship = await UserFollowModel.findRelationship(followerId, targetUserId, trx);
      if (!relationship || relationship.status !== 'pending') {
        const error = new Error('No pending follow request found');
        error.status = 404;
        throw error;
      }

      const updated = await UserFollowModel.updateStatus(
        followerId,
        targetUserId,
        'declined',
        { reason: 'Declined by user' },
        trx
      );

      await SocialAuditLogModel.record(
        {
          userId: targetUserId,
          targetUserId: followerId,
          action: 'follow.declined',
          metadata: { previousStatus: relationship.status }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: targetUserId,
          eventType: 'social.follow.declined',
          payload: {
            followerId,
            declinerId: actorId
          },
          performedBy: actorId
        },
        trx
      );

      await safeExecute(
        () => FollowRecommendationModel.markConsumed(targetUserId, followerId, 'declined', trx),
        { followerId, targetUserId },
        'Failed to mark recommendation as consumed after follow decline'
      );
      logger.info(
        {
          followerId,
          targetUserId,
          actorId
        },
        'Follow request declined'
      );
      return updated;
    });
  }

  static async unfollowUser(actorId, targetUserId) {
    if (actorId === Number(targetUserId)) {
      const error = new Error('You cannot unfollow yourself');
      error.status = 400;
      throw error;
    }

    return db.transaction(async (trx) => {
      const existing = await UserFollowModel.findRelationship(actorId, targetUserId, trx);
      if (!existing) {
        return null;
      }

      await UserFollowModel.deleteRelationship(actorId, targetUserId, trx);

      await SocialAuditLogModel.record(
        {
          userId: actorId,
          targetUserId,
          action: 'follow.removed',
          metadata: { previousStatus: existing.status }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: targetUserId,
          eventType: 'social.follow.removed',
          payload: {
            followerId: actorId,
            previousStatus: existing.status
          },
          performedBy: actorId
        },
        trx
      );

      await safeExecute(
        () =>
          FollowRecommendationModel.upsert(
            actorId,
            targetUserId,
            {
              score: 30,
              mutualFollowersCount: 0,
              reasonCode: 'reconnect_prompt',
              metadata: { triggeredBy: 'follow.removed' }
            },
            trx
          ),
        { followerId: actorId, targetUserId },
        'Failed to queue reconnect recommendation after unfollow'
      );

      logger.info(
        {
          followerId: actorId,
          targetUserId,
          previousStatus: existing.status
        },
        'Follow relationship removed'
      );

      return existing;
    });
  }

  static async muteUser(actorId, targetUserId, payload = {}) {
    if (actorId === Number(targetUserId)) {
      const error = new Error('You cannot mute yourself');
      error.status = 400;
      throw error;
    }

    await ensureUserExists(targetUserId);

    const durationMinutes = payload.durationMinutes ?? mute.defaultDurationDays * 24 * 60;
    const mutedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

    return db.transaction(async (trx) => {
      const record = await UserMuteModel.mute(
        actorId,
        targetUserId,
        {
          mutedUntil: payload.durationMinutes ? mutedUntil : null,
          reason: payload.reason ?? null,
          metadata: payload.metadata ?? {}
        },
        trx
      );

      await SocialAuditLogModel.record(
        {
          userId: actorId,
          targetUserId,
          action: 'mute.applied',
          metadata: { durationMinutes }
        },
        trx
      );

      logger.debug(
        {
          actorId,
          targetUserId,
          durationMinutes
        },
        'Mute applied to user'
      );

      return record;
    });
  }

  static async unmuteUser(actorId, targetUserId) {
    return db.transaction(async (trx) => {
      await UserMuteModel.unmute(actorId, targetUserId, trx);
      await SocialAuditLogModel.record(
        {
          userId: actorId,
          targetUserId,
          action: 'mute.removed'
        },
        trx
      );

      logger.debug(
        {
          actorId,
          targetUserId
        },
        'Mute removed from user'
      );
    });
  }

  static async blockUser(actorId, targetUserId, payload = {}) {
    if (actorId === Number(targetUserId)) {
      const error = new Error('You cannot block yourself');
      error.status = 400;
      throw error;
    }

    await ensureUserExists(targetUserId);

    return db.transaction(async (trx) => {
      const record = await UserBlockModel.block(
        actorId,
        targetUserId,
        {
          reason: payload.reason ?? null,
          metadata: payload.metadata ?? {},
          expiresAt: payload.expiresAt ?? null
        },
        trx
      );

      await UserFollowModel.removeBetween(actorId, targetUserId, trx);
      await safeExecute(
        () => UserMuteModel.unmute(actorId, targetUserId, trx),
        { actorId, targetUserId },
        'Failed to remove mute when blocking user'
      );
      await safeExecute(
        () => UserMuteModel.unmute(targetUserId, actorId, trx),
        { actorId, targetUserId },
        'Failed to remove reciprocal mute when blocking user'
      );
      await safeExecute(
        () => FollowRecommendationModel.delete(actorId, targetUserId, trx),
        { actorId, targetUserId },
        'Failed to purge outgoing recommendation after block'
      );
      await safeExecute(
        () => FollowRecommendationModel.delete(targetUserId, actorId, trx),
        { actorId, targetUserId },
        'Failed to purge incoming recommendation after block'
      );

      await SocialAuditLogModel.record(
        {
          userId: actorId,
          targetUserId,
          action: 'block.applied',
          metadata: { reason: payload.reason ?? null }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: targetUserId,
          eventType: 'social.block.applied',
          payload: {
            blockerId: actorId,
            reason: payload.reason ?? null
          },
          performedBy: actorId
        },
        trx
      );

      logger.warn(
        {
          actorId,
          targetUserId,
          reason: payload.reason ?? null
        },
        'User blocked'
      );

      return record;
    });
  }

  static async unblockUser(actorId, targetUserId) {
    return db.transaction(async (trx) => {
      await UserBlockModel.unblock(actorId, targetUserId, trx);
      await SocialAuditLogModel.record(
        {
          userId: actorId,
          targetUserId,
          action: 'block.removed'
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: targetUserId,
          eventType: 'social.block.removed',
          payload: {
            blockerId: actorId
          },
          performedBy: actorId
        },
        trx
      );

      logger.info(
        {
          actorId,
          targetUserId
        },
        'User unblocked'
      );
    });
  }

  static async listFollowers(subjectId, viewerId, query = {}) {
    await ensureUserExists(subjectId);

    const pageSize = normalizePageSize(query.limit, followDefaultPageSize, followMaxPageSize);
    const offset = Math.max(0, Number(query.offset ?? 0));

    const access = await validatePrivacyAccess(viewerId, Number(subjectId), db);
    if (!access.allowed) {
      const error = new Error(
        access.reason === 'blocked' ? 'Access denied' : 'Followers list is restricted'
      );
      error.status = access.reason === 'blocked' ? 403 : 403;
      throw error;
    }

    const { items, total } = await UserFollowModel.listFollowers(Number(subjectId), {
      limit: pageSize,
      offset,
      status: query.status ?? 'accepted',
      search: query.search ?? null
    });

    const viewerContext = await buildViewerContext(viewerId, Number(subjectId), db);

    return {
      items,
      pagination: {
        total,
        limit: pageSize,
        offset
      },
      viewerContext
    };
  }

  static async listFollowing(subjectId, viewerId, query = {}) {
    await ensureUserExists(subjectId);

    const pageSize = normalizePageSize(query.limit, followDefaultPageSize, followMaxPageSize);
    const offset = Math.max(0, Number(query.offset ?? 0));

    if (viewerId !== Number(subjectId)) {
      await assertNotBlocked(viewerId, Number(subjectId), db);
    }

    const { items, total } = await UserFollowModel.listFollowing(Number(subjectId), {
      limit: pageSize,
      offset,
      status: query.status ?? 'accepted',
      search: query.search ?? null
    });

    const viewerContext = await buildViewerContext(viewerId, Number(subjectId), db);

    return {
      items,
      pagination: {
        total,
        limit: pageSize,
        offset
      },
      viewerContext
    };
  }

  static async listRecommendations(userId, query = {}) {
    const limit = normalizePageSize(
      query.limit,
      recommendations.maxResults,
      recommendations.maxResults
    );

    const stored = await FollowRecommendationModel.listForUser(userId, { limit });
    const collectedIds = new Set(stored.map((item) => item.user.id));

    if (stored.length >= limit) {
      return stored.slice(0, limit);
    }

    const missing = limit - stored.length;
    const mutuals = await UserFollowModel.findMutualCandidates(userId, {
      limit: missing * 2,
      excludeIds: [userId, ...collectedIds]
    });

    const filteredMutuals = mutuals
      .filter((candidate) => !collectedIds.has(candidate.id))
      .slice(0, missing);

    const fallbackItems = filteredMutuals.map((candidate) => ({
      recommendation: {
        id: null,
        userId: userId,
        recommendedUserId: candidate.id,
        score: 60,
        mutualFollowersCount: candidate.mutualFollowers ?? 0,
        reasonCode: 'mutual_followers',
        metadata: {},
        generatedAt: new Date().toISOString(),
        consumedAt: null,
        createdAt: null,
        updatedAt: null
      },
      user: candidate
    }));

    return [...stored, ...fallbackItems].slice(0, limit);
  }

  static async getPrivacySettings(userId, actorId) {
    if (Number(userId) !== actorId) {
      const error = new Error('You can only view your own privacy settings');
      error.status = 403;
      throw error;
    }

    return UserPrivacySettingModel.getForUser(userId);
  }

  static async updatePrivacySettings(userId, actorId, payload) {
    if (Number(userId) !== actorId) {
      const error = new Error('You can only update your own privacy settings');
      error.status = 403;
      throw error;
    }

    return db.transaction(async (trx) => {
      const settings = await UserPrivacySettingModel.upsert(
        userId,
        {
          profileVisibility: payload.profileVisibility,
          followApprovalRequired: payload.followApprovalRequired,
          messagePermission: payload.messagePermission,
          shareActivity: payload.shareActivity,
          metadata: payload.metadata ?? {}
        },
        trx
      );

      await SocialAuditLogModel.record(
        {
          userId,
          action: 'privacy.updated',
          metadata: settings
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: userId,
          eventType: 'social.privacy.updated',
          payload: settings,
          performedBy: userId
        },
        trx
      );

      return settings;
    });
  }
}
