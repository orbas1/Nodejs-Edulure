const PRESET_DEFINITIONS = {
  lite: {
    key: 'lite',
    label: 'Lite stack',
    description:
      'Web server only with the minimum background orchestration required for local development or single-node preview demos.',
    defaultTargets: ['web'],
    defaultJobGroups: ['core']
  },
  full: {
    key: 'full',
    label: 'Full stack',
    description:
      'Web, worker, and realtime services with all background schedulers enabled for staging or production parity environments.',
    defaultTargets: ['web', 'worker', 'realtime'],
    defaultJobGroups: ['core', 'engagement', 'governance', 'analytics', 'monetization']
  },
  'ads-analytics': {
    key: 'ads-analytics',
    label: 'Ads & analytics stack',
    description:
      'Web and worker services with analytics/monetisation schedulers enabled while keeping community engagement jobs paused.',
    defaultTargets: ['web', 'worker'],
    defaultJobGroups: ['core', 'analytics', 'monetization']
  }
};

const PRESET_ALIASES = {
  analytics: 'ads-analytics'
};

function normalisePresetKey(rawPreset) {
  const value = typeof rawPreset === 'string' && rawPreset.trim().length ? rawPreset.trim().toLowerCase() : 'lite';
  const aliasTarget = PRESET_ALIASES[value];
  const key = aliasTarget ?? value;
  return PRESET_DEFINITIONS[key] ? key : 'lite';
}

function toList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => (Array.isArray(entry) ? entry : String(entry).split(',')))
      .map((entry) => String(entry).trim())
      .filter(Boolean);
  }

  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function uniqueCsv(values) {
  const seen = new Set();
  const ordered = [];
  for (const value of values) {
    const token = String(value).trim().toLowerCase();
    if (!seen.has(token)) {
      seen.add(token);
      ordered.push(token);
    }
  }
  return ordered.join(',');
}

export function resolveServicePreset({
  preset = 'lite',
  serviceTarget,
  serviceJobGroups
} = {}) {
  const presetKey = normalisePresetKey(preset);
  const definition = PRESET_DEFINITIONS[presetKey] ?? PRESET_DEFINITIONS.lite;

  const explicitTargets = toList(serviceTarget);
  const hasCustomTarget = explicitTargets.length > 0;
  const targetList = hasCustomTarget ? explicitTargets : definition.defaultTargets;

  const jobGroupList = (() => {
    const customGroups = toList(serviceJobGroups);
    if (customGroups.length) {
      return customGroups;
    }
    return definition.defaultJobGroups;
  })();

  return {
    preset: definition.key,
    target: uniqueCsv(targetList),
    jobGroups: jobGroupList.length ? uniqueCsv(jobGroupList) : undefined,
    hasCustomTarget
  };
}

export function applyServicePreset(env = process.env) {
  const currentEnv = env ?? process.env;
  const result = resolveServicePreset({
    preset: currentEnv.SERVICE_PRESET,
    serviceTarget: currentEnv.SERVICE_TARGET,
    serviceJobGroups: currentEnv.SERVICE_JOB_GROUPS
  });

  currentEnv.SERVICE_PRESET = result.preset;
  if (result.target) {
    currentEnv.SERVICE_TARGET = result.target;
  }
  if (result.jobGroups) {
    currentEnv.SERVICE_JOB_GROUPS = result.jobGroups;
  } else {
    delete currentEnv.SERVICE_JOB_GROUPS;
  }

  return result;
}

export { PRESET_DEFINITIONS };

export default applyServicePreset;
