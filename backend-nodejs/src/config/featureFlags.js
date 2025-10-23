import process from 'node:process';

import { featureFlagManifest } from './featureFlagManifest.js';

const JOB_FLAG_KEYS = {
  telemetry: 'platform.jobs.telemetry',
  monetisation: 'platform.jobs.monetisation',
  analytics: 'platform.jobs.analytics',
  ads: 'platform.jobs.ads'
};

function parseBoolean(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalised = String(value).trim().toLowerCase();
  if (!normalised) {
    return undefined;
  }
  if (['true', '1', 'yes', 'y', 'on', 'enabled'].includes(normalised)) {
    return true;
  }
  if (['false', '0', 'no', 'n', 'off', 'disabled'].includes(normalised)) {
    return false;
  }
  return undefined;
}

function manifestFlagEnabled(key) {
  const entry = featureFlagManifest.find((flag) => flag.key === key);
  return entry?.enabled === true;
}

export function getJobFeatureSnapshot({ overrides = {} } = {}) {
  const snapshot = {};

  for (const [name, key] of Object.entries(JOB_FLAG_KEYS)) {
    const envOverride = parseBoolean(process.env[`FEATURE_FLAG_${name.toUpperCase()}_JOBS`]);
    if (envOverride !== undefined) {
      snapshot[name] = envOverride;
      continue;
    }

    if (overrides[name] !== undefined) {
      snapshot[name] = Boolean(overrides[name]);
      continue;
    }

    snapshot[name] = manifestFlagEnabled(key);
  }

  return snapshot;
}

export function isTelemetryJobsEnabled(options) {
  return getJobFeatureSnapshot(options).telemetry === true;
}

export function isMonetisationJobsEnabled(options) {
  return getJobFeatureSnapshot(options).monetisation === true;
}

export function isAnalyticsJobsEnabled(options) {
  return getJobFeatureSnapshot(options).analytics === true;
}

export function isAdsJobsEnabled(options) {
  return getJobFeatureSnapshot(options).ads === true;
}
