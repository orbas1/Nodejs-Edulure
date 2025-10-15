import logger from '../config/logger.js';
import { env } from '../config/env.js';
import { apiRouteRegistry } from '../routes/routeRegistry.js';
import { featureFlagService } from './FeatureFlagService.js';

const DEFAULT_TIMEOUT_MS = 4000;

let cachedReadinessAccessor = null;

async function resolveLocalReadiness() {
  if (!cachedReadinessAccessor) {
    const module = await import('../app.js');
    cachedReadinessAccessor = module.getCurrentReadinessReport;
  }

  if (typeof cachedReadinessAccessor !== 'function') {
    return {
      ready: false,
      status: 'unknown',
      components: [],
      message: 'Readiness provider not initialised'
    };
  }

  return cachedReadinessAccessor();
}
const PROBE_HOST = '127.0.0.1';

const STATUS_RANK = {
  outage: 3,
  degraded: 2,
  unknown: 2,
  disabled: 2,
  operational: 1
};

const CAPABILITY_DEPENDENCIES = new Map([
  ['identity-authentication', ['web-service']],
  ['user-profile-management', ['web-service']],
  ['community-collaboration', ['web-service', 'realtime-service']],
  ['content-library', ['web-service', 'worker-service']],
  ['platform-runtime-config', ['web-service']],
  ['payments-and-payouts', ['web-service', 'worker-service']],
  ['realtime-chat', ['web-service', 'realtime-service']],
  ['social-graph', ['web-service', 'realtime-service']],
  ['search-and-discovery', ['web-service']],
  ['ads-manager', ['web-service', 'worker-service']],
  ['analytics-insights', ['web-service', 'worker-service']],
  ['operator-dashboard', ['web-service', 'worker-service']],
  ['course-management', ['web-service', 'worker-service']],
  ['administration-tools', ['web-service']],
  ['identity-verification', ['web-service', 'worker-service']],
  ['digital-asset-delivery', ['web-service', 'worker-service']],
  ['marketing-blog', ['web-service']]
]);

function determineStatusRank(status) {
  return STATUS_RANK[status] ?? 0;
}

function computeWorstStatus(statuses) {
  return statuses.reduce((worst, candidate) => {
    return determineStatusRank(candidate) > determineStatusRank(worst) ? candidate : worst;
  }, 'operational');
}

function normaliseComponent(component) {
  if (!component || typeof component !== 'object') {
    return null;
  }

  return {
    name: component.name ?? 'component',
    status: component.status ?? (component.ready === false ? 'failed' : 'ready'),
    ready: component.ready ?? component.status === 'ready',
    message: component.message ?? null,
    updatedAt: component.updatedAt ?? component.timestamp ?? null
  };
}

function normaliseServiceStatus(descriptor, source, fallbackMessage) {
  const components = Array.isArray(source?.components)
    ? source.components.map(normaliseComponent).filter(Boolean)
    : [];
  const ready = Boolean(source?.ready);
  let status = 'operational';

  if (!source) {
    status = 'outage';
  } else if (!ready) {
    status = 'outage';
  } else if (components.some((component) => component.ready === false || component.status === 'degraded')) {
    status = 'degraded';
  } else if (typeof source.status === 'string' && source.status.toLowerCase().includes('degraded')) {
    status = 'degraded';
  }

  const summary =
    source?.message ??
    source?.error ??
    fallbackMessage ??
    (status === 'operational' ? 'Service operating normally' : 'Service availability impacted');

  return {
    key: descriptor.key,
    name: descriptor.displayName,
    category: descriptor.category,
    type: descriptor.type,
    ready,
    status,
    summary,
    checkedAt: source?.checkedAt ?? source?.timestamp ?? new Date().toISOString(),
    components,
    raw: source ?? null
  };
}

function normaliseFailure(descriptor, error) {
  const message = error?.message ?? 'Probe request failed';
  return {
    key: descriptor.key,
    name: descriptor.displayName,
    category: descriptor.category,
    type: descriptor.type,
    ready: false,
    status: 'outage',
    summary: message,
    checkedAt: new Date().toISOString(),
    components: [],
    raw: null
  };
}

function buildCapabilitySummary({
  entry,
  evaluation,
  dependencies,
  dependencyStatuses,
  worstDependencyStatus,
  missingDependencies
}) {
  const dependencyNames = dependencies.join(', ');
  if (!evaluation.enabled) {
    return {
      status: 'disabled',
      summary: `Capability gated by feature flag \`${entry.flagKey}\` (${evaluation.reason}).`,
      details: {
        evaluation,
        dependencyStatuses,
        missingDependencies
      }
    };
  }

  if (worstDependencyStatus === 'outage') {
    return {
      status: 'outage',
      summary: `Unavailable while dependent services (${dependencyNames}) recover.`,
      details: {
        evaluation,
        dependencyStatuses,
        missingDependencies
      }
    };
  }

  if (worstDependencyStatus === 'degraded' || worstDependencyStatus === 'unknown') {
    return {
      status: 'degraded',
      summary: `Operating in degraded mode because ${dependencyNames} report limited capacity.`,
      details: {
        evaluation,
        dependencyStatuses,
        missingDependencies
      }
    };
  }

  return {
    status: 'operational',
    summary: 'Capability available.',
    details: {
      evaluation,
      dependencyStatuses,
      missingDependencies
    }
  };
}

