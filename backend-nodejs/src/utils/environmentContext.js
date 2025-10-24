import { env } from '../config/env.js';

function toSlug(value, fallback = 'local') {
  if (!value) {
    return fallback;
  }
  const normalised = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalised || fallback;
}

function coalesce(value, fallback = null) {
  if (value === undefined || value === null) {
    return fallback;
  }
  const trimmed = typeof value === 'string' ? value.trim() : value;
  return trimmed === '' ? fallback : trimmed;
}

function resolveBaseDescriptor(overrides = {}) {
  const name = coalesce(overrides.name, env.environment?.name ?? env.nodeEnv ?? 'Local');
  const key = toSlug(overrides.key ?? name);
  return {
    key,
    name,
    provider: coalesce(overrides.provider, env.environment?.provider ?? 'aws'),
    tier: coalesce(overrides.tier, env.environment?.tier ?? env.nodeEnv ?? 'development'),
    region: coalesce(overrides.region, env.environment?.region ?? process.env.AWS_REGION ?? 'us-east-1'),
    workspace: coalesce(overrides.workspace, env.environment?.workspace ?? null),
    releaseChannel: coalesce(overrides.releaseChannel, env.environment?.releaseChannel ?? env.environment?.deploymentStrategy ?? null)
  };
}

export function getEnvironmentDescriptor(overrides = {}) {
  return resolveBaseDescriptor(overrides);
}

export function formatEnvironmentResponse(overrides = {}) {
  const descriptor = resolveBaseDescriptor(overrides);
  return {
    key: descriptor.key,
    name: descriptor.name,
    tier: descriptor.tier,
    region: descriptor.region,
    workspace: descriptor.workspace
  };
}

export function buildEnvironmentColumns(overrides = {}) {
  const descriptor = resolveBaseDescriptor(overrides);
  return {
    environment_key: descriptor.key,
    environment_name: descriptor.name,
    environment_tier: descriptor.tier,
    environment_region: descriptor.region,
    environment_workspace: descriptor.workspace
  };
}

export function applyEnvironmentFilter(builder, overrides = {}) {
  const descriptor = resolveBaseDescriptor(overrides);
  if (builder && typeof builder.where === 'function') {
    builder.where('environment_key', descriptor.key);
  }
  return builder;
}
