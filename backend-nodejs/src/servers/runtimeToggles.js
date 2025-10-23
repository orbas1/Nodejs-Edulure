function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalised = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalised)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalised)) {
    return false;
  }
  return fallback;
}

const PRESET_ALIASES = new Map([
  ['analytics', 'ads-analytics'],
  ['adsanalytics', 'ads-analytics'],
  ['ads_analytics', 'ads-analytics'],
  ['ads', 'ads-analytics'],
  ['fullstack', 'full'],
  ['production', 'full']
]);

const PRESET_DEFAULTS = {
  lite: {
    enableJobs: false,
    enableRealtime: false,
    enableSearchRefresh: false,
    jobGroups: 'core'
  },
  full: {
    enableJobs: true,
    enableRealtime: true,
    enableSearchRefresh: true,
    jobGroups: 'core,monetisation,telemetry,analytics'
  },
  'ads-analytics': {
    enableJobs: true,
    enableRealtime: false,
    enableSearchRefresh: true,
    jobGroups: 'core,analytics'
  }
};

function normalisePresetToken(raw) {
  if (!raw) {
    return 'lite';
  }
  const token = String(raw).trim().toLowerCase();
  return PRESET_ALIASES.get(token) ?? token ?? 'lite';
}

function resolvePresetDefaults(preset) {
  return PRESET_DEFAULTS[preset] ?? PRESET_DEFAULTS.lite;
}

function formatJobGroups(value, fallback) {
  const source = value ?? fallback;
  if (!source) {
    return fallback ?? '';
  }

  return Array.from(
    new Set(
      String(source)
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  ).join(',');
}

export function resolvePreset(env = process.env) {
  const raw = env.SERVICE_PRESET ?? env.RUNTIME_PRESET ?? 'lite';
  return normalisePresetToken(raw) || 'lite';
}

export function resolveRuntimeToggles(env = process.env) {
  const preset = resolvePreset(env);
  const defaults = resolvePresetDefaults(preset);

  const enableJobs = parseBoolean(env.SERVICE_ENABLE_JOBS, defaults.enableJobs);
  const enableRealtime = parseBoolean(env.SERVICE_ENABLE_REALTIME, defaults.enableRealtime);
  const enableSearchRefresh = parseBoolean(env.SERVICE_ENABLE_SEARCH_REFRESH, defaults.enableSearchRefresh);
  const jobGroups = formatJobGroups(env.SERVICE_JOB_GROUPS, defaults.jobGroups);

  return {
    preset,
    enableJobs,
    enableRealtime,
    enableSearchRefresh,
    jobGroups
  };
}

export default resolveRuntimeToggles;
