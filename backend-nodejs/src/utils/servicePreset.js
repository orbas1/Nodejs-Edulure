export function resolveServicePreset({
  preset = 'lite',
  serviceTarget,
  serviceJobGroups
} = {}) {
  const trimmedPreset = typeof preset === 'string' && preset.trim().length ? preset.trim() : 'lite';
  const hasCustomTarget = typeof serviceTarget === 'string' && serviceTarget.trim().length > 0;
  const trimmedTarget = hasCustomTarget ? serviceTarget.trim() : undefined;

  let target = trimmedTarget;
  let jobGroups = serviceJobGroups;

  if (!hasCustomTarget) {
    if (trimmedPreset === 'full' || trimmedPreset === 'analytics') {
      target = 'web,worker,realtime';
    } else {
      target = 'web';
    }
  }

  if (trimmedPreset === 'analytics') {
    if (!jobGroups && !hasCustomTarget) {
      jobGroups = 'core,analytics';
    }
  } else if (trimmedPreset === 'lite') {
    jobGroups = jobGroups ?? 'core';
  }

  return {
    preset: trimmedPreset,
    target,
    jobGroups,
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

export default applyServicePreset;
