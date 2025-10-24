const ACTIVE_STATUSES = new Set(['active', 'trial', 'trialing', 'complimentary']);
const MODERATOR_ROLES = new Set(['owner', 'admin', 'moderator']);
const RESOURCE_MANAGER_ROLES = new Set(['owner', 'admin', 'moderator']);
const COMMUNITY_MANAGER_ROLES = new Set(['owner', 'admin']);
const MEMBER_MANAGER_ROLES = new Set(['owner', 'admin']);

function normaliseStatus(status) {
  return typeof status === 'string' ? status.trim().toLowerCase() : '';
}

function normaliseRole(role) {
  return typeof role === 'string' ? role.trim().toLowerCase() : '';
}

function isAdminRole(actorRole) {
  return normaliseRole(actorRole) === 'admin';
}

export function isActiveMembership(membership) {
  if (!membership) return false;
  const status = normaliseStatus(membership.status);
  return ACTIVE_STATUSES.has(status);
}

export function canModerateMembership(membership, actorRole) {
  if (isAdminRole(actorRole)) {
    return true;
  }
  return isActiveMembership(membership) && MODERATOR_ROLES.has(normaliseRole(membership?.role));
}

export function canManageResources(membership, actorRole) {
  if (isAdminRole(actorRole)) {
    return true;
  }
  return isActiveMembership(membership) && RESOURCE_MANAGER_ROLES.has(normaliseRole(membership?.role));
}

export function canManageCommunity(membership, actorRole) {
  if (isAdminRole(actorRole)) {
    return true;
  }
  return isActiveMembership(membership) && COMMUNITY_MANAGER_ROLES.has(normaliseRole(membership?.role));
}

export function canManageSponsorships(membership, actorRole) {
  if (isAdminRole(actorRole)) {
    return true;
  }
  return isActiveMembership(membership) && RESOURCE_MANAGER_ROLES.has(normaliseRole(membership?.role));
}

export function canManageMembers(membership, actorRole) {
  if (isAdminRole(actorRole)) {
    return true;
  }
  return isActiveMembership(membership) && MEMBER_MANAGER_ROLES.has(normaliseRole(membership?.role));
}

export function permissionDenied(message, membership, fallbackStatus = 403) {
  const error = new Error(message);
  error.status = membership ? fallbackStatus : 404;
  return error;
}

export default {
  isActiveMembership,
  canModerateMembership,
  canManageResources,
  canManageCommunity,
  canManageSponsorships,
  canManageMembers,
  permissionDenied
};
