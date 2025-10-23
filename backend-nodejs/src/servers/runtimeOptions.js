const AVAILABLE_SERVICE_TARGETS = ['web', 'worker', 'realtime'];

const PRESET_TARGETS = new Map([
  ['lite', ['web']],
  ['full', ['web', 'worker', 'realtime']],
  ['analytics', ['web', 'worker']],
  ['ads-analytics', ['web', 'worker', 'realtime']]
]);

const PRESET_JOB_GROUPS = new Map([
  ['lite', ['core', 'search']],
  ['full', ['core', 'search', 'engagement', 'telemetry', 'monetization', 'integrations']],
  ['analytics', ['core', 'search', 'telemetry']],
  ['ads-analytics', ['core', 'search', 'engagement', 'telemetry', 'monetization', 'integrations', 'ads']]
]);

export const LOG_PREFIXES = Object.freeze({
  jobs: '\u001b[36m[jobs]\u001b[0m',
  realtime: '\u001b[35m[realtime]\u001b[0m',
  search: '\u001b[32m[search]\u001b[0m'
});

function normalisePreset(rawPreset) {
  if (!rawPreset) {
    return 'lite';
  }
  const preset = String(rawPreset).trim().toLowerCase();
  if (PRESET_TARGETS.has(preset)) {
    return preset;
  }
  switch (preset) {
    case 'production':
      return 'full';
    case 'dev':
    case 'development':
      return 'lite';
    default:
      return 'lite';
  }
}

function toArrayTokens(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normaliseTargetTokens(tokens, availableTargets) {
  const seen = new Set();
  const resolved = [];
  const allowList = new Set(availableTargets);
  const entries = toArrayTokens(tokens);

  if (!entries.length) {
    return [];
  }

  entries.forEach((token) => {
    const normalised = token.toLowerCase();
    if (normalised === 'all') {
      availableTargets.forEach((target) => {
        if (!seen.has(target)) {
          seen.add(target);
          resolved.push(target);
        }
      });
      return;
    }

    if (!allowList.has(normalised)) {
      throw new Error(
        `Unknown service target "${token}". Supported targets: ${availableTargets.join(', ')}`
      );
    }

    if (!seen.has(normalised)) {
      seen.add(normalised);
      resolved.push(normalised);
    }
  });

  return resolved;
}

export function resolveServiceTargets({
  explicitTargets,
  envSource = process.env,
  availableTargets = AVAILABLE_SERVICE_TARGETS
} = {}) {
  const preset = normalisePreset(envSource.SERVICE_PRESET);
  const fromExplicit = normaliseTargetTokens(explicitTargets, availableTargets);

  if (fromExplicit.length) {
    return { preset, targets: fromExplicit };
  }

  const fromEnv = normaliseTargetTokens(envSource.SERVICE_TARGET, availableTargets);
  if (fromEnv.length) {
    return { preset, targets: fromEnv };
  }

  const presetTargets = PRESET_TARGETS.get(preset) ?? PRESET_TARGETS.get('lite');
  return { preset, targets: presetTargets.filter((target) => availableTargets.includes(target)) };
}

function resolveJobGroups({ preset, rawValue }) {
  const explicit = new Set(
    toArrayTokens(rawValue).map((token) => token.trim().toLowerCase()).filter(Boolean)
  );

  if (explicit.size) {
    return explicit;
  }

  const defaults = PRESET_JOB_GROUPS.get(preset) ?? PRESET_JOB_GROUPS.get('lite');
  const groups = new Set(defaults.map((entry) => entry.toLowerCase()));
  groups.add('core');
  groups.add('search');
  return groups;
}

export function resolveRuntimeOptions({
  envSource = process.env,
  availableTargets = AVAILABLE_SERVICE_TARGETS
} = {}) {
  const { preset, targets } = resolveServiceTargets({ envSource, availableTargets });
  const jobGroups = resolveJobGroups({ preset, rawValue: envSource.SERVICE_JOB_GROUPS });
  return { preset, targets, jobGroups, logPrefixes: LOG_PREFIXES };
}

export function jobGroupEnabled(jobGroups, group, { defaultEnabled = false } = {}) {
  if (!jobGroups || jobGroups.size === 0) {
    return defaultEnabled;
  }
  if (jobGroups.has('all')) {
    return true;
  }
  if (group === 'core') {
    return jobGroups.has('core');
  }
  return jobGroups.has(group) || (defaultEnabled && jobGroups.has('core'));
}

export function formatLog(prefix, message) {
  if (!prefix) {
    return message;
  }
  return `${prefix} ${message}`;
}
