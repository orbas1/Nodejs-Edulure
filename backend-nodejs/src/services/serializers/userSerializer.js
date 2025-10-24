import TwoFactorService from '../TwoFactorService.js';

function parseJsonObject(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (_error) {
    return fallback;
  }

  return fallback;
}

function toIso(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toNonNegativeInteger(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.trunc(numeric));
}

function normalisePinnedNavigation(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const deduped = new Set();
  value.forEach((entry) => {
    if (typeof entry !== 'string') {
      return;
    }
    const trimmed = entry.trim();
    if (trimmed.length) {
      deduped.add(trimmed);
    }
  });
  return Array.from(deduped);
}

function parseDashboardPreferences(value) {
  const parsed = parseJsonObject(value, {});
  return {
    ...parsed,
    pinnedNavigation: normalisePinnedNavigation(parsed?.pinnedNavigation)
  };
}

function parseStoredAddress(address) {
  if (!address) {
    return null;
  }

  if (typeof address === 'object' && !Array.isArray(address)) {
    return Object.keys(address).length ? address : null;
  }

  if (typeof address !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(address);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed).reduce((acc, [key, value]) => {
        if (typeof value === 'string' && value.trim().length > 0) {
          acc[key] = value.trim();
        }
        return acc;
      }, {});
      return Object.keys(entries).length ? entries : null;
    }
  } catch (_error) {
    if (address.trim().length > 0) {
      return { streetAddress: address.trim() };
    }
  }

  if (address.trim().length > 0) {
    return { streetAddress: address.trim() };
  }

  return null;
}

function parseActiveLiveRoom(value) {
  const parsed = parseJsonObject(value, null);
  if (!parsed) {
    return null;
  }

  const id = typeof parsed.id === 'string' ? parsed.id.trim() : '';
  if (!id) {
    return null;
  }

  const normalised = {
    id,
    title:
      typeof parsed.title === 'string' && parsed.title.trim().length > 0 ? parsed.title.trim() : undefined,
    startedAt: toIso(parsed.startedAt ?? parsed.started_at ?? null) ?? undefined,
    endsAt: toIso(parsed.endsAt ?? parsed.ends_at ?? null) ?? undefined,
    courseId:
      typeof parsed.courseId === 'string' && parsed.courseId.trim().length > 0
        ? parsed.courseId.trim()
        : typeof parsed.course_id === 'string' && parsed.course_id.trim().length > 0
          ? parsed.course_id.trim()
          : undefined,
    communityId:
      typeof parsed.communityId === 'string' && parsed.communityId.trim().length > 0
        ? parsed.communityId.trim()
        : typeof parsed.community_id === 'string' && parsed.community_id.trim().length > 0
          ? parsed.community_id.trim()
          : undefined,
    hostRole:
      typeof parsed.hostRole === 'string' && parsed.hostRole.trim().length > 0
        ? parsed.hostRole.trim()
        : typeof parsed.role === 'string' && parsed.role.trim().length > 0
          ? parsed.role.trim()
          : undefined,
    roomUrl:
      typeof parsed.roomUrl === 'string' && parsed.roomUrl.trim().length > 0 ? parsed.roomUrl.trim() : undefined
  };

  Object.keys(normalised).forEach((key) => {
    if (normalised[key] === undefined) {
      delete normalised[key];
    }
  });

  return normalised;
}

function parseProfileSocialLinks(raw) {
  const parsed = parseJsonObject(raw, []);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((entry) => ({
      label: typeof entry?.label === 'string' && entry.label.trim().length ? entry.label.trim() : null,
      url: typeof entry?.url === 'string' && entry.url.trim().length ? entry.url.trim() : null,
      handle: typeof entry?.handle === 'string' && entry.handle.trim().length ? entry.handle.trim() : null
    }))
    .filter((entry) => entry.url);
}

function normaliseRoleAssignments(source) {
  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((assignment) => {
      if (!assignment) {
        return null;
      }
      const roleKey = assignment.roleKey ?? assignment.role_key ?? null;
      if (typeof roleKey !== 'string' || roleKey.trim().length === 0) {
        return null;
      }

      return {
        id: assignment.id ?? null,
        roleKey: roleKey.trim(),
        scopeType: (assignment.scopeType ?? assignment.scope_type ?? 'global') || 'global',
        scopeId: assignment.scopeId ?? assignment.scope_id ?? null,
        assignedBy: assignment.assignedBy ?? assignment.assigned_by ?? null,
        assignedAt: toIso(assignment.assignedAt ?? assignment.assigned_at ?? null),
        expiresAt: toIso(assignment.expiresAt ?? assignment.expires_at ?? null),
        metadata: parseJsonObject(assignment.metadata ?? assignment.metadata_json ?? {}, {}),
        revokedAt: toIso(assignment.revokedAt ?? assignment.revoked_at ?? null),
        revokedBy: assignment.revokedBy ?? assignment.revoked_by ?? null,
        revokedReason: assignment.revokedReason ?? assignment.revoked_reason ?? null
      };
    })
    .filter((assignment) => assignment !== null);
}

