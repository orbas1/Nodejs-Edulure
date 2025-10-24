const DEFAULT_AUDIENCE = 'public';
const DEFAULT_DISABLED_MESSAGE = 'Service temporarily unavailable. Please try again later.';
const DEFAULT_ALLOWED_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const DEFAULT_ALLOWED_HEADERS = ['authorization', 'content-type', 'x-request-id', 'x-correlation-id'];
const DEFAULT_EXPOSED_HEADERS = ['content-type', 'content-length', 'x-request-id', 'x-correlation-id'];
const SERVICE_TIERS = new Set(['critical', 'core', 'supporting', 'experimental']);

function ensureArray(value, { fallback = [], map = (item) => item } = {}) {
  const raw = Array.isArray(value)
    ? value
    : value === undefined || value === null
      ? fallback
      : [value];

  const result = [];
  const seen = new Set();

  for (const item of raw) {
    if (item === undefined || item === null) {
      continue;
    }

    const mapped = map(item);
    if (mapped === undefined || mapped === null) {
      continue;
    }

    const normalised = typeof mapped === 'string' ? mapped.trim() : mapped;
    if (typeof normalised === 'string' && normalised.length === 0) {
      continue;
    }

    const key = typeof normalised === 'string' ? normalised.toLowerCase() : JSON.stringify(normalised);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalised);
  }

  return result;
}

function normaliseBasePath(name, basePath) {
  if (typeof basePath !== 'string') {
    throw new TypeError(`Route \`${name}\` must declare a basePath string.`);
  }

  const trimmed = basePath.trim();
  if (!trimmed.startsWith('/')) {
    throw new Error(`Route \`${name}\` base path must start with a forward slash.`);
  }

  if (trimmed === '/') {
    return trimmed;
  }

  return trimmed.replace(/\/+$/u, '');
}

function normaliseString(value, { field, routeName }) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Route \`${routeName}\` must declare a non-empty ${field}.`);
  }
  return value.trim();
}

function normaliseDescription(description, name) {
  const trimmed = normaliseString(description, { field: 'description', routeName: name });
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}

function normaliseFlagKey(flagKey, name) {
  const trimmed = normaliseString(flagKey, { field: 'flag key', routeName: name });
  if (!/^[-a-z0-9_.]+$/iu.test(trimmed)) {
    throw new Error(`Route \`${name}\` flag key contains invalid characters.`);
  }
  return trimmed;
}

function normaliseAudience(audience) {
  if (audience === undefined || audience === null) {
    return DEFAULT_AUDIENCE;
  }
  if (typeof audience !== 'string') {
    throw new TypeError('Route audience must be provided as a string.');
  }
  const trimmed = audience.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : DEFAULT_AUDIENCE;
}

function normaliseDefaultState(defaultState, name) {
  if (defaultState === undefined || defaultState === null) {
    return 'enabled';
  }
  if (defaultState !== 'enabled' && defaultState !== 'disabled') {
    throw new Error(`Route \`${name}\` default state must be either 'enabled' or 'disabled'.`);
  }
  return defaultState;
}

function normaliseFallbackStatus(fallbackStatus, defaultState, name) {
  const resolved =
    fallbackStatus === undefined || fallbackStatus === null
      ? defaultState === 'enabled'
        ? 503
        : 404
      : fallbackStatus;

  if (!Number.isInteger(resolved) || resolved < 100 || resolved > 599) {
    throw new Error(`Route \`${name}\` fallback status must be a valid HTTP status code.`);
  }

  return resolved;
}

function buildDisabledMessage(message, fallbackStatus, name) {
  if (message === undefined || message === null) {
    if (fallbackStatus === 404) {
      return `The ${name} API group is not available in this deployment.`;
    }
    if (fallbackStatus === 403) {
      return `Access to the ${name} API group is restricted for your account.`;
    }
    return DEFAULT_DISABLED_MESSAGE;
  }

  const trimmed = String(message).trim();
  if (trimmed.length === 0) {
    throw new Error(`Route \`${name}\` provided an empty disabledMessage.`);
  }

  return trimmed;
}

function normaliseServiceTier(serviceTier, name) {
  const tier = serviceTier === undefined || serviceTier === null ? 'core' : String(serviceTier).trim().toLowerCase();
  if (!SERVICE_TIERS.has(tier)) {
    throw new Error(`Route \`${name}\` declared an invalid service tier of \`${serviceTier}\`.`);
  }
  return tier;
}

