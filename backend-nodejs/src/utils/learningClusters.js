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