export default class CapabilityManifestService {
  constructor({
    routeRegistry = apiRouteRegistry,
    featureFlags = featureFlagService,
    environment = env.nodeEnv,
    readinessTargets,
    fetchImpl = globalThis.fetch?.bind(globalThis),
    localReadinessProvider = () => resolveLocalReadiness(),
    loggerInstance = logger.child({ service: 'CapabilityManifestService' }),
    timeoutMs = DEFAULT_TIMEOUT_MS
  } = {}) {
    this.routeRegistry = routeRegistry;
    this.featureFlagService = featureFlags;
    this.environment = environment;
    this.fetch = fetchImpl;
    this.localReadinessProvider = localReadinessProvider;
    this.logger = loggerInstance;
    this.timeoutMs = timeoutMs;

    const defaultTargets = [
      { key: 'web-service', displayName: 'Web API', category: 'core', type: 'http', local: true },
      {
        key: 'worker-service',
        displayName: 'Worker Orchestrator',
        category: 'asynchronous-jobs',
        type: 'worker',
        probePort: env.services.worker.probePort
      },
      {
        key: 'realtime-service',
        displayName: 'Realtime Gateway',
        category: 'realtime',
        type: 'realtime',
        probePort: env.services.realtime.probePort
      }
    ];

    this.readinessTargets = readinessTargets ?? defaultTargets;
  }

  async fetchRemoteReadiness(target) {
    if (!this.fetch) {
      throw new Error('Global fetch implementation not available');
    }

    if (!target.probePort) {
      return normaliseFailure(target, new Error('Probe port not configured'));
    }

    const url = `${target.probeProtocol ?? 'http'}://${target.probeHost ?? PROBE_HOST}:${target.probePort}/ready`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetch(url, {
        signal: controller.signal,
        headers: {
          'user-agent': 'edulure-capability-manifest/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Probe responded with status ${response.status}`);
      }

      const json = await response.json();
      return normaliseServiceStatus(target, json);
    } catch (error) {
      this.logger.warn({ err: error, service: target.key, url }, 'Failed to query readiness probe');
      return normaliseFailure(target, error);
    } finally {
      clearTimeout(timer);
    }
  }

  async gatherServiceStatuses() {
    const results = await Promise.all(
      this.readinessTargets.map(async (target) => {
        if (target.local) {
          try {
            const snapshot = await Promise.resolve(this.localReadinessProvider());
            return normaliseServiceStatus(target, snapshot);
          } catch (error) {
            this.logger.warn({ err: error, service: target.key }, 'Failed to collect local readiness snapshot');
            return normaliseFailure(target, error);
          }
        }

        return this.fetchRemoteReadiness(target);
      })
    );

    const services = results.filter(Boolean);
    const map = new Map(services.map((service) => [service.key, service]));
    return { services, map };
  }

  buildCapabilityEntries({ audience, servicesMap, userContext }) {
    const capabilities = [];
    const baseContext = {
      environment: this.environment,
      audience,
      userId: userContext?.userId ?? null,
      role: userContext?.role ?? null,
      tenantId: userContext?.tenantId ?? null,
      traceId: userContext?.traceId ?? null,
      attributes: userContext?.attributes ?? {}
    };

    for (const entry of this.routeRegistry) {
      if (!entry || !entry.flagKey) {
        continue;
      }

      const dependencies = CAPABILITY_DEPENDENCIES.get(entry.capability) ?? ['web-service'];
      const dependencyStatuses = dependencies.map((key) =>
        servicesMap.has(key) ? servicesMap.get(key).status : 'operational'
      );
      const missingDependencies = dependencies.filter((key) => !servicesMap.has(key));
      const worstDependencyStatus = computeWorstStatus(dependencyStatuses);

      const evaluation = this.featureFlagService.evaluate(entry.flagKey, baseContext, {
        includeDefinition: true
      });

      let enabled = evaluation.enabled;
      if (evaluation.reason === 'flag-not-found') {
        enabled = (entry.defaultState ?? 'disabled') === 'enabled';
      }

      const summary = buildCapabilitySummary({
        entry,
        evaluation: { ...evaluation, enabled },
        dependencies,
        dependencyStatuses,
        worstDependencyStatus,
        missingDependencies
      });

      const availabilityRank = determineStatusRank(summary.status);
      const accessible = summary.status === 'operational' || summary.status === 'degraded';

      capabilities.push({
        name: entry.name,
        capability: entry.capability,
        description: entry.description,
        basePath: `/api/v1${entry.basePath}`,
        flagKey: entry.flagKey,
        defaultState: entry.defaultState ?? 'disabled',
        audience: entry.audience ?? 'public',
        enabled,
        status: summary.status,
        summary: summary.summary,
        dependencies,
        dependencyStatuses,
        missingDependencies,
        accessible,
        severityRank: availabilityRank,
        evaluation: summary.details.evaluation,
        generatedAt: new Date().toISOString()
      });
    }

    return capabilities;
  }

  buildSummary(services, capabilities) {
    const aggregate = (items, status) => items.filter((item) => item.status === status).length;
    return {
      services: {
        operational: aggregate(services, 'operational'),
        degraded: aggregate(services, 'degraded'),
        outage: aggregate(services, 'outage'),
        unknown: aggregate(services, 'unknown')
      },
      capabilities: {
        operational: aggregate(capabilities, 'operational'),
        degraded: aggregate(capabilities, 'degraded'),
        outage: aggregate(capabilities, 'outage'),
        disabled: aggregate(capabilities, 'disabled')
      }
    };
  }

  async buildManifest({
    audience = 'public',
    userContext
  } = {}) {
    const { services, map } = await this.gatherServiceStatuses();
    const capabilities = this.buildCapabilityEntries({ audience, servicesMap: map, userContext });
    const summary = this.buildSummary(services, capabilities);

    return {
      environment: this.environment,
      generatedAt: new Date().toISOString(),
      audience,
      services,
      capabilities,
      summary
    };
  }
}