function normaliseMethods(methods) {
  const values = ensureArray(methods, {
    fallback: DEFAULT_ALLOWED_METHODS,
    map: (method) => String(method).trim().toUpperCase()
  });

  if (values.length === 0) {
    values.push(...DEFAULT_ALLOWED_METHODS);
  }

  if (!values.includes('OPTIONS')) {
    values.push('OPTIONS');
  }

  return Array.from(new Set(values));
}

function normaliseCors(cors) {
  const policy =
    typeof cors?.policy === 'string' && cors.policy.trim().length > 0 ? cors.policy.trim() : 'environment-managed';
  const allowedOrigins = ensureArray(cors?.allowedOrigins, {
    fallback: ['@env:app.corsOrigins'],
    map: (origin) => String(origin).trim()
  });

  if (allowedOrigins.length === 0) {
    allowedOrigins.push('@env:app.corsOrigins');
  }

  const allowCredentials = cors?.allowCredentials === undefined ? true : Boolean(cors.allowCredentials);
  const allowedHeaders = ensureArray(cors?.allowedHeaders, {
    fallback: DEFAULT_ALLOWED_HEADERS,
    map: (header) => String(header).trim().toLowerCase()
  });
  const exposedHeaders = ensureArray(cors?.exposedHeaders, {
    fallback: DEFAULT_EXPOSED_HEADERS,
    map: (header) => String(header).trim().toLowerCase()
  });
  const allowedMethods = normaliseMethods(cors?.allowedMethods);
  const maxAgeSeconds =
    cors?.maxAgeSeconds !== undefined && Number.isFinite(cors.maxAgeSeconds) && cors.maxAgeSeconds >= 0
      ? Math.round(cors.maxAgeSeconds)
      : 600;
  const preflightContinue = cors?.preflightContinue ? Boolean(cors.preflightContinue) : false;

  return deepFreeze({
    policy,
    allowedOrigins,
    allowCredentials,
    allowedMethods,
    allowedHeaders,
    exposedHeaders,
    maxAgeSeconds,
    preflightContinue
  });
}

function normaliseRbac(rbac, name, audience) {
  const strategy =
    typeof rbac?.strategy === 'string' && rbac.strategy.trim().length > 0
      ? rbac.strategy.trim().toLowerCase()
      : 'role-based';

  if (!['role-based', 'public', 'service'].includes(strategy)) {
    throw new Error(`Route \`${name}\` RBAC strategy \`${strategy}\` is not supported.`);
  }

  const defaultRole =
    typeof rbac?.defaultRole === 'string' && rbac.defaultRole.trim().length > 0
      ? rbac.defaultRole.trim().toLowerCase()
      : audience;

  const allowedRoles = ensureArray(rbac?.allowedRoles, {
    fallback: strategy === 'public' ? ['anonymous', 'user'] : [defaultRole],
    map: (role) => String(role).trim().toLowerCase()
  });

  if (allowedRoles.length === 0 && strategy !== 'public') {
    throw new Error(`Route \`${name}\` must declare at least one allowed role.`);
  }

  if (!allowedRoles.includes(defaultRole)) {
    allowedRoles.push(defaultRole);
  }

  const elevatedRoles = ensureArray(rbac?.elevatedRoles, {
    fallback: [],
    map: (role) => String(role).trim().toLowerCase()
  });

  const enforcedBy =
    typeof rbac?.enforcedBy === 'string' && rbac.enforcedBy.trim().length > 0
      ? rbac.enforcedBy.trim()
      : 'middleware/auth.js';

  const notes = typeof rbac?.notes === 'string' && rbac.notes.trim().length > 0 ? rbac.notes.trim() : null;

  return deepFreeze({
    strategy,
    defaultRole,
    allowedRoles,
    elevatedRoles,
    enforcedBy,
    notes
  });
}

function deepFreeze(object) {
  if (!object || typeof object !== 'object') {
    return object;
  }

  for (const value of Object.values(object)) {
    deepFreeze(value);
  }

  return Object.freeze(object);
}