function collectRoles(user, options) {
  const set = new Set();
  const addRole = (value) => {
    if (typeof value !== 'string') {
      return;
    }
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      set.add(trimmed);
    }
  };

  addRole(user.role ?? null);
  if (Array.isArray(user.roles)) {
    user.roles.forEach(addRole);
  }
  if (Array.isArray(options.roles)) {
    options.roles.forEach(addRole);
  }

  const assignmentSource = Array.isArray(options.roleAssignments)
    ? options.roleAssignments
    : Array.isArray(user.roleAssignments)
      ? user.roleAssignments
      : [];

  assignmentSource.forEach((assignment) => addRole(assignment?.roleKey ?? assignment?.role_key));

  return Array.from(set);
}

export function serializeUser(user, options = {}) {
  if (!user) {
    return null;
  }

  const dashboardPreferences = parseDashboardPreferences(
    user.dashboardPreferences ?? user.dashboard_preferences ?? {}
  );

  const activeLiveRoom =
    parseActiveLiveRoom(user.activeLiveRoom ?? user.active_live_room ?? null) ??
    (dashboardPreferences.activeLiveRoom ? parseActiveLiveRoom(dashboardPreferences.activeLiveRoom) : null);

  const roleAssignments = normaliseRoleAssignments(
    Array.isArray(options.roleAssignments)
      ? options.roleAssignments
      : Array.isArray(user.roleAssignments)
        ? user.roleAssignments
        : []
  );
  const roles = collectRoles({ ...user, roleAssignments }, options);

  return {
    id: user.id,
    firstName: user.firstName ?? user.first_name ?? null,
    lastName: user.lastName ?? user.last_name ?? null,
    email: user.email ?? null,
    role: user.role ?? null,
    age: user.age ?? null,
    address: parseStoredAddress(user.address),
    dashboardPreferences,
    pinnedNavigation: dashboardPreferences.pinnedNavigation,
    unreadCommunityCount: toNonNegativeInteger(user.unreadCommunityCount ?? user.unread_community_count),
    pendingPayouts: toNonNegativeInteger(user.pendingPayouts ?? user.pending_payouts),
    activeLiveRoom,
    twoFactorEnabled: TwoFactorService.isTwoFactorEnabled(user),
    twoFactorEnrolledAt: user.twoFactorEnrolledAt ?? user.two_factor_enrolled_at ?? null,
    twoFactorLastVerifiedAt: user.twoFactorLastVerifiedAt ?? user.two_factor_last_verified_at ?? null,
    createdAt: user.createdAt ?? user.created_at ?? null,
    updatedAt: user.updatedAt ?? user.updated_at ?? null,
    emailVerifiedAt: user.emailVerifiedAt ?? user.email_verified_at ?? null,
    lastLoginAt: user.lastLoginAt ?? user.last_login_at ?? null,
    roles,
    roleAssignments
  };
}

export function serializeUserProfile(profileRecord) {
  if (!profileRecord) {
    return null;
  }

  return {
    id: profileRecord.id,
    displayName: profileRecord.displayName ?? null,
    tagline: profileRecord.tagline ?? null,
    location: profileRecord.location ?? null,
    avatarUrl: profileRecord.avatarUrl ?? null,
    bannerUrl: profileRecord.bannerUrl ?? null,
    bio: profileRecord.bio ?? null,
    socialLinks: parseProfileSocialLinks(profileRecord.socialLinks),
    metadata: parseJsonObject(profileRecord.metadata, {}),
    createdAt: profileRecord.createdAt ?? null,
    updatedAt: profileRecord.updatedAt ?? null
  };
}

export function serializeUserWithProfile(userRecord, profileRecord) {
  const base = serializeUser(userRecord);
  if (!base) {
    return null;
  }

  return {
    ...base,
    profile: serializeUserProfile(profileRecord)
  };
}

export default serializeUser;
