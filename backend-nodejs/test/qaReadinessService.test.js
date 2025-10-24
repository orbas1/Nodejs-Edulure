import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/models/QaTestSurfaceModel.js', () => ({
  __esModule: true,
  default: {
    list: vi.fn()
  }
}));

vi.mock('../src/models/QaTestSuiteModel.js', () => ({
  __esModule: true,
  default: {
    list: vi.fn()
  }
}));

vi.mock('../src/models/QaTestSuiteRunModel.js', () => ({
  __esModule: true,
  default: {
    getLatestBySuiteIds: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock('../src/models/QaManualChecklistModel.js', () => ({
  __esModule: true,
  default: {
    list: vi.fn(),
    findBySlug: vi.fn()
  }
}));

vi.mock('../src/models/QaFixtureSetModel.js', () => ({
  __esModule: true,
  default: {
    list: vi.fn()
  }
}));

vi.mock('../src/models/QaSandboxEnvironmentModel.js', () => ({
  __esModule: true,
  default: {
    list: vi.fn()
  }
}));

let QaReadinessService;
let QaTestSurfaceModel;
let QaTestSuiteModel;
let QaTestSuiteRunModel;

function createSurface({ id, slug, thresholds }) {
  return {
    id,
    slug,
    displayName: slug.toUpperCase(),
    surfaceType: slug === 'flutter' ? 'mobile' : slug === 'frontend' ? 'web' : 'api',
    repositoryPath: slug,
    ownerTeam: 'qa',
    ciIdentifier: `${slug}:test`,
    thresholds,
    metadata: {}
  };
}

function createSuite({ id, surfaceId, suiteKey, thresholds }) {
  return {
    id,
    surfaceId,
    suiteKey,
    suiteType: 'unit',
    description: `${suiteKey} suite`,
    ownerEmail: 'qa@example.com',
    ciJob: `${suiteKey}#test`,
    thresholds,
    metadata: {}
  };
}

beforeEach(async () => {
  vi.resetModules();
  QaTestSurfaceModel = (await import('../src/models/QaTestSurfaceModel.js')).default;
  QaTestSuiteModel = (await import('../src/models/QaTestSuiteModel.js')).default;
  QaTestSuiteRunModel = (await import('../src/models/QaTestSuiteRunModel.js')).default;
  ({ default: QaReadinessService } = await import('../src/services/QaReadinessService.js'));
  vi.clearAllMocks();
});

describe('QaReadinessService.getCoverageSummary', () => {
  it('aggregates coverage across surfaces with thresholds', async () => {
    QaTestSurfaceModel.list.mockResolvedValue([
      createSurface({ id: 1, slug: 'backend', thresholds: { statements: 0.8, branches: 0.75, functions: 0.8, lines: 0.8 } }),
      createSurface({ id: 2, slug: 'frontend', thresholds: { statements: 0.85, branches: 0.8, functions: 0.85, lines: 0.85 } })
    ]);

    QaTestSuiteModel.list.mockResolvedValue([
      createSuite({ id: 11, surfaceId: 1, suiteKey: 'backend', thresholds: { statements: 0.8, branches: 0.75, functions: 0.8, lines: 0.8 } }),
      createSuite({ id: 22, surfaceId: 2, suiteKey: 'frontend', thresholds: { statements: 0.85, branches: 0.8, functions: 0.85, lines: 0.85 } })
    ]);

    QaTestSuiteRunModel.getLatestBySuiteIds.mockResolvedValue([
      {
        suiteId: 11,
        status: 'passed',
        coverage: { statements: 0.92, branches: 0.9, functions: 0.91, lines: 0.93 },
        failureRate: 0,
        reportUrl: 'https://ci.example.com/backend',
        evidenceUrl: null,
        completedAt: '2025-01-14T08:05:00Z'
      },
      {
        suiteId: 22,
        status: 'passed',
        coverage: { statements: 0.9, branches: 0.88, functions: 0.9, lines: 0.89 },
        failureRate: 0,
        reportUrl: 'https://ci.example.com/frontend',
        evidenceUrl: 'https://evidence.example.com/frontend',
        completedAt: '2025-01-14T08:07:00Z'
      }
    ]);

    const summary = await QaReadinessService.getCoverageSummary();

    expect(summary.surfaces).toHaveLength(2);
    expect(summary.surfaces[0].status).toBe('pass');
    expect(summary.surfaces[1].status).toBe('pass');
    expect(summary.aggregate.coverage).toBeCloseTo((0.93 + 0.89) / 2, 4);
    expect(summary.aggregate.failureRate).toBe(0);
    expect(summary.evidence).toContain('https://ci.example.com/backend');
    expect(summary.evidence).toContain('https://evidence.example.com/frontend');
  });
});

describe('QaReadinessService.recordCoverageMatrix', () => {
  it('persists coverage runs using suite configuration', async () => {
    QaTestSurfaceModel.list.mockResolvedValue([
      createSurface({ id: 1, slug: 'backend', thresholds: { statements: 0.8, branches: 0.75, functions: 0.8, lines: 0.8 } })
    ]);

    QaTestSuiteModel.list.mockResolvedValue([
      createSuite({ id: 11, surfaceId: 1, suiteKey: 'backend', thresholds: { statements: 0.8, branches: 0.75, functions: 0.8, lines: 0.8 } })
    ]);

    const createdRuns = [];
    QaTestSuiteRunModel.create.mockImplementation(async (payload) => {
      createdRuns.push(payload);
      return { id: createdRuns.length, ...payload };
    });

    const matrix = {
      generatedAt: '2025-01-14T08:00:00Z',
      surfaces: [
        {
          id: 'backend',
          status: 'pass',
          metrics: { statements: 92, branches: 90, functions: 91, lines: 93 },
          thresholds: { statements: 80, branches: 75, functions: 80, lines: 80 },
          source: 'backend-nodejs/coverage/coverage-summary.json'
        }
      ]
    };

    const runs = await QaReadinessService.recordCoverageMatrix(matrix, {
      runIdentifier: 'build-123',
      gitCommit: 'abc123',
      gitBranch: 'main',
      environment: 'staging',
      triggeredBy: 'qa@example.com'
    });

    expect(runs).toHaveLength(1);
    expect(createdRuns).toHaveLength(1);
    const [payload] = createdRuns;
    expect(payload.suiteId).toBe(11);
    expect(payload.coverage.statements).toBeCloseTo(0.92, 4);
    expect(payload.coverage.lines).toBeCloseTo(0.93, 4);
    expect(payload.status).toBe('passed');
    expect(payload.gitCommit).toBe('abc123');
    expect(payload.environment).toBe('staging');
  });
});