function defineRoute({
  name,
  capability,
  description,
  basePath,
  flagKey,
  defaultState,
  fallbackStatus,
  disabledMessage,
  audience,
  owners,
  serviceTier,
  tags,
  rbac,
  cors,
  statusPageComponent,
  runbookUrl
}) {
  const normalisedName = normaliseString(name, { field: 'name', routeName: name });
  const normalisedCapability = normaliseString(capability, { field: 'capability', routeName: normalisedName });
  const normalisedDescription = normaliseDescription(description, normalisedName);
  const normalisedBasePath = normaliseBasePath(normalisedName, basePath);
  const normalisedFlagKey = normaliseFlagKey(flagKey, normalisedName);
  const normalisedDefaultState = normaliseDefaultState(defaultState, normalisedName);
  const normalisedFallbackStatus = normaliseFallbackStatus(fallbackStatus, normalisedDefaultState, normalisedName);
  const normalisedAudience = normaliseAudience(audience);
  const normalisedDisabledMessage = buildDisabledMessage(
    disabledMessage,
    normalisedFallbackStatus,
    normalisedName
  );
  const normalisedOwners = ensureArray(owners, {
    fallback: [],
    map: (owner) => String(owner).trim().toLowerCase()
  });

  if (normalisedOwners.length === 0) {
    throw new Error(`Route \`${normalisedName}\` must declare at least one owning team.`);
  }

  const normalisedServiceTier = normaliseServiceTier(serviceTier, normalisedName);
  const normalisedTags = ensureArray(tags, {
    fallback: ['api', 'v1'],
    map: (tag) => String(tag).trim().toLowerCase()
  });

  const descriptor = {
    name: normalisedName,
    capability: normalisedCapability,
    description: normalisedDescription,
    basePath: normalisedBasePath,
    flagKey: normalisedFlagKey,
    defaultState: normalisedDefaultState,
    fallbackStatus: normalisedFallbackStatus,
    disabledMessage: normalisedDisabledMessage,
    audience: normalisedAudience,
    owners: deepFreeze(normalisedOwners),
    serviceTier: normalisedServiceTier,
    tags: deepFreeze(normalisedTags),
    rbac: normaliseRbac(rbac, normalisedName, normalisedAudience),
    cors: normaliseCors(cors),
    statusPageComponent:
      typeof statusPageComponent === 'string' && statusPageComponent.trim().length > 0
        ? statusPageComponent.trim()
        : null,
    runbookUrl:
      typeof runbookUrl === 'string' && runbookUrl.trim().length > 0 ? runbookUrl.trim() : null
  };

  return deepFreeze(descriptor);
}

