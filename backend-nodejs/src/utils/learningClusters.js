export const LEARNING_CLUSTER_KEYS = ['operations', 'growth', 'enablement', 'community', 'general'];

export function normaliseClusterKey(value, fallback = 'general') {
  if (value === null || value === undefined) {
    return fallback;
  }
  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed) {
    return fallback;
  }
  return LEARNING_CLUSTER_KEYS.includes(trimmed) ? trimmed : fallback;
}

export function describeClusterLabel(key, fallback = 'General') {
  if (key === null || key === undefined) {
    return fallback;
  }
  const trimmed = String(key).trim();
  if (!trimmed) {
    return fallback;
  }
  const normalised = trimmed.replace(/[-_]+/g, ' ');
  return normalised
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}
