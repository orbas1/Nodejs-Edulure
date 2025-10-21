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

const MAX_SOURCE_LENGTH = 60;
const MAX_REASON_LENGTH = 240;
const MAX_METADATA_ENTRIES = 32;
const MAX_METADATA_DEPTH = 3;
const MAX_METADATA_VALUE_LENGTH = 400;

function normaliseId(value, name) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    const error = new Error(`${name} is invalid`);
    error.status = 400;
    throw error;
  }
  return parsed;
}

function clampString(value, { maxLength, defaultValue = null, allowEmpty = false } = {}) {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  const trimmed = String(value).trim();
  if (!trimmed && !allowEmpty) {
    return defaultValue;
  }

  if (maxLength && trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }

  return trimmed || defaultValue;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function coerceMetadataObject(value) {
  if (!value) {
    return {};
  }
  if (isPlainObject(value)) {
    return value;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return isPlainObject(parsed) ? parsed : {};
    } catch (_error) {
      return {};
    }
  }
  return {};
}

function sanitisePrimitive(value) {
  if (value === null) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.length > MAX_METADATA_VALUE_LENGTH
      ? `${value.slice(0, MAX_METADATA_VALUE_LENGTH)}…`
      : value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value && typeof value === 'object') {
    return undefined;
  }
  return String(value).slice(0, MAX_METADATA_VALUE_LENGTH);
}

function sanitiseMetadata(value, depth = 0) {
  if (depth > MAX_METADATA_DEPTH) {
    return {};
  }

  const source = coerceMetadataObject(value);
  const entries = Object.entries(source).slice(0, MAX_METADATA_ENTRIES);

  return entries.reduce((acc, [key, rawValue]) => {
    if (typeof key !== 'string' || !key.trim()) {
      return acc;
    }

    const normalisedKey = key.trim().slice(0, 120);

    if (rawValue === undefined) {
      return acc;
    }

    if (Array.isArray(rawValue)) {
      const sanitisedArray = rawValue
        .slice(0, MAX_METADATA_ENTRIES)
        .map((item) => {
          if (isPlainObject(item)) {
            return sanitiseMetadata(item, depth + 1);
          }
          const primitive = sanitisePrimitive(item);
          return primitive === undefined ? null : primitive;
        })
        .filter((item) => item !== undefined);

      acc[normalisedKey] = sanitisedArray;
      return acc;
    }

    if (isPlainObject(rawValue)) {
      acc[normalisedKey] = sanitiseMetadata(rawValue, depth + 1);
      return acc;
    }

    const primitive = sanitisePrimitive(rawValue);
    if (primitive !== undefined) {
      acc[normalisedKey] = primitive;
    }
    return acc;
  }, {});
}

function sanitiseFollowPayload(payload = {}) {
  return {
    source: clampString(payload.source, { maxLength: MAX_SOURCE_LENGTH, defaultValue: 'manual' }),
    reason: clampString(payload.reason, { maxLength: MAX_REASON_LENGTH }),
    metadata: sanitiseMetadata(payload.metadata)
  };
}

function sanitiseModerationPayload(payload = {}) {
  return {
    reason: clampString(payload.reason, { maxLength: MAX_REASON_LENGTH }),
    metadata: sanitiseMetadata(payload.metadata),
    expiresAt: payload.expiresAt ?? null
  };
}

