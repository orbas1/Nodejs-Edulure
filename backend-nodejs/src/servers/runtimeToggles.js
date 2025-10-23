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

export function resolvePreset(env = process.env) {
  const raw = env.SERVICE_PRESET ?? env.RUNTIME_PRESET ?? 'lite';
  return String(raw).trim().toLowerCase() || 'lite';
}

export function resolveRuntimeToggles(env = process.env) {
  const preset = resolvePreset(env);

  const enableJobs = parseBoolean(env.SERVICE_ENABLE_JOBS, preset !== 'lite');
  const enableRealtime = parseBoolean(env.SERVICE_ENABLE_REALTIME, preset !== 'lite');
  const enableSearchRefresh = parseBoolean(env.SERVICE_ENABLE_SEARCH_REFRESH, preset !== 'lite');

  const jobGroups = (env.SERVICE_JOB_GROUPS ?? (preset === 'lite' ? 'core' : 'all')).trim();

  return {
    preset,
    enableJobs,
    enableRealtime,
    enableSearchRefresh,
    jobGroups
  };
}

export default resolveRuntimeToggles;
