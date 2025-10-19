import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/auth.js', () => ({
  __esModule: true,
  default: () => (req, _res, next) => {
    req.user = { id: 1, role: 'admin', email: 'admin@example.com' };
    return next();
  }
}));

const releaseOrchestrationService = {
  listChecklist: vi.fn(),
  scheduleReleaseRun: vi.fn(),
  listRuns: vi.fn(),
  getRun: vi.fn(),
  recordGateEvaluation: vi.fn(),
  evaluateRun: vi.fn(),
  getDashboard: vi.fn()
};

vi.mock('../src/services/ReleaseOrchestrationService.js', () => ({
  __esModule: true,
  default: releaseOrchestrationService
}));

let app;

describe('Release HTTP routes', () => {
  beforeAll(async () => {
    ({ default: app } = await import('../src/app.js'));
  });

  it('returns checklist with thresholds and required gates', async () => {
    releaseOrchestrationService.listChecklist.mockResolvedValue({
      total: 1,
      limit: 25,
      offset: 0,
      items: [
        {
          slug: 'quality-verification',
          category: 'quality',
          title: 'QA sign-off',
          description: 'Ensure regression suites are green.',
          autoEvaluated: true,
          weight: 2,
          defaultOwnerEmail: 'qa@example.com',
          successCriteria: { minCoverage: 0.9, maxFailureRate: 0.02 }
        }
      ],
      thresholds: { minCoverage: 0.9, maxTestFailureRate: 0.02 },
      requiredGates: ['quality-verification']
    });

    const response = await request(app)
      .get('/api/v1/release/checklist')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.data.items[0].slug).toBe('quality-verification');
    expect(releaseOrchestrationService.listChecklist).toHaveBeenCalled();
  });

  it('schedules a release run', async () => {
    releaseOrchestrationService.scheduleReleaseRun.mockResolvedValue({
      run: {
        publicId: 'rel-1',
        versionTag: 'v1.0.0',
        environment: 'staging',
        status: 'scheduled',
        metadata: {}
      },
      gates: []
    });

    const response = await request(app)
      .post('/api/v1/release/runs')
      .set('Authorization', 'Bearer token')
      .send({ versionTag: 'v1.0.0', environment: 'staging', initiatedByEmail: 'release@example.com' });

    expect(response.status).toBe(201);
    expect(response.body.data.run.publicId).toBe('rel-1');
    expect(releaseOrchestrationService.scheduleReleaseRun).toHaveBeenCalledWith(
      expect.objectContaining({ versionTag: 'v1.0.0' })
    );
  });

  it('evaluates a release run and returns readiness status', async () => {
    releaseOrchestrationService.evaluateRun.mockResolvedValue({
      run: {
        publicId: 'rel-1',
        versionTag: 'v1.0.0',
        environment: 'production',
        status: 'ready',
        metadata: { readinessScore: 95 }
      },
      readinessScore: 95,
      blockingGates: [],
      gates: [],
      requiredGates: ['quality-verification'],
      recommendedStatus: 'ready'
    });

    const response = await request(app)
      .post('/api/v1/release/runs/rel-1/evaluate')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.data.recommendedStatus).toBe('ready');
    expect(releaseOrchestrationService.evaluateRun).toHaveBeenCalledWith('rel-1');
  });
});