function normalizePageSize(requested, fallback, maximum) {
  if (requested === undefined || requested === null || requested === '') {
    return fallback;
  }

  const parsed = Number(requested);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(1, parsed), maximum);
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
    const followerId = normaliseId(actorId, 'actorId');
    const targetId = normaliseId(targetUserId, 'targetUserId');

    if (followerId === targetId) {
      const error = new Error('You cannot follow yourself');
      error.status = 400;
      throw error;
    }

    await ensureUserExists(targetId);

    return db.transaction(async (trx) => {
      await assertNotBlocked(followerId, targetId, trx);

      const privacy = await UserPrivacySettingModel.getForUser(targetId, trx);
      const existing = await UserFollowModel.findRelationship(followerId, targetId, trx);

      if (existing && existing.status === 'accepted') {
        return existing;
      }

      const requiresApproval = privacy.followApprovalRequired || privacy.profileVisibility === 'private';
      const status = requiresApproval ? 'pending' : 'accepted';

      const sanitisedPayload = sanitiseFollowPayload(payload);

      const relationship = await UserFollowModel.upsertRelationship(
        followerId,
        targetId,
        {
          status,
          source: sanitisedPayload.source,
          reason: sanitisedPayload.reason,
          metadata: sanitisedPayload.metadata,
          acceptedAt: requiresApproval ? null : trx.fn.now()
        },
        trx
      );

      await SocialAuditLogModel.record(
        {
          userId: followerId,
          targetUserId: targetId,
          action: status === 'accepted' ? 'follow.accepted' : 'follow.requested',
          source: sanitisedPayload.source,
          metadata: {
            previousStatus: existing?.status ?? null
          }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: targetId,
          eventType: status === 'accepted' ? 'social.follow.accepted' : 'social.follow.requested',
          payload: {
            followerId,
            targetUserId: targetId,
            requiresApproval
          },
          performedBy: followerId
        },
        trx
      );

      logger.info(
        {
          followerId,
          targetUserId: targetId,
          status,
          requiresApproval
        },
        'Follow relationship processed'
      );

      if (status === 'accepted') {
        await safeExecute(
          () => FollowRecommendationModel.markConsumed(targetId, followerId, 'followed-back', trx),
          { followerId, targetUserId: targetId },
          'Failed to mark recommendation as consumed after follow acceptance'
        );

        await safeExecute(
          async () => {
            const mutualFollowersCount = await UserFollowModel.countFollowers(followerId, trx);
            await FollowRecommendationModel.upsert(
              targetId,
              followerId,
              {
                score: 75,
                mutualFollowersCount,
                reasonCode: 'follow_back_suggestion',
                metadata: { triggeredBy: 'follow.accepted' }
              },
              trx
            );
          },
          { followerId, targetUserId: targetId },
          'Failed to enqueue reciprocal follow recommendation'
        );
      }

      return relationship;
    });
  }

  static async approveFollow(targetUserId, followerId, actorId) {
    const targetId = normaliseId(targetUserId, 'targetUserId');
    const follower = normaliseId(followerId, 'followerId');
    const actor = normaliseId(actorId, 'actorId');

    if (actor !== targetId) {
      const error = new Error('Only the target user can approve follow requests');
      error.status = 403;
      throw error;
    }

    await ensureUserExists(follower);

    return db.transaction(async (trx) => {
      const relationship = await UserFollowModel.findRelationship(follower, targetId, trx);
      if (!relationship || relationship.status !== 'pending') {
        const error = new Error('No pending follow request found');
        error.status = 404;
        throw error;
      }

      const updated = await UserFollowModel.updateStatus(
        follower,
        targetId,
        'accepted',
        { acceptedAt: trx.fn.now() },
        trx
      );

      await SocialAuditLogModel.record(
        {
          userId: targetId,
          targetUserId: follower,
          action: 'follow.approved',
          metadata: { previousStatus: relationship.status }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: targetId,
          eventType: 'social.follow.approved',
          payload: {
            followerId: follower,
            approverId: actor
          },
          performedBy: actor
        },
        trx
      );

      await safeExecute(
        () => FollowRecommendationModel.markConsumed(targetId, follower, 'approved', trx),
        { followerId: follower, targetUserId: targetId },
        'Failed to mark recommendation as consumed after follow approval'
      );

      await safeExecute(
        async () => {
          const mutualFollowersCount = await UserFollowModel.countFollowers(targetId, trx);
          await FollowRecommendationModel.upsert(
            follower,
            targetId,
            {
              score: 70,
              mutualFollowersCount,
              reasonCode: 'follow_back_suggestion',
              metadata: { triggeredBy: 'follow.approved' }
            },
            trx
          );
        },
        { followerId: follower, targetUserId: targetId },
        'Failed to queue reciprocal recommendation after approval'
      );

      logger.info(
        {
          followerId: follower,
          targetUserId: targetId,
          actorId: actor
        },
        'Follow request approved'
      );

      return updated;
    });
  }

  static async declineFollow(targetUserId, followerId, actorId) {
    const targetId = normaliseId(targetUserId, 'targetUserId');
    const follower = normaliseId(followerId, 'followerId');
    const actor = normaliseId(actorId, 'actorId');

    if (actor !== targetId) {
      const error = new Error('Only the target user can decline follow requests');
      error.status = 403;
      throw error;
    }

    return db.transaction(async (trx) => {
      const relationship = await UserFollowModel.findRelationship(follower, targetId, trx);
      if (!relationship || relationship.status !== 'pending') {
        const error = new Error('No pending follow request found');
        error.status = 404;
        throw error;
      }

      const updated = await UserFollowModel.updateStatus(
        follower,
        targetId,
        'declined',
        { reason: 'Declined by user' },
        trx
      );

      await SocialAuditLogModel.record(
        {
          userId: targetId,
          targetUserId: follower,
          action: 'follow.declined',
          metadata: { previousStatus: relationship.status }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: targetId,
          eventType: 'social.follow.declined',
          payload: {
            followerId: follower,
            declinerId: actor
          },
          performedBy: actor
        },
        trx
      );

      await safeExecute(
        () => FollowRecommendationModel.markConsumed(targetId, follower, 'declined', trx),
        { followerId: follower, targetUserId: targetId },
        'Failed to mark recommendation as consumed after follow decline'
      );
      logger.info(
        {
          followerId: follower,
          targetUserId: targetId,
          actorId: actor
        },
        'Follow request declined'
      );
      return updated;
    });
  }

  static async removeFollower(targetUserId, followerId, actorId) {
    const targetId = normaliseId(targetUserId, 'targetUserId');
    const follower = normaliseId(followerId, 'followerId');
    const actor = normaliseId(actorId, 'actorId');

    if (actor !== targetId) {
      const error = new Error('Only the target user can remove followers');
      error.status = 403;
      throw error;
    }

    await ensureUserExists(follower);

    return db.transaction(async (trx) => {
      const relationship = await UserFollowModel.findRelationship(follower, targetId, trx);
      if (!relationship) {
        const error = new Error('Follower relationship not found');
        error.status = 404;
        throw error;
      }

      await UserFollowModel.deleteRelationship(follower, targetId, trx);

      await SocialAuditLogModel.record(
        {
          userId: targetId,
          targetUserId: follower,
          action: 'follow.removed',
          metadata: { previousStatus: relationship.status, removedBy: 'target_user' }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: targetId,
          eventType: 'social.follower.removed',
          payload: {
            followerId: follower,
            previousStatus: relationship.status,
            removedBy: actor
          },
          performedBy: actor
        },
        trx
      );

      logger.info(
        {
          followerId: follower,
          targetUserId: targetId,
          actorId: actor,
          previousStatus: relationship.status
        },
        'Follower removed by target user'
      );

      return relationship;
    });
  }

  static async unfollowUser(actorId, targetUserId) {
    const followerId = normaliseId(actorId, 'actorId');
    const targetId = normaliseId(targetUserId, 'targetUserId');

    if (followerId === targetId) {
      const error = new Error('You cannot unfollow yourself');
      error.status = 400;
      throw error;
    }

    return db.transaction(async (trx) => {
      const existing = await UserFollowModel.findRelationship(followerId, targetId, trx);
      if (!existing) {
        return null;
      }

      await UserFollowModel.deleteRelationship(followerId, targetId, trx);

      await SocialAuditLogModel.record(
        {
          userId: followerId,
          targetUserId: targetId,
          action: 'follow.removed',
          metadata: { previousStatus: existing.status }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: targetId,
          eventType: 'social.follow.removed',
          payload: {
            followerId,
            previousStatus: existing.status
          },
          performedBy: followerId
        },
        trx
      );

      await safeExecute(
        () =>
          FollowRecommendationModel.upsert(
            followerId,
            targetId,
            {
              score: 30,
              mutualFollowersCount: 0,
              reasonCode: 'reconnect_prompt',
              metadata: { triggeredBy: 'follow.removed' }
            },
            trx
          ),
        { followerId, targetUserId: targetId },
        'Failed to queue reconnect recommendation after unfollow'
      );

      logger.info(
        {
          followerId,
          targetUserId: targetId,
          previousStatus: existing.status
        },
        'Follow relationship removed'
      );

      return existing;
    });
  }

  static async muteUser(actorId, targetUserId, payload = {}) {
    const actor = normaliseId(actorId, 'actorId');
    const targetId = normaliseId(targetUserId, 'targetUserId');

    if (actor === targetId) {
      const error = new Error('You cannot mute yourself');
      error.status = 400;
      throw error;
    }

    await ensureUserExists(targetId);

    const moderationPayload = sanitiseModerationPayload(payload);
    const durationMinutes =
      payload.durationMinutes && Number.isFinite(Number(payload.durationMinutes))
        ? Number(payload.durationMinutes)
        : mute.defaultDurationDays * 24 * 60;
    const mutedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

    return db.transaction(async (trx) => {
      const record = await UserMuteModel.mute(
        actor,
        targetId,
        {
          mutedUntil: payload.durationMinutes ? mutedUntil : null,
          reason: moderationPayload.reason,
          metadata: moderationPayload.metadata
        },
        trx
      );

      await SocialAuditLogModel.record(
        {
          userId: actor,
          targetUserId: targetId,
          action: 'mute.applied',
          metadata: { durationMinutes }
        },
        trx
      );

      logger.debug(
        {
          actorId: actor,
          targetUserId: targetId,
          durationMinutes
        },
        'Mute applied to user'
      );

      return record;
    });
  }

  static async unmuteUser(actorId, targetUserId) {
    const actor = normaliseId(actorId, 'actorId');
    const targetId = normaliseId(targetUserId, 'targetUserId');

    return db.transaction(async (trx) => {
      await UserMuteModel.unmute(actor, targetId, trx);
      await SocialAuditLogModel.record(
        {
          userId: actor,
          targetUserId: targetId,
          action: 'mute.removed'
        },
        trx
      );

      logger.debug(
        {
          actorId: actor,
          targetUserId: targetId
        },
        'Mute removed from user'
      );
    });
  }

  static async blockUser(actorId, targetUserId, payload = {}) {
    const actor = normaliseId(actorId, 'actorId');
    const targetId = normaliseId(targetUserId, 'targetUserId');

    if (actor === targetId) {
      const error = new Error('You cannot block yourself');
      error.status = 400;
      throw error;
    }

    await ensureUserExists(targetId);

    const moderationPayload = sanitiseModerationPayload(payload);

    return db.transaction(async (trx) => {
      const record = await UserBlockModel.block(
        actor,
        targetId,
        {
          reason: moderationPayload.reason,
          metadata: moderationPayload.metadata,
          expiresAt: moderationPayload.expiresAt
        },
        trx
      );

      await UserFollowModel.removeBetween(actor, targetId, trx);
      await safeExecute(
        () => UserMuteModel.unmute(actor, targetId, trx),
        { actorId: actor, targetUserId: targetId },
        'Failed to remove mute when blocking user'
      );
      await safeExecute(
        () => UserMuteModel.unmute(targetId, actor, trx),
        { actorId: actor, targetUserId: targetId },
        'Failed to remove reciprocal mute when blocking user'
      );
      await safeExecute(
        () => FollowRecommendationModel.delete(actor, targetId, trx),
        { actorId: actor, targetUserId: targetId },
        'Failed to purge outgoing recommendation after block'
      );
      await safeExecute(
        () => FollowRecommendationModel.delete(targetId, actor, trx),
        { actorId: actor, targetUserId: targetId },
        'Failed to purge incoming recommendation after block'
      );

      await SocialAuditLogModel.record(
        {
          userId: actor,
          targetUserId: targetId,
          action: 'block.applied',
          metadata: { reason: moderationPayload.reason }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: targetId,
          eventType: 'social.block.applied',
          payload: {
            blockerId: actor,
            reason: moderationPayload.reason
          },
          performedBy: actor
        },
        trx
      );

      logger.warn(
        {
          actorId: actor,
          targetUserId: targetId,
          reason: moderationPayload.reason ?? null
        },
        'User blocked'
      );

      return record;
    });
  }

  static async unblockUser(actorId, targetUserId) {
    const actor = normaliseId(actorId, 'actorId');
    const targetId = normaliseId(targetUserId, 'targetUserId');

    return db.transaction(async (trx) => {
      await UserBlockModel.unblock(actor, targetId, trx);
      await SocialAuditLogModel.record(
        {
          userId: actor,
          targetUserId: targetId,
          action: 'block.removed'
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: targetId,
          eventType: 'social.block.removed',
          payload: {
            blockerId: actor
          },
          performedBy: actor
        },
        trx
      );

      logger.info(
        {
          actorId: actor,
          targetUserId: targetId
        },
        'User unblocked'
      );
    });
  }

  static async listFollowers(subjectId, viewerId, query = {}) {
    const subject = normaliseId(subjectId, 'subjectId');
    const viewer = normaliseId(viewerId, 'viewerId');

    await ensureUserExists(subject);

    const pageSize = normalizePageSize(query.limit, followDefaultPageSize, followMaxPageSize);
    const offsetCandidate = Number(query.offset ?? 0);
    const offset = Number.isFinite(offsetCandidate) && offsetCandidate > 0 ? offsetCandidate : 0;

    const access = await validatePrivacyAccess(viewer, subject, db);
    if (!access.allowed) {
      const error = new Error(
        access.reason === 'blocked' ? 'Access denied' : 'Followers list is restricted'
      );
      error.status = access.reason === 'blocked' ? 403 : 403;
      throw error;
    }

    const search = clampString(query.search, { maxLength: 120, defaultValue: null });

    const { items, total } = await UserFollowModel.listFollowers(subject, {
      limit: pageSize,
      offset,
      status: query.status ?? 'accepted',
      search
    });

    const viewerContext = await buildViewerContext(viewer, subject, db);

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
    const subject = normaliseId(subjectId, 'subjectId');
    const viewer = normaliseId(viewerId, 'viewerId');

    await ensureUserExists(subject);

    const pageSize = normalizePageSize(query.limit, followDefaultPageSize, followMaxPageSize);
    const offsetCandidate = Number(query.offset ?? 0);
    const offset = Number.isFinite(offsetCandidate) && offsetCandidate > 0 ? offsetCandidate : 0;

    if (viewer !== subject) {
      await assertNotBlocked(viewer, subject, db);
    }

    const search = clampString(query.search, { maxLength: 120, defaultValue: null });

    const { items, total } = await UserFollowModel.listFollowing(subject, {
      limit: pageSize,
      offset,
      status: query.status ?? 'accepted',
      search
    });

    const viewerContext = await buildViewerContext(viewer, subject, db);

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
    const subjectId = normaliseId(userId, 'userId');

    const limit = normalizePageSize(
      query.limit,
      recommendations.maxResults,
      recommendations.maxResults
    );

    const stored = await FollowRecommendationModel.listForUser(subjectId, { limit });
    const collectedIds = new Set(stored.map((item) => item.user.id));

    if (stored.length >= limit) {
      return stored.slice(0, limit);
    }

    const missing = limit - stored.length;
    const mutuals = await UserFollowModel.findMutualCandidates(subjectId, {
      limit: missing * 2,
      excludeIds: [subjectId, ...collectedIds]
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

  static async listMutedUsers(userId) {
    const subjectId = normaliseId(userId, 'userId');
    const records = await UserMuteModel.listForUser(subjectId, db);
    if (!records.length) {
      return [];
    }

    const users = await UserModel.findByIds(records.map((record) => record.mutedUserId), db);
    const userMap = new Map(users.map((user) => [user.id, user]));

    return records.map((record) => ({
      mute: record,
      user: userMap.get(record.mutedUserId) ?? null
    }));
  }

  static async listBlockedUsers(userId) {
    const subjectId = normaliseId(userId, 'userId');
    const records = await UserBlockModel.listForUser(subjectId, db);
    if (!records.length) {
      return [];
    }

    const users = await UserModel.findByIds(records.map((record) => record.blockedUserId), db);
    const userMap = new Map(users.map((user) => [user.id, user]));

    return records.map((record) => ({
      block: record,
      user: userMap.get(record.blockedUserId) ?? null
    }));
  }

  static async getPrivacySettings(userId, actorId) {
    const subject = normaliseId(userId, 'userId');
    const actor = normaliseId(actorId, 'actorId');

    if (subject !== actor) {
      const error = new Error('You can only view your own privacy settings');
      error.status = 403;
      throw error;
    }

    return UserPrivacySettingModel.getForUser(subject);
  }

  static async updatePrivacySettings(userId, actorId, payload) {
    const subject = normaliseId(userId, 'userId');
    const actor = normaliseId(actorId, 'actorId');

    if (subject !== actor) {
      const error = new Error('You can only update your own privacy settings');
      error.status = 403;
      throw error;
    }

    const metadata = payload?.metadata !== undefined ? sanitiseMetadata(payload.metadata) : undefined;

    const settingsPayload = {};
    if (payload?.profileVisibility !== undefined) settingsPayload.profileVisibility = payload.profileVisibility;
    if (payload?.followApprovalRequired !== undefined) {
      settingsPayload.followApprovalRequired = Boolean(payload.followApprovalRequired);
    }
    if (payload?.messagePermission !== undefined) settingsPayload.messagePermission = payload.messagePermission;
    if (payload?.shareActivity !== undefined) settingsPayload.shareActivity = Boolean(payload.shareActivity);
    if (metadata !== undefined) settingsPayload.metadata = metadata;

    return db.transaction(async (trx) => {
      const settings = await UserPrivacySettingModel.upsert(
        subject,
        settingsPayload,
        trx
      );

      await SocialAuditLogModel.record(
        {
          userId: subject,
          action: 'privacy.updated',
          metadata: settings
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: subject,
          eventType: 'social.privacy.updated',
          payload: settings,
          performedBy: subject
        },
        trx
      );

      return settings;
    });
  }
}
