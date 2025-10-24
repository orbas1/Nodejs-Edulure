import { env } from '../config/env.js';
import DomainEventModel from '../models/DomainEventModel.js';
import { featureFlagService, runtimeConfigService } from '../services/FeatureFlagService.js';

function getRequestActor(req) {
  if (req.actor && typeof req.actor === 'object') {
    return req.actor;
  }

  if (req.user && typeof req.user === 'object') {
    return {
      id: req.user.id ?? req.user.sub ?? null,
      role: req.user.role ?? req.user.roles?.[0] ?? null,
      tenantId: req.user.tenantId ?? null,
      sessionId: req.user.sessionId ?? null,
      permissions: Array.isArray(req.permissions) ? req.permissions : []
    };
  }

  return null;
}

function buildBaseContext(req) {
  const actor = getRequestActor(req);
  return {
    environment: env.nodeEnv,
    traceId: req.traceId ?? null,
    userId: actor?.id ?? null,
    role: actor?.role ?? null,
    tenantId: actor?.tenantId ?? req.headers['x-tenant-id'] ?? null,
    attributes: {
      region: req.headers['x-geo-country'] ?? null,
      appVersion: req.headers['x-app-version'] ?? null,
      platform: req.headers['x-platform'] ?? null
    }
  };
}

function mergePayload(base = {}, addition = {}) {
  const output = { ...base };
  if (!addition || typeof addition !== 'object') {
    return output;
  }

  for (const [key, value] of Object.entries(addition)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = mergePayload(output[key] && typeof output[key] === 'object' ? output[key] : {}, value);
    } else {
      output[key] = value;
    }
  }

  return output;
}

function normaliseDomainEventDescriptor(input, req) {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const descriptor = {};

  if (input.entityType) {
    descriptor.entityType = String(input.entityType);
  }

  if (input.entityId !== undefined && input.entityId !== null) {
    descriptor.entityId = String(input.entityId);
  }

  if (input.eventType) {
    descriptor.eventType = String(input.eventType);
  }

  if (input.schemaVersion) {
    descriptor.schemaVersion = String(input.schemaVersion);
  }

  if (input.performedBy !== undefined) {
    descriptor.performedBy = input.performedBy;
  }

  if (input.payload && typeof input.payload === 'object') {
    descriptor.payload = mergePayload({}, input.payload);
  }

  if (descriptor.performedBy === undefined && req?.actor?.id) {
    descriptor.performedBy = req.actor.id;
  }

  return descriptor;
}

function mergeDescriptors(base, addition) {
  const merged = { ...base };

  if (addition.entityType) {
    merged.entityType = addition.entityType;
  }

  if (addition.entityId !== undefined) {
    merged.entityId = addition.entityId;
  }

  if (addition.eventType) {
    merged.eventType = addition.eventType;
  }

  if (addition.schemaVersion) {
    merged.schemaVersion = addition.schemaVersion;
  }

  if (addition.performedBy !== undefined) {
    merged.performedBy = addition.performedBy;
  }

  merged.payload = mergePayload(base.payload, addition.payload);

  return merged;
}

function resolveDefaultEntry(entry, req) {
  if (typeof entry === 'function') {
    return entry(req);
  }
  return entry;
}

function applyDomainEventDefaults(defaults, event, req) {
  let descriptor = {};
  for (const entry of defaults) {
    const resolved = resolveDefaultEntry(entry, req);
    descriptor = mergeDescriptors(descriptor, normaliseDomainEventDescriptor(resolved, req));
  }

  return mergeDescriptors(descriptor, normaliseDomainEventDescriptor(event, req));
}

function buildRequestDomainEventDefaults(req) {
  const actor = getRequestActor(req);
  const requestPayload = {
    method: req.method,
    path: req.originalUrl ?? req.url ?? null,
    baseUrl: req.baseUrl ?? null,
    route: req.route?.path ?? null,
    id: req.id ?? null,
    traceId: req.traceId ?? null,
    spanId: req.spanId ?? null,
    ip: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
    correlationId: req.headers['x-correlation-id'] ?? null
  };

  const payload = { request: requestPayload };
  if (actor) {
    payload.actor = {
      id: actor.id ?? null,
      role: actor.role ?? null,
      tenantId: actor.tenantId ?? null,
      permissions: Array.isArray(actor.permissions) ? actor.permissions : undefined
    };
  }

  return {
    performedBy: actor?.id ?? null,
    payload
  };
}

export default function runtimeConfigMiddleware(req, _res, next) {
  const domainEventDefaults = [buildRequestDomainEventDefaults(req)];

  req.registerDomainEventDefaults = (defaults) => {
    if (defaults === undefined || defaults === null) {
      return domainEventDefaults.length;
    }

    domainEventDefaults.push(defaults);
    return domainEventDefaults.length;
  };

  req.recordDomainEvent = async (event, options = {}) => {
    if (!event || typeof event !== 'object') {
      throw new Error('recordDomainEvent requires an event object');
    }

    const descriptor = applyDomainEventDefaults(domainEventDefaults, event, req);

    if (!descriptor.entityType || !descriptor.entityId || !descriptor.eventType) {
      throw new Error('recordDomainEvent requires entityType, entityId, and eventType');
    }

    const finalEvent = {
      ...descriptor,
      entityId: String(descriptor.entityId),
      payload: descriptor.payload ?? {},
      performedBy: descriptor.performedBy ?? req.actor?.id ?? req.user?.id ?? null
    };

    const { connection, ...recordOptions } = options ?? {};
    const finalOptions = {
      ...recordOptions,
      traceId: recordOptions?.traceId ?? req.traceId ?? req.id ?? null
    };

    if (connection) {
      return DomainEventModel.record(finalEvent, connection, finalOptions);
    }

    return DomainEventModel.record(finalEvent, finalOptions);
  };

  req.getFeatureFlag = (key, overrides = {}, options = {}) =>
    featureFlagService.evaluate(key, { ...buildBaseContext(req), ...overrides }, options);

  req.listFeatureFlags = (overrides = {}, options = {}) =>
    featureFlagService.evaluateAll({ ...buildBaseContext(req), ...overrides }, options);

  req.getRuntimeConfig = (key, options = {}) =>
    runtimeConfigService.getValue(key, {
      environment: options.environment ?? env.nodeEnv,
      audience: options.audience ?? 'public',
      includeSensitive: options.includeSensitive ?? false,
      defaultValue: options.defaultValue ?? null
    });

  req.listRuntimeConfig = (options = {}) =>
    runtimeConfigService.listForAudience(options.environment ?? env.nodeEnv, {
      audience: options.audience ?? 'public',
      includeSensitive: options.includeSensitive ?? false
    });

  return next();
}
