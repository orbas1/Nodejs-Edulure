export const ENVIRONMENT_SLUG_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;

function trimSlug(slug) {
  return slug.replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function normaliseEnvironmentSlug(value, { fallback = null } = {}) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const input = String(value).trim();
  if (!input) {
    return fallback;
  }

  let slug = trimSlug(input.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

  if (!slug) {
    return fallback;
  }

  if (!/^[a-z]/.test(slug)) {
    slug = trimSlug(`env-${slug}`);
  }

  if (!slug) {
    return fallback;
  }

  if (slug.length > 32) {
    slug = trimSlug(slug.slice(0, 32));
  }

  if (!slug) {
    return fallback;
  }

  if (!ENVIRONMENT_SLUG_PATTERN.test(slug)) {
    return fallback;
  }

  return slug;
}

export default normaliseEnvironmentSlug;
