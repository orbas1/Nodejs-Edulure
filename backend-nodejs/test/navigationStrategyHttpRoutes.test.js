import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import navigationRoutes from '../src/routes/navigation.routes.js';

const serviceMock = vi.hoisted(() => ({
  describeAnnex: vi.fn(),
  describeStrategyBriefing: vi.fn()
}));

vi.mock('../src/routes/routerFactory.js', () => ({
  createApiRouter: () => express.Router({ mergeParams: true })
}));

vi.mock('../src/services/NavigationAnnexService.js', () => ({
  __esModule: true,
  default: serviceMock
}));

let app;

describe('Navigation annex strategy HTTP routes', () => {
  beforeAll(() => {
    app = express();
    app.use('/navigation', navigationRoutes);
  });

  beforeEach(() => {
    serviceMock.describeAnnex.mockReset();
    serviceMock.describeStrategyBriefing.mockReset();
  });

  it('returns aggregated strategy briefing data', async () => {
    serviceMock.describeStrategyBriefing.mockResolvedValue({
      generatedAt: '2025-10-24T00:00:00Z',
      annexRefreshedAt: '2025-10-22T00:00:00Z',
      version: '2025.10',
      pillars: [
        {
          pillar: 'Retention',
          narratives: ['Reduce clicks to reach the feed after sign-in.'],
          metrics: [
            {
              id: 'nav-click-depth',
              label: 'Average click depth to reach feed updates',
              baseline: '3.2',
              target: '2.1',
              unit: 'clicks',
              weight: 0.35
            }
          ],
          stakeholders: ['Product'],
          communications: []
        }
      ],
      role: 'admin'
    });

    const response = await request(app).get('/navigation/annex/strategy-briefing?role=admin');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.version).toBe('2025.10');
    expect(response.body.data.pillars[0].pillar).toBe('Retention');
    expect(serviceMock.describeStrategyBriefing).toHaveBeenCalledWith({ role: 'admin' });
  });
});
