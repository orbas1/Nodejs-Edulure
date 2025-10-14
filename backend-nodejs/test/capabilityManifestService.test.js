import { describe, expect, it, vi } from 'vitest';

import CapabilityManifestService from '../src/services/CapabilityManifestService.js';

function createFetchMock(responses = []) {
  const queue = [...responses];
  return vi.fn(async () => {
    const next = queue.shift();
    if (!next) {
      return {
        ok: true,
        status: 200,
        async json() {
          return { ready: true, status: 'ready' };
        }
      };
    }
    return next;
  });
}

describe('CapabilityManifestService', () => {
  it('combines readiness probes with capability flags to produce manifest status', async () => {
    const routeRegistry = [
      {
        name: 'chat',
        capability: 'realtime-chat',
        description: 'Realtime messaging APIs',
        basePath: '/chat',
        flagKey: 'flag.chat',
        defaultState: 'enabled'
      },
      {
        name: 'analytics',
        capability: 'analytics-insights',
        description: 'Analytics dashboards',
        basePath: '/analytics',
        flagKey: 'flag.analytics',
        defaultState: 'enabled'
      }
    ];

    const featureFlags = {
      evaluate: vi.fn((key) => {
        if (key === 'flag.chat') {
          return { key, enabled: true, reason: 'enabled', evaluatedAt: '2024-05-01T00:00:00.000Z' };
        }
        if (key === 'flag.analytics') {
          return { key, enabled: false, reason: 'disabled', evaluatedAt: '2024-05-01T00:00:00.000Z' };
        }
        return { key, enabled: true, reason: 'enabled', evaluatedAt: '2024-05-01T00:00:00.000Z' };
      })
    };

    const readinessTargets = [
      { key: 'web-service', displayName: 'Web API', category: 'core', type: 'http', local: true },
      {
        key: 'realtime-service',
        displayName: 'Realtime Gateway',
        category: 'realtime',
        type: 'realtime',
        probePort: 4103
      },
      {
        key: 'worker-service',
        displayName: 'Worker Orchestrator',
        category: 'async',
        type: 'worker',
        probePort: 4104
      }
    ];

    const localReadinessProvider = vi.fn(() => ({
      ready: true,
      status: 'ready',
      components: [
        { name: 'http-server', status: 'ready', ready: true, message: 'Listening' }
      ]
    }));

    const fetchMock = createFetchMock([
      {
        ok: true,
        status: 200,
        async json() {
          return {
            service: 'realtime-service',
            ready: false,
            status: 'not_ready',
            message: 'Gateway offline',
            components: []
          };
        }
      },
      {
        ok: true,
        status: 200,
        async json() {
          return {
            service: 'worker-service',
            ready: true,
            status: 'ready',
            message: 'Running',
            components: [
              { name: 'asset-ingestion', ready: true, status: 'ready' }
            ]
          };
        }
      }
    ]);

    const service = new CapabilityManifestService({
      routeRegistry,
      featureFlags,
      readinessTargets,
      fetchImpl: fetchMock,
      localReadinessProvider,
      loggerInstance: { warn: vi.fn() },
      timeoutMs: 50
    });

    const manifest = await service.buildManifest({ audience: 'public', userContext: { role: 'admin' } });

    expect(manifest.environment).toBeDefined();
    expect(manifest.services).toHaveLength(3);

    const realtime = manifest.services.find((svc) => svc.key === 'realtime-service');
    expect(realtime.status).toBe('outage');
    expect(realtime.summary).toMatch(/offline/i);

    const chatCapability = manifest.capabilities.find((cap) => cap.capability === 'realtime-chat');
    expect(chatCapability.status).toBe('outage');
    expect(chatCapability.dependencies).toContain('realtime-service');
    expect(chatCapability.summary).toMatch(/unavailable/i);
    expect(chatCapability.evaluation.enabled).toBe(true);

    const analyticsCapability = manifest.capabilities.find((cap) => cap.capability === 'analytics-insights');
    expect(analyticsCapability.status).toBe('disabled');
    expect(analyticsCapability.summary).toMatch(/gated by feature flag/);
    expect(analyticsCapability.enabled).toBe(false);

    expect(featureFlags.evaluate).toHaveBeenCalledWith('flag.chat', expect.any(Object), {
      includeDefinition: true
    });
    expect(featureFlags.evaluate).toHaveBeenCalledWith('flag.analytics', expect.any(Object), {
      includeDefinition: true
    });
  });

  it('falls back to default flag state when definition missing', async () => {
    const routeRegistry = [
      {
        name: 'courses',
        capability: 'course-management',
        description: 'Course lifecycle APIs',
        basePath: '/courses',
        flagKey: 'flag.courses',
        defaultState: 'enabled'
      }
    ];

    const featureFlags = {
      evaluate: vi.fn(() => ({
        key: 'flag.courses',
        enabled: false,
        reason: 'flag-not-found',
        evaluatedAt: '2024-05-01T00:00:00.000Z'
      }))
    };

    const localReadinessProvider = vi.fn(() => ({ ready: true, status: 'ready' }));

    const service = new CapabilityManifestService({
      routeRegistry,
      featureFlags,
      readinessTargets: [
        { key: 'web-service', displayName: 'Web API', category: 'core', type: 'http', local: true }
      ],
      localReadinessProvider,
      fetchImpl: createFetchMock(),
      loggerInstance: { warn: vi.fn() }
    });

    const manifest = await service.buildManifest({ audience: 'public' });

    const coursesCapability = manifest.capabilities[0];
    expect(coursesCapability.enabled).toBe(true);
    expect(coursesCapability.status).toBe('operational');
    expect(coursesCapability.summary).toMatch(/available/);
  });
});
