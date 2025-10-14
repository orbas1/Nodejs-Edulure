export const COMMUNITY_ROLE_POLICY = {
  learner: {
    canViewFeed: true,
    canPost: true,
    canJoin: true,
    canModerate: false,
    canManageSubscriptions: true,
    canViewLocations: true
  },
  instructor: {
    canViewFeed: true,
    canPost: true,
    canJoin: true,
    canModerate: true,
    canManageSubscriptions: true,
    canViewLocations: true
  },
  admin: {
    canViewFeed: true,
    canPost: true,
    canJoin: true,
    canModerate: true,
    canManageSubscriptions: true,
    canViewLocations: true
  },
  moderator: {
    canViewFeed: true,
    canPost: true,
    canJoin: true,
    canModerate: true,
    canManageSubscriptions: false,
    canViewLocations: true
  },
  guest: {
    canViewFeed: false,
    canPost: false,
    canJoin: false,
    canModerate: false,
    canManageSubscriptions: false,
    canViewLocations: false
  }
};

export const DEFAULT_COMMUNITY_ROLE = 'guest';

export function getCommunityPolicyForRole(role) {
  if (!role) {
    return COMMUNITY_ROLE_POLICY[DEFAULT_COMMUNITY_ROLE];
  }
  const normalisedRole = String(role).toLowerCase();
  return COMMUNITY_ROLE_POLICY[normalisedRole] ?? COMMUNITY_ROLE_POLICY[DEFAULT_COMMUNITY_ROLE];
}
