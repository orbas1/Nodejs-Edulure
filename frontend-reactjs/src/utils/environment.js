const DEFAULT_ENVIRONMENT = Object.freeze({
  key: 'local',
  name: 'Local Development',
  tier: 'development',
  region: 'local',
  workspace: null
});

function isPlainObject(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function sanitizeString(value, fallback = '') {
  if (value === null || value === undefined) {
    return fallback;
  }
  const trimmed = String(value).trim();
  return trimmed || fallback;
}

function titleCase(value, fallback = '') {
  const safe = sanitizeString(value, fallback);
  if (!safe) {
    return fallback;
  }
  return safe
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function parseEnvironmentCandidate(candidate) {
  if (!candidate) {
    return null;
  }

  if (typeof candidate === 'string') {
    const key = sanitizeString(candidate);
    if (!key) {
      return null;
    }
    return {
      key,
      name: titleCase(key, DEFAULT_ENVIRONMENT.name),
      tier: DEFAULT_ENVIRONMENT.tier,
      region: DEFAULT_ENVIRONMENT.region,
      workspace: DEFAULT_ENVIRONMENT.workspace
    };
  }

  if (typeof candidate === 'object') {
    const source = isPlainObject(candidate) ? candidate : { ...candidate };
    const key =
      sanitizeString(
        source.key ?? source.slug ?? source.id ?? source.environment ?? source.code,
        DEFAULT_ENVIRONMENT.key
      );
    const tier = sanitizeString(source.tier ?? source.stage ?? source.type ?? source.mode, DEFAULT_ENVIRONMENT.tier);
    const region = sanitizeString(
      source.region ?? source.location ?? source.geo ?? source.datacenter ?? source.cluster,
      DEFAULT_ENVIRONMENT.region
    );
    const workspace = sanitizeString(
      source.workspace ?? source.workspaceId ?? source.tenant ?? source.accountId ?? source.projectId,
      ''
    );
    const name = sanitizeString(source.name ?? source.label ?? titleCase(key), DEFAULT_ENVIRONMENT.name);

    return {
      key,
      name,
      tier,
      region,
      workspace: workspace || null
    };
  }

  return null;
}

function resolveWindowEnvironment() {
  if (typeof window === 'undefined') {
    return null;
  }

  const runtime = window.__EDULURE_RUNTIME__ ?? window.__EDULURE_ENVIRONMENT__ ?? null;
  if (!runtime) {
    return null;
  }

  if (runtime.environment) {
    return runtime.environment;
  }

  return runtime;
}

function parseJsonCandidate(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse runtime environment JSON', error);
    return null;
  }
}

function resolveInitialEnvironment() {
  const windowCandidate = parseEnvironmentCandidate(resolveWindowEnvironment());
  if (windowCandidate) {
    return Object.freeze(windowCandidate);
  }

  const envJsonCandidate = parseEnvironmentCandidate(
    parseJsonCandidate(
      import.meta.env.VITE_RUNTIME_ENVIRONMENT_JSON ??
        import.meta.env.VITE_ENVIRONMENT_DESCRIPTOR ??
        null
    )
  );
  if (envJsonCandidate) {
    return Object.freeze(envJsonCandidate);
  }

  const envKeyCandidate = parseEnvironmentCandidate({
    key:
      import.meta.env.VITE_RUNTIME_ENVIRONMENT ??
      import.meta.env.VITE_ENVIRONMENT_KEY ??
      import.meta.env.MODE ??
      DEFAULT_ENVIRONMENT.key,
    name: import.meta.env.VITE_ENVIRONMENT_NAME,
    tier: import.meta.env.VITE_ENVIRONMENT_TIER,
    region: import.meta.env.VITE_ENVIRONMENT_REGION,
    workspace: import.meta.env.VITE_ENVIRONMENT_WORKSPACE
  });

  return Object.freeze(envKeyCandidate ?? DEFAULT_ENVIRONMENT);
}

let currentEnvironment = resolveInitialEnvironment();

export function getEnvironmentContext() {
  return currentEnvironment;
}

export function setEnvironmentContext(nextContext) {
  const resolved = parseEnvironmentCandidate(nextContext);
  if (!resolved) {
    return currentEnvironment;
  }
  currentEnvironment = Object.freeze({ ...DEFAULT_ENVIRONMENT, ...resolved });
  return currentEnvironment;
}

export function resetEnvironmentContext() {
  currentEnvironment = DEFAULT_ENVIRONMENT;
  return currentEnvironment;
}

export function resolveEnvironmentDescriptor(override) {
  if (override === undefined || override === null) {
    return currentEnvironment;
  }
  const resolved = parseEnvironmentCandidate(override);
  if (!resolved) {
    return currentEnvironment;
  }
  return Object.freeze({ ...DEFAULT_ENVIRONMENT, ...resolved });
}

export function buildEnvironmentHeaders(descriptor = currentEnvironment) {
  const headers = {};
  const context = resolveEnvironmentDescriptor(descriptor);
  if (context.key) {
    headers['X-Edulure-Environment'] = context.key;
  }
  if (context.tier) {
    headers['X-Edulure-Environment-Tier'] = context.tier;
  }
  if (context.region) {
    headers['X-Edulure-Region'] = context.region;
  }
  if (context.workspace) {
    headers['X-Edulure-Workspace'] = context.workspace;
  }
  return headers;
}

export function getEnvironmentCacheKey(descriptor = currentEnvironment) {
  const context = resolveEnvironmentDescriptor(descriptor);
  const workspaceSegment = context.workspace ? `workspace:${context.workspace}` : 'workspace:none';
  return `env:${context.key}|tier:${context.tier}|region:${context.region}|${workspaceSegment}`;
}

export function getEnvironmentAuditStamp(descriptor = currentEnvironment) {
  const context = resolveEnvironmentDescriptor(descriptor);
  return {
    environment: context.key,
    tier: context.tier,
    region: context.region,
    workspace: context.workspace,
    capturedAt: new Date().toISOString()
  };
}

export { DEFAULT_ENVIRONMENT };
