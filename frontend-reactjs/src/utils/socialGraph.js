function formatPersonName(user = {}) {
  const firstName = user.firstName ?? user.given_name ?? '';
  const lastName = user.lastName ?? user.family_name ?? '';
  const name = `${firstName} ${lastName}`.trim();
  if (name.length > 0) {
    return name;
  }
  if (user.email) {
    return user.email;
  }
  return 'Community member';
}

function buildRoleLabel(user = {}) {
  if (!user.role) {
    return 'Member';
  }
  const role = user.role.toString();
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function normaliseMetadataTagline(metadata = {}) {
  if (!metadata || typeof metadata !== 'object') {
    return 'Edulure community member';
  }

  const preferredKey = ['context', 'note', 'message', 'reason', 'source'];
  for (const key of preferredKey) {
    if (typeof metadata[key] === 'string' && metadata[key].trim().length > 0) {
      return metadata[key]
        .trim()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^\w/, (char) => char.toUpperCase());
    }
  }

  const firstEntry = Object.entries(metadata).find(([, value]) => typeof value === 'string' && value.trim().length > 0);
  if (firstEntry) {
    const [key, value] = firstEntry;
    return `${key.replace(/[_-]+/g, ' ')}: ${value}`;
  }

  return 'Edulure community member';
}

function computeTrustScore(seed) {
  const base = 72;
  const spread = 24;
  if (!seed) {
    return base;
  }

  const value = typeof seed === 'number' ? seed : String(seed);
  let hash = 0;
  if (typeof value === 'string') {
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0; // Convert to 32bit integer
    }
  } else {
    hash = Number(value) || 0;
  }

  return Math.min(99, base + (Math.abs(hash) % spread));
}

export function mapFollowerItem(item) {
  const user = item?.user ?? {};
  const relationship = item?.relationship ?? {};
  const identifier = user.id ?? relationship.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id: identifier,
    name: formatPersonName(user),
    role: buildRoleLabel(user),
    tagline: normaliseMetadataTagline(relationship.metadata),
    trust: computeTrustScore(identifier),
    relationship
  };
}

export function mapRecommendationItem(item) {
  const user = item?.user ?? {};
  const recommendation = item?.recommendation ?? {};
  const identifier =
    user.id ?? recommendation.recommendedUserId ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id: identifier,
    name: formatPersonName(user),
    role: buildRoleLabel(user),
    tagline: normaliseMetadataTagline(recommendation.metadata ?? {}),
    score: recommendation.score ?? null,
    mutualFollowers: recommendation.mutualFollowersCount ?? 0,
    recommendation
  };
}

export function buildRoleLabelFromUser(user) {
  return buildRoleLabel(user);
}

export function formatPersonDisplayName(user) {
  return formatPersonName(user);
}

export function computeTrustIndicator(seed) {
  return computeTrustScore(seed);
}

export function resolveRelationshipTagline(metadata) {
  return normaliseMetadataTagline(metadata);
}
