import { useMemo } from 'react';

import { useAuth } from '../context/AuthContext.jsx';
import { getCommunityPolicyForRole, DEFAULT_COMMUNITY_ROLE } from '../config/communityPolicy.js';

const BASE_ROLE_TO_COMMUNITY_ROLE = {
  learner: 'member',
  instructor: 'owner',
  admin: 'admin',
  moderator: 'moderator'
};

function mergePolicies(basePolicy, communityPolicy) {
  const keys = new Set([...Object.keys(basePolicy ?? {}), ...Object.keys(communityPolicy ?? {})]);
  const result = {};

  keys.forEach((key) => {
    const baseValue = Boolean(basePolicy?.[key]);
    if (communityPolicy?.[key] === undefined) {
      result[key] = baseValue;
    } else {
      result[key] = Boolean(baseValue && communityPolicy[key]);
    }
  });

  return result;
}

export function useAuthorization() {
  const { session, permissions, hasPermission, activeTenantId } = useAuth();
  const baseRole = session?.user?.role ? String(session.user.role).toLowerCase() : DEFAULT_COMMUNITY_ROLE;
  const derivedCommunityRole = session?.user?.communityRole
    ? String(session.user.communityRole).toLowerCase()
    : BASE_ROLE_TO_COMMUNITY_ROLE[baseRole] ?? (baseRole === DEFAULT_COMMUNITY_ROLE ? 'non-member' : baseRole);

  const mergedPolicy = useMemo(() => {
    const basePolicy = getCommunityPolicyForRole(baseRole);
    const communityPolicy = getCommunityPolicyForRole(derivedCommunityRole);
    return mergePolicies(basePolicy, communityPolicy);
  }, [baseRole, derivedCommunityRole]);

  return useMemo(() => {
    const actorTenants = Array.isArray(session?.tenants) ? session.tenants : [];
    const activeTenant = actorTenants.find((tenant) => tenant.id === activeTenantId) ?? actorTenants[0] ?? null;
    const opsPermissions = {
      canViewOperations: hasPermission('ops.dashboard.view') || baseRole === 'admin',
      canManageSupport: hasPermission('support.cases.manage'),
      canReviewTrustSafety: hasPermission('trust_safety.cases.review') || hasPermission('moderation.cases.review'),
      canBroadcastIncidents: hasPermission('operations.incidents.broadcast')
    };

    return {
      role: derivedCommunityRole,
      baseRole,
      policy: mergedPolicy,
      canAccessCommunityFeed: Boolean(mergedPolicy.canViewFeed),
      canPostToCommunities: Boolean(mergedPolicy.canPost),
      canJoinCommunities: Boolean(mergedPolicy.canJoin),
      canModerateCommunities: Boolean(mergedPolicy.canModerate),
      canManageCommunitySubscriptions: Boolean(mergedPolicy.canManageSubscriptions),
      canViewCommunityLocations: Boolean(mergedPolicy.canViewLocations),
      permissions,
      hasPermission,
      activeTenant,
      tenants: actorTenants,
      operations: opsPermissions
    };
  }, [
    activeTenantId,
    baseRole,
    derivedCommunityRole,
    hasPermission,
    mergedPolicy,
    permissions,
    session?.tenants
  ]);
}
