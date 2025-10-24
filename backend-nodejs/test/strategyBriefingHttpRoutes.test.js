import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const describeMock = vi.fn();

vi.mock('../src/repositories/NavigationAnnexRepository.js', () => ({
  default: {
    describe: describeMock
  }
}));

vi.mock('../src/routes/routeRegistry.js', async () => {
  const { default: strategyRouter } = await import('../src/routes/strategy.routes.js');

  const registry = [
    {
      name: 'strategy',
      capability: 'navigation-strategy-briefing',
      basePath: '/strategy',
      flagKey: 'platform.api.v1.strategy',
      defaultState: 'enabled',
      fallbackStatus: 404,
      audience: 'user',
      router: strategyRouter
    }
  ];

  return {
    apiRouteRegistry: registry,
    default: registry
  };
});

let app;

beforeAll(async () => {
  ({ default: app } = await import('../src/app.js'));
});

beforeEach(() => {
  describeMock.mockResolvedValue({
    strategyNarratives: [
      { pillar: 'Retention', narratives: ['Reduce clicks after sign-in'], metrics: [] }
    ],
    productBacklog: [],
    designDependencies: { tokens: [], qa: [], references: [] },
    operationsChecklist: [],
    refreshedAt: '2025-05-20T00:00:00Z'
  });
});

describe('Strategy briefing HTTP routes', () => {
  it('returns aggregated strategy briefing data with annex context', async () => {
    const response = await request(app)
      .get('/api/v1/strategy/briefing')
      .query({ role: 'user' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(describeMock).toHaveBeenCalledWith({ role: 'user' });
    expect(response.body.data.summary.midpoint).toBe('£0.9M');
    expect(Array.isArray(response.body.data.capabilitySignals)).toBe(true);
    expect(response.body.data.annex.strategyNarratives).toHaveLength(1);
    expect(response.body.data.annex.strategyNarratives[0].pillar).toBe('Retention');
  });
});
