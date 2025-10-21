import db from '../config/database.js';
import CommunityModel from '../models/CommunityModel.js';
import CommunityMemberModel from '../models/CommunityMemberModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import UserModel from '../models/UserModel.js';

const MANAGER_ROLES = new Set(['owner', 'admin']);

function isActiveMembership(membership) {
  return membership?.status === 'active';
}

function canManageMembers(membership, actorRole) {
  if (actorRole === 'admin') {
    return true;
  }
  return isActiveMembership(membership) && MANAGER_ROLES.has(membership?.role);
}

function normaliseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags
      .map((tag) => String(tag).trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  return String(tags)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function buildMetadata(existing = {}, updates = {}) {
  const next = { ...existing };
  if (updates.title !== undefined) {
    next.title = updates.title || null;
  }
  if (updates.location !== undefined) {
    next.location = updates.location || null;
  }
  if (updates.tags !== undefined) {
    next.tags = normaliseTags(updates.tags);
  }
  if (updates.notes !== undefined) {
    next.notes = updates.notes || null;
  }
  return next;
}

async function resolveCommunityForActor(communityIdentifier, actorId, actorRole) {
  if (!communityIdentifier) {
    const error = new Error('Community not specified');
    error.status = 400;
    throw error;
  }
  const community = Number.isInteger(Number(communityIdentifier))
    ? await CommunityModel.findById(Number(communityIdentifier))
    : await CommunityModel.findBySlug(String(communityIdentifier));
  if (!community) {
    const error = new Error('Community not found');
    error.status = 404;
    throw error;
  }
  const membership = await CommunityMemberModel.findMembership(community.id, actorId);
  if (!canManageMembers(membership, actorRole)) {
    const error = new Error('You do not have permission to manage members in this community');
    error.status = membership ? 403 : 404;
    throw error;
  }
  return { community, membership };
}

async function resolveUserIdentifier({ userId, email }) {
  if (userId) {
    const user = await UserModel.findById(Number(userId));
    if (user) {
      return user;
    }
  }
  if (email) {
    const user = await UserModel.findByEmail(String(email).trim().toLowerCase());
    if (user) {
      return user;
    }
  }
  const error = new Error('User not found');
  error.status = 404;
  throw error;
}

async function hydrateMembers(members) {
  if (!members.length) return [];
  const userIds = Array.from(new Set(members.map((member) => member.userId))).filter(Boolean);
  const users = userIds.length ? await UserModel.findByIds(userIds) : [];
  const directory = new Map(users.map((user) => [user.id, user]));
  return members.map((member) => {
    const user = directory.get(member.userId) ?? null;
    return {
      ...member,
      metadata: member.metadata ?? {},
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
          }
        : null
    };
  });
}

export default class CommunityMemberAdminService {
  static async listMembers(communityIdentifier, actorId, { status, role, search } = {}, { actorRole } = {}) {
    const { community } = await resolveCommunityForActor(communityIdentifier, actorId, actorRole);
    const members = await CommunityMemberModel.listByCommunity(community.id, { status, role });
    const hydratedMembers = await hydrateMembers(members);
    if (!search) {
      return hydratedMembers;
    }

    const term = search.trim().toLowerCase();
    return hydratedMembers.filter((member) => {
      const metadata = member.metadata ?? {};
      const metadataValues = Object.values(metadata).flatMap((value) =>
        Array.isArray(value) ? value : value !== undefined && value !== null ? [value] : []
      );
      const metadataMatch = metadataValues.some((value) =>
        String(value).toLowerCase().includes(term)
      );
      const userMatch = [member.user?.email, member.user?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
      const identifierMatch = member.userId != null && String(member.userId).includes(term);
      return metadataMatch || userMatch || identifierMatch;
    });
  }

  static async createMember(communityIdentifier, actorId, payload = {}, { actorRole } = {}) {
    const { community } = await resolveCommunityForActor(communityIdentifier, actorId, actorRole);
    const user = await resolveUserIdentifier({ userId: payload.userId, email: payload.email });

    const metadata = buildMetadata({}, payload);
    const role = payload.role ?? 'member';
    const status = payload.status ?? 'active';

    const member = await db.transaction(async (trx) => {
      const existing = await CommunityMemberModel.ensureMembership(
        community.id,
        user.id,
        { role, status, metadata },
        trx
      );

      let updated = existing;
      if (existing.role !== role) {
        updated = await CommunityMemberModel.updateRole(community.id, user.id, role, trx);
      }
      if (status && existing.status !== status) {
        updated = await CommunityMemberModel.updateStatus(community.id, user.id, status, trx);
      }
      await CommunityMemberModel.updateMetadata(community.id, user.id, metadata, trx);
      await DomainEventModel.record(
        {
          entityType: 'community_member',
          entityId: `${community.id}:${user.id}`,
          eventType: 'community.member.invited',
          payload: {
            communityId: community.id,
            role,
            status
          },
          performedBy: actorId
        },
        trx
      );
      return updated;
    });

    const hydrated = await hydrateMembers([{ ...member, metadata }]);
    return hydrated[0];
  }

  static async updateMember(communityIdentifier, actorId, targetUserId, updates = {}, { actorRole } = {}) {
    const { community } = await resolveCommunityForActor(communityIdentifier, actorId, actorRole);
    const membership = await CommunityMemberModel.findMembership(community.id, Number(targetUserId));
    if (!membership) {
      const error = new Error('Membership not found');
      error.status = 404;
      throw error;
    }

    const metadata = buildMetadata(membership.metadata, updates);

    const updated = await db.transaction(async (trx) => {
      let current = membership;
      if (updates.role && updates.role !== membership.role) {
        current = await CommunityMemberModel.updateRole(community.id, membership.userId, updates.role, trx);
      }
      if (updates.status && updates.status !== membership.status) {
        current = await CommunityMemberModel.updateStatus(community.id, membership.userId, updates.status, trx);
      }
      await CommunityMemberModel.updateMetadata(community.id, membership.userId, metadata, trx);
      await DomainEventModel.record(
        {
          entityType: 'community_member',
          entityId: `${community.id}:${membership.userId}`,
          eventType: 'community.member.updated',
          payload: {
            communityId: community.id,
            role: updates.role ?? current.role,
            status: updates.status ?? current.status
          },
          performedBy: actorId
        },
        trx
      );
      return current;
    });

    const hydrated = await hydrateMembers([{ ...updated, metadata }]);
    return hydrated[0];
  }

  static async removeMember(communityIdentifier, actorId, targetUserId, { actorRole } = {}) {
    const { community } = await resolveCommunityForActor(communityIdentifier, actorId, actorRole);
    const membership = await CommunityMemberModel.findMembership(community.id, Number(targetUserId));
    if (!membership) {
      const error = new Error('Membership not found');
      error.status = 404;
      throw error;
    }
    if (membership.role === 'owner') {
      const error = new Error('Community owners cannot be removed');
      error.status = 422;
      throw error;
    }

    const updated = await db.transaction(async (trx) => {
      const result = await CommunityMemberModel.markLeft(community.id, membership.userId, trx);
      await DomainEventModel.record(
        {
          entityType: 'community_member',
          entityId: `${community.id}:${membership.userId}`,
          eventType: 'community.member.removed',
          payload: { communityId: community.id },
          performedBy: actorId
        },
        trx
      );
      return result;
    });

    const hydrated = await hydrateMembers([updated]);
    return hydrated[0];
  }
}