const ROUTE_DEFINITIONS = [
  {
    name: 'auth',
    capability: 'identity-authentication',
    description: 'User registration, login, session lifecycle, and verification endpoints.',
    basePath: '/auth',
    flagKey: 'platform.api.v1.auth',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage:
      'Authentication services are temporarily unavailable. Please retry or contact support if the issue persists.',
    audience: 'public',
    owners: ['identity-platform'],
    serviceTier: 'critical',
    tags: ['api', 'v1', 'identity'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'public',
      allowedRoles: ['anonymous', 'user'],
      notes: 'Authentication endpoints combine public flows with session-aware routes.'
    },
    cors: {
      allowedOrigins: ['@env:app.corsOrigins'],
      allowedMethods: ['POST'],
      allowCredentials: true
    },
    statusPageComponent: 'api-auth',
    runbookUrl: 'https://runbooks.edulure.internal/authentication-service-outage'
  },
  {
    name: 'users',
    capability: 'user-profile-management',
    description: 'Account profile, preferences, and administrative management endpoints.',
    basePath: '/users',
    flagKey: 'platform.api.v1.users',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage: 'User management APIs are currently disabled for this environment.',
    audience: 'user',
    owners: ['account-experience'],
    serviceTier: 'critical',
    tags: ['api', 'v1', 'identity'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'user',
      allowedRoles: ['user', 'admin'],
      elevatedRoles: ['admin'],
      notes: 'Listing users requires administrator privileges via auth middleware.'
    },
    cors: {
      allowedMethods: ['GET', 'PUT']
    },
    statusPageComponent: 'api-users',
    runbookUrl: 'https://runbooks.edulure.internal/account-profile-degradation'
  },
  {
    name: 'communities',
    capability: 'community-collaboration',
    description: 'Community creation, membership, and scheduling APIs.',
    basePath: '/communities',
    flagKey: 'platform.api.v1.communities',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Community collaboration APIs are not available for this tenant.',
    audience: 'user',
    owners: ['community-experience'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'community'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'user',
      allowedRoles: ['user', 'moderator', 'admin'],
      elevatedRoles: ['moderator', 'admin'],
      notes: 'Moderation and governance flows enforce roles within controllers.'
    },
    cors: {
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    },
    statusPageComponent: 'api-communities'
  },
  {
    name: 'community-moderation',
    capability: 'community-moderation',
    description: 'Community moderation queues, scam reporting, and safety analytics APIs.',
    basePath: '/moderation',
    flagKey: 'platform.api.v1.community-moderation',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Moderation APIs are restricted for this tenant.',
    audience: 'moderator',
    owners: ['safety-operations'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'community', 'moderation'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'moderator',
      allowedRoles: ['moderator', 'admin'],
      elevatedRoles: ['admin'],
      notes: 'Requires moderator scopes enforced via auth role guards.'
    },
    cors: {
      allowedMethods: ['GET', 'POST', 'PATCH']
    },
    statusPageComponent: 'api-community-moderation'
  },
  {
    name: 'content',
    capability: 'content-library',
    description: 'Content ingestion, cataloguing, and lifecycle management endpoints.',
    basePath: '/content',
    flagKey: 'platform.api.v1.content',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage: 'Content library services are temporarily unavailable. Please retry later.',
    audience: 'creator',
    owners: ['content-platform'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'content'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'creator',
      allowedRoles: ['creator', 'admin'],
      elevatedRoles: ['admin']
    },
    cors: {
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    },
    statusPageComponent: 'api-content'
  },
  {
    name: 'creation',
    capability: 'creation-studio',
    description: 'Creation studio projects, templates, collaboration, and campaign promotion endpoints.',
    basePath: '/creation',
    flagKey: 'platform.api.v1.creation',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Creation studio is disabled for this tenant.',
    audience: 'creator',
    owners: ['creation-studio'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'creation'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'creator',
      allowedRoles: ['creator', 'ops', 'admin'],
      elevatedRoles: ['ops', 'admin'],
      notes: 'Campaign orchestration endpoints require elevated creator roles.'
    },
    cors: {
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    },
    statusPageComponent: 'api-creation'
  },
  {
    name: 'runtime-config',
    capability: 'platform-runtime-config',
    description: 'Runtime configuration and capability manifest endpoints consumed by clients.',
    basePath: '/runtime',
    flagKey: 'platform.api.v1.runtime-config',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage: 'Runtime configuration APIs are unavailable while configuration services are offline.',
    audience: 'ops',
    owners: ['platform-runtime'],
    serviceTier: 'critical',
    tags: ['api', 'v1', 'runtime'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'ops',
      allowedRoles: ['ops', 'admin'],
      elevatedRoles: ['admin'],
      notes: 'Runtime exports guarded by auth role checks and feature gate evaluation.'
    },
    cors: {
      allowedMethods: ['GET']
    },
    statusPageComponent: 'api-runtime-config',
    runbookUrl: 'https://runbooks.edulure.internal/runtime-configuration-outage'
  },
  {
    name: 'observability',
    capability: 'operational-observability',
    description: 'SLO snapshots, telemetry guardrails, and alert governance endpoints for platform operators.',
    basePath: '/observability',
    flagKey: 'platform.api.v1.observability',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Observability APIs are restricted to platform operators.',
    audience: 'admin',
    owners: ['platform-observability'],
    serviceTier: 'critical',
    tags: ['api', 'v1', 'observability'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'admin',
      allowedRoles: ['admin', 'ops'],
      elevatedRoles: ['ops'],
      notes: 'Authenticated operator sessions enforced for observability dashboards.'
    },
    cors: {
      allowedMethods: ['GET']
    },
    statusPageComponent: 'api-observability',
    runbookUrl: 'https://runbooks.edulure.internal/observability-api-degradation'
  },
  {
    name: 'environment',
    capability: 'environment-parity',
    description: 'Environment health, parity, and drift detection endpoints for infrastructure operators.',
    basePath: '/environment',
    flagKey: 'platform.api.v1.environment',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Environment parity APIs are restricted to platform administrators.',
    audience: 'admin',
    owners: ['platform-infrastructure'],
    serviceTier: 'critical',
    tags: ['api', 'v1', 'infrastructure'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'admin',
      allowedRoles: ['admin', 'ops'],
      elevatedRoles: ['ops']
    },
    cors: {
      allowedMethods: ['GET']
    },
    statusPageComponent: 'api-environment',
    runbookUrl: 'https://runbooks.edulure.internal/environment-parity-outage'
  },
  {
    name: 'telemetry',
    capability: 'telemetry-pipeline',
    description: 'Telemetry ingestion, consent governance, and warehouse export endpoints for platform services.',
    basePath: '/telemetry',
    flagKey: 'platform.api.v1.telemetry',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage: 'Telemetry APIs are currently paused while pipelines are offline.',
    audience: 'service',
    owners: ['platform-telemetry'],
    serviceTier: 'critical',
    tags: ['api', 'v1', 'telemetry'],
    rbac: {
      strategy: 'service',
      defaultRole: 'service',
      allowedRoles: ['service', 'ops'],
      elevatedRoles: ['ops'],
      notes: 'Primarily accessed via service-to-service credentials validated upstream.'
    },
    cors: {
      allowedMethods: ['POST'],
      allowedOrigins: ['@env:app.corsOrigins', 'https://ingest.edulure.com']
    },
    statusPageComponent: 'api-telemetry',
    runbookUrl: 'https://runbooks.edulure.internal/telemetry-pipeline-outage'
  },
  {
    name: 'payments',
    capability: 'payments-and-payouts',
    description: 'Payments, escrow, and billing orchestration endpoints.',
    basePath: '/payments',
    flagKey: 'platform.api.v1.payments',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage:
      'Payments are unavailable for your tenant. Please contact an administrator to enable billing capabilities.',
    audience: 'finance',
    owners: ['payments-platform'],
    serviceTier: 'critical',
    tags: ['api', 'v1', 'payments'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'finance',
      allowedRoles: ['finance', 'admin'],
      elevatedRoles: ['admin'],
      notes: 'Sensitive payment operations require finance or administrator roles.'
    },
    cors: {
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH']
    },
    statusPageComponent: 'api-payments',
    runbookUrl: 'https://runbooks.edulure.internal/payments-service-outage'
  },
  {
    name: 'account-billing',
    capability: 'account-billing-workspace',
    description: 'Authenticated billing overview, invoice history, and portal session endpoints for learners and instructors.',
    basePath: '/account/billing',
    flagKey: 'platform.api.v1.accountBilling',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage: 'Account billing APIs are temporarily unavailable. Please try again or contact support.',
    audience: 'user',
    owners: ['payments-platform', 'account-experience'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'billing'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'user',
      allowedRoles: ['user', 'admin', 'finance'],
      elevatedRoles: ['finance', 'admin'],
      notes: 'Finance users can access cross-tenant invoices while learners receive scoped results.'
    },
    cors: {
      allowedMethods: ['GET', 'POST']
    },
    statusPageComponent: 'api-account-billing',
    runbookUrl: 'https://runbooks.edulure.internal/account-billing-workspace'
  },
  {
    name: 'compliance',
    capability: 'data-governance',
    description: 'GDPR, consent management, and incident governance endpoints.',
    basePath: '/compliance',
    flagKey: 'platform.api.v1.compliance',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Compliance endpoints are restricted in this environment.',
    audience: 'compliance',
    owners: ['trust-compliance'],
    serviceTier: 'critical',
    tags: ['api', 'v1', 'compliance'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'compliance',
      allowedRoles: ['compliance', 'admin'],
      elevatedRoles: ['admin']
    },
    cors: {
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH']
    },
    statusPageComponent: 'api-compliance',
    runbookUrl: 'https://runbooks.edulure.internal/compliance-api-outage'
  },
  {
    name: 'security',
    capability: 'security-compliance-operations',
    description: 'Risk register, audit evidence, continuity planning, and security assessment governance endpoints.',
    basePath: '/security',
    flagKey: 'platform.api.v1.security',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Security operations APIs are restricted to compliance administrators.',
    audience: 'security',
    owners: ['security-operations'],
    serviceTier: 'critical',
    tags: ['api', 'v1', 'security'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'security',
      allowedRoles: ['security', 'compliance', 'admin'],
      elevatedRoles: ['admin']
    },
    cors: {
      allowedMethods: ['GET', 'POST', 'PUT']
    },
    statusPageComponent: 'api-security',
    runbookUrl: 'https://runbooks.edulure.internal/security-operations-api-outage'
  },
  {
    name: 'chat',
    capability: 'realtime-chat',
    description: 'Realtime chat messaging, channel presence, and DM APIs.',
    basePath: '/chat',
    flagKey: 'platform.api.v1.chat',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage: 'Realtime chat is currently paused for maintenance.',
    audience: 'user',
    owners: ['messaging-platform'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'messaging'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'user',
      allowedRoles: ['user', 'moderator', 'admin'],
      elevatedRoles: ['moderator', 'admin']
    },
    cors: {
      allowedMethods: ['GET', 'POST', 'PATCH', 'DELETE']
    },
    statusPageComponent: 'api-chat'
  },
  {
    name: 'social',
    capability: 'social-graph',
    description: 'Follows, recommendations, and user engagement APIs.',
    basePath: '/social',
    flagKey: 'platform.api.v1.social',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage:
      'Social graph APIs are temporarily unavailable while recommendation services recalibrate.',
    audience: 'user',
    owners: ['social-graph'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'social'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'user',
      allowedRoles: ['user', 'admin']
    },
    cors: {
      allowedMethods: ['GET', 'POST', 'DELETE']
    },
    statusPageComponent: 'api-social'
  },
  {
    name: 'feed',
    capability: 'experience-feed',
    description: 'Live feed aggregation, ad placements, and analytics query endpoints.',
    basePath: '/feed',
    flagKey: 'platform.api.v1.feed',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Live feed services are currently disabled for this tenant.',
    audience: 'user',
    owners: ['experience-feed'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'feed'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'user',
      allowedRoles: ['user', 'admin']
    },
    cors: {
      allowedMethods: ['GET', 'POST']
    },
    statusPageComponent: 'api-feed'
  },
  {
    name: 'explorer',
    capability: 'search-and-discovery',
    description: 'Explorer search, browse, and recommendation endpoints.',
    basePath: '/explorer',
    flagKey: 'platform.api.v1.explorer',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage: 'Explorer search is temporarily unavailable. Please try again later.',
    audience: 'public',
    owners: ['search-experience'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'search'],
    rbac: {
      strategy: 'public',
      defaultRole: 'public',
      allowedRoles: ['anonymous', 'user'],
      notes: 'Supports anonymous discovery as well as authenticated contexts.'
    },
    cors: {
      allowedOrigins: ['@env:app.corsOrigins', 'https://www.edulure.com'],
      allowedMethods: ['GET']
    },
    statusPageComponent: 'api-explorer'
  },
  {
    name: 'ads',
    capability: 'ads-manager',
    description: 'Advertising campaign management and insights APIs.',
    basePath: '/ads',
    flagKey: 'platform.api.v1.ads',
    defaultState: 'enabled',
    fallbackStatus: 404,
    disabledMessage: 'Ads manager is not enabled for this workspace.',
    audience: 'marketing',
    owners: ['ads-platform'],
    serviceTier: 'supporting',
    tags: ['api', 'v1', 'ads'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'marketing',
      allowedRoles: ['marketing', 'admin'],
      elevatedRoles: ['admin']
    },
    cors: {
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    },
    statusPageComponent: 'api-ads'
  },
  {
    name: 'analytics',
    capability: 'analytics-insights',
    description: 'Reporting, dashboards, and analytics export APIs including executive BI overviews.',
    basePath: '/analytics',
    flagKey: 'platform.api.v1.analytics',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage: 'Analytics exports are temporarily offline for maintenance.',
    audience: 'analyst',
    owners: ['analytics-platform'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'analytics'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'analyst',
      allowedRoles: ['analyst', 'admin'],
      elevatedRoles: ['admin']
    },
    cors: {
      allowedMethods: ['GET', 'POST']
    },
    statusPageComponent: 'api-analytics'
  },
  {
    name: 'instructor',
    capability: 'instructor-orchestration',
    description:
      'Instructor orchestration hooks for course production, tutor routing, mentor invites, and pricing exports.',
    basePath: '/instructor',
    flagKey: 'platform.api.v1.instructor',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Instructor orchestration APIs are only available to instructor workspaces.',
    audience: 'instructor',
    owners: ['instructor-operations'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'instructor'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'instructor',
      allowedRoles: ['instructor', 'admin']
    },
    cors: {
      allowedMethods: ['GET', 'POST', 'PATCH']
    },
    statusPageComponent: 'api-instructor'
  },
  {
    name: 'enablement',
    capability: 'enablement-documentation',
    description:
      'Knowledge base, training curriculum, and stakeholder communications APIs for operators and go-to-market teams.',
    basePath: '/enablement',
    flagKey: 'platform.api.v1.enablement',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Enablement documentation APIs are restricted for your role.',
    audience: 'enablement',
    owners: ['enablement-programs'],
    serviceTier: 'supporting',
    tags: ['api', 'v1', 'enablement'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'enablement',
      allowedRoles: ['enablement', 'admin'],
      elevatedRoles: ['admin']
    },
    cors: {
      allowedMethods: ['GET', 'POST']
    },
    statusPageComponent: 'api-enablement'
  },
  {
    name: 'governance',
    capability: 'stakeholder-governance',
    description:
      'Contract lifecycle, vendor risk assessments, cross-functional review cadences, and roadmap communication APIs for programme owners.',
    basePath: '/governance',
    flagKey: 'platform.api.v1.governance',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Governance APIs are restricted to programme administrators.',
    audience: 'program-admin',
    owners: ['governance-operations'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'governance'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'program-admin',
      allowedRoles: ['program-admin', 'admin', 'ops'],
      elevatedRoles: ['admin', 'ops']
    },
    cors: {
      allowedMethods: ['GET', 'POST', 'PATCH']
    },
    statusPageComponent: 'api-governance'
  },
  {
    name: 'release',
    capability: 'release-management-automation',
    description:
      'Release readiness checklists, gate evaluations, and deployment dashboard APIs for platform operators.',
    basePath: '/release',
    flagKey: 'platform.api.v1.release',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Release orchestration APIs are restricted to platform operators.',
    audience: 'ops',
    owners: ['release-operations'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'release'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'ops',
      allowedRoles: ['ops', 'admin'],
      elevatedRoles: ['admin']
    },
    cors: {
      allowedMethods: ['GET', 'POST']
    },
    statusPageComponent: 'api-release',
    runbookUrl: 'https://runbooks.edulure.internal/release-orchestration-outage'
  },
  {
    name: 'media',
    capability: 'media-asset-uploads',
    description: 'Direct upload workflows for course trailers, cover art, syllabi, and promotional media.',
    basePath: '/media',
    flagKey: 'platform.api.v1.media',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage: 'Media upload services are not currently available. Please retry later.',
    audience: 'creator',
    owners: ['media-platform'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'media'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'creator',
      allowedRoles: ['creator', 'admin']
    },
    cors: {
      allowedMethods: ['GET', 'POST', 'DELETE'],
      allowedOrigins: ['@env:app.corsOrigins', 'https://uploads.edulure.com']
    },
    statusPageComponent: 'api-media'
  },
  {
    name: 'setup',
    capability: 'platform-initialiser',
    description:
      'Turn-key installer for configuring environment variables, provisioning databases, search, realtime, worker, and frontend builds.',
    basePath: '/setup',
    flagKey: 'platform.api.v1.setup',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage: 'Automated installer is currently unavailable. Please retry shortly.',
    audience: 'ops',
    owners: ['platform-foundation'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'setup'],
    rbac: {
      strategy: 'public',
      notes: 'Installer must be reachable before authentication is configured.'
    },
    cors: {
      allowedMethods: ['GET', 'POST']
    },
    statusPageComponent: 'api-setup',
    runbookUrl: 'https://runbooks.edulure.internal/installer-troubleshooting'
  },
  {
    name: 'dashboard',
    capability: 'operator-dashboard',
    description: 'Operational dashboards, incident insights, and governance endpoints.',
    basePath: '/dashboard',
    flagKey: 'platform.api.v1.dashboard',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage: 'Dashboard APIs are unavailable at the moment. Please refresh later.',
    audience: 'user',
    owners: ['learner-experience'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'dashboard'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'user',
      allowedRoles: ['user', 'admin']
    },
    notes: 'Includes unauthenticated learner onboarding bootstrap endpoint for pre-registration flows.',
    cors: {
      allowedMethods: ['GET', 'POST', 'PATCH', 'DELETE']
    },
    statusPageComponent: 'api-dashboard'
  },
  {
    name: 'courses',
    capability: 'course-management',
    description: 'Course authoring, publishing, and lifecycle endpoints.',
    basePath: '/courses',
    flagKey: 'platform.api.v1.courses',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage: 'Course management APIs are paused for maintenance. Please retry shortly.',
    audience: 'creator',
    owners: ['course-platform'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'courses'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'creator',
      allowedRoles: ['creator', 'admin']
    },
    cors: {
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    },
    statusPageComponent: 'api-courses'
  },
  {
    name: 'admin',
    capability: 'administration-tools',
    description: 'Administrative controls, policy enforcement, and guardrail APIs.',
    basePath: '/admin',
    flagKey: 'platform.api.v1.admin',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Administration endpoints are disabled. Contact the platform owner to request access.',
    audience: 'admin',
    owners: ['admin-operations'],
    serviceTier: 'critical',
    tags: ['api', 'v1', 'admin'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'admin',
      allowedRoles: ['admin']
    },
    cors: {
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    },
    statusPageComponent: 'api-admin',
    runbookUrl: 'https://runbooks.edulure.internal/admin-api-access'
  },
  {
    name: 'integration-invites',
    capability: 'integrations-governance',
    description: 'Public credential invitation verification and submission endpoints.',
    basePath: '/integration-invites',
    flagKey: 'platform.api.v1.integrationInvites',
    defaultState: 'enabled',
    fallbackStatus: 404,
    disabledMessage: 'Credential invitation endpoints are not available. Contact your integrations administrator.',
    audience: 'partner',
    owners: ['integrations'],
    serviceTier: 'supporting',
    tags: ['api', 'v1', 'integrations'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'partner',
      allowedRoles: ['partner', 'admin'],
      elevatedRoles: ['admin']
    },
    cors: {
      allowedOrigins: ['@env:app.corsOrigins', 'https://partners.edulure.com'],
      allowedMethods: ['GET', 'POST']
    },
    statusPageComponent: 'api-integration-invites'
  },
  {
    name: 'verification',
    capability: 'identity-verification',
    description: 'Identity verification, KYC, and trust signals APIs.',
    basePath: '/verification',
    flagKey: 'platform.api.v1.verification',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage: 'Identity verification APIs are offline. Please try again later.',
    audience: 'trust',
    owners: ['trust-safety'],
    serviceTier: 'critical',
    tags: ['api', 'v1', 'verification'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'trust',
      allowedRoles: ['trust', 'compliance', 'admin'],
      elevatedRoles: ['admin']
    },
    cors: {
      allowedMethods: ['GET', 'POST']
    },
    statusPageComponent: 'api-verification',
    runbookUrl: 'https://runbooks.edulure.internal/identity-verification-outage'
  },
  {
    name: 'ebooks',
    capability: 'digital-asset-delivery',
    description: 'E-book catalogue and DRM-controlled delivery endpoints.',
    basePath: '/ebooks',
    flagKey: 'platform.api.v1.ebooks',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage: 'E-book services are temporarily offline. Please try again later.',
    audience: 'user',
    owners: ['digital-products'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'ebooks'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'user',
      allowedRoles: ['user', 'admin']
    },
    cors: {
      allowedMethods: ['GET', 'POST']
    },
    statusPageComponent: 'api-ebooks'
  },
  {
    name: 'mobile',
    capability: 'mobile-experience',
    description: 'Mobile billing, messaging, and learner support endpoints.',
    basePath: '/mobile',
    flagKey: 'platform.api.v1.mobile',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage: 'Mobile companion services are temporarily unavailable. Please try again soon.',
    audience: 'user',
    owners: ['mobile-experience', 'learner-success'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'mobile', 'billing', 'messaging'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'user',
      allowedRoles: ['user', 'staff', 'admin']
    },
    cors: {
      allowedOrigins: ['@env:app.corsOrigins'],
      allowedMethods: ['GET', 'POST']
    },
    statusPageComponent: 'api-mobile'
  },
  {
    name: 'catalogue',
    capability: 'public-catalogue',
    description: 'Public catalogue endpoints for live classrooms, courses, and tutors.',
    basePath: '/catalogue',
    flagKey: 'platform.api.v1.catalogue',
    defaultState: 'enabled',
    fallbackStatus: 503,
    disabledMessage: 'Public catalogue is currently rebuilding. Please try again soon.',
    audience: 'public',
    owners: ['public-web'],
    serviceTier: 'core',
    tags: ['api', 'v1', 'catalogue'],
    rbac: {
      strategy: 'public',
      defaultRole: 'public',
      allowedRoles: ['anonymous', 'user']
    },
    cors: {
      allowedOrigins: ['@env:app.corsOrigins', 'https://www.edulure.com'],
      allowedMethods: ['GET']
    },
    statusPageComponent: 'api-catalogue'
  },
  {
    name: 'blog',
    capability: 'marketing-blog',
    description: 'Blog posts, marketing pages, and public content endpoints.',
    basePath: '/blog',
    flagKey: 'platform.api.v1.blog',
    defaultState: 'enabled',
    fallbackStatus: 404,
    disabledMessage: 'Marketing blog endpoints are not available for this deployment.',
    audience: 'public',
    owners: ['marketing-experience'],
    serviceTier: 'supporting',
    tags: ['api', 'v1', 'marketing'],
    rbac: {
      strategy: 'public',
      defaultRole: 'public',
      allowedRoles: ['anonymous', 'user']
    },
    cors: {
      allowedOrigins: ['@env:app.corsOrigins', 'https://www.edulure.com'],
      allowedMethods: ['GET']
    },
    statusPageComponent: 'api-blog'
  },
  {
    name: 'provider-transition',
    capability: 'provider-transition-program',
    description: 'Provider transition announcements, acknowledgements, and migration status endpoints.',
    basePath: '/provider-transition',
    flagKey: 'platform.api.v1.providerTransition',
    defaultState: 'enabled',
    fallbackStatus: 403,
    disabledMessage: 'Provider migration communications are disabled for this tenant.',
    audience: 'partner',
    owners: ['partner-success'],
    serviceTier: 'supporting',
    tags: ['api', 'v1', 'transition'],
    rbac: {
      strategy: 'role-based',
      defaultRole: 'partner',
      allowedRoles: ['partner', 'admin']
    },
    cors: {
      allowedOrigins: ['@env:app.corsOrigins', 'https://partners.edulure.com'],
      allowedMethods: ['GET', 'POST']
    },
    statusPageComponent: 'api-provider-transition'
  }
];

export const apiRouteMetadata = ROUTE_DEFINITIONS.map((entry) => defineRoute(entry));
Object.freeze(apiRouteMetadata);

export default apiRouteMetadata;
