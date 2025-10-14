import { useMemo } from 'react';

import { useAuth } from '../context/AuthContext.jsx';
import { getCommunityPolicyForRole, DEFAULT_COMMUNITY_ROLE } from '../config/communityPolicy.js';

export function useAuthorization() {
  const { session } = useAuth();
  const role = session?.user?.role ? String(session.user.role).toLowerCase() : DEFAULT_COMMUNITY_ROLE;

  return useMemo(() => {
    const policy = getCommunityPolicyForRole(role);
    return {
      role,
      policy,
      canAccessCommunityFeed: Boolean(policy.canViewFeed),
      canPostToCommunities: Boolean(policy.canPost),
      canJoinCommunities: Boolean(policy.canJoin),
      canModerateCommunities: Boolean(policy.canModerate),
      canManageCommunitySubscriptions: Boolean(policy.canManageSubscriptions),
      canViewCommunityLocations: Boolean(policy.canViewLocations)
    };
  }, [role]);
}
