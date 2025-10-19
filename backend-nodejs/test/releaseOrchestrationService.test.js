import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/models/ReleaseChecklistItemModel.js', () => ({
  __esModule: true,
  default: {
    list: vi.fn()
  }
}));

vi.mock('../src/models/ReleaseRunModel.js', () => ({
  __esModule: true,
  default: {
    create: vi.fn(),
    list: vi.fn(),
    findByPublicId: vi.fn(),
    updateByPublicId: vi.fn()
  }
}));

vi.mock('../src/models/ReleaseGateResultModel.js', () => ({
  __esModule: true,
  default: {
    create: vi.fn(),
    listByRunId: vi.fn(),
    upsertByRunAndGate: vi.fn()
  }
}));

vi.mock('../src/observability/metrics.js', () => ({
  recordReleaseRunStatus: vi.fn(),
  recordReleaseGateEvaluation: vi.fn()
}));

const ReleaseChecklistItemModel = (await import('../src/models/ReleaseChecklistItemModel.js')).default;
const ReleaseRunModel = (await import('../src/models/ReleaseRunModel.js')).default;
const ReleaseGateResultModel = (await import('../src/models/ReleaseGateResultModel.js')).default;
const metrics = await import('../src/observability/metrics.js');
const releaseOrchestrationServiceModule = await import('../src/services/ReleaseOrchestrationService.js');
const releaseOrchestrationService = releaseOrchestrationServiceModule.default;

function buildChecklistItem(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    publicId: overrides.publicId ?? 'chk-public',
    slug: overrides.slug ?? 'quality-verification',
    category: overrides.category ?? 'quality',
    title: overrides.title ?? 'QA sign-off',
    description: overrides.description ?? 'Ensure regression suites are green.',
    autoEvaluated: overrides.autoEvaluated ?? true,
    weight: overrides.weight ?? 2,
    defaultOwnerEmail: overrides.defaultOwnerEmail ?? 'qa@example.com',
    successCriteria: overrides.successCriteria ?? { minCoverage: 0.9, maxFailureRate: 0.02 }
  };
}

describe('ReleaseOrchestrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('schedules release runs with checklist snapshot and emits metrics', async () => {
    ReleaseChecklistItemModel.list.mockResolvedValue({
      total: 1,
      limit: 25,
      offset: 0,
      items: [buildChecklistItem()]
    });

    ReleaseRunModel.create.mockResolvedValue({
      id: 42,
      publicId: 'rel-1',
      versionTag: 'v1.0.0',
      environment: 'staging',
      status: 'scheduled',
      metadata: {}
    });

    ReleaseGateResultModel.create.mockResolvedValue({
      publicId: 'gate-1',
      gateKey: 'quality-verification',
      status: 'pending',
      metrics: {}
    });

    const result = await releaseOrchestrationService.scheduleReleaseRun({
      versionTag: 'v1.0.0',
      environment: 'staging',
      initiatedByEmail: 'release@example.com',
      changeTicket: 'CHG-1001'
    });

    expect(ReleaseChecklistItemModel.list).toHaveBeenCalled();
    expect(ReleaseRunModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ versionTag: 'v1.0.0', environment: 'staging' })
    );
    expect(ReleaseGateResultModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ runId: 42, gateKey: 'quality-verification' })
    );
    expect(result.run.publicId).toBe('rel-1');
    expect(result.gates).toHaveLength(1);
    expect(metrics.recordReleaseGateEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({ gateKey: 'quality-verification', status: 'pending' })
    );
    expect(metrics.recordReleaseRunStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'scheduled', environment: 'staging' })
    );
  });

  it('evaluates runs, updates auto-evaluated gates, and records readiness', async () => {
    const run = {
      id: 21,
      publicId: 'rel-2',
      versionTag: 'v1.0.0',
      environment: 'production',
      status: 'scheduled',
      metadata: { requiredGates: ['quality-verification', 'change-approval'] },
      checklistSnapshot: [
        buildChecklistItem(),
        buildChecklistItem({
          slug: 'change-approval',
          category: 'change_management',
          autoEvaluated: true,
          successCriteria: { changeReviewRequired: true, freezeWindowCheck: true }
        })
      ]
    };

    ReleaseRunModel.findByPublicId.mockResolvedValue(run);
    ReleaseGateResultModel.listByRunId.mockResolvedValue([
      {
        publicId: 'gate-quality',
        gateKey: 'quality-verification',
        status: 'pending',
        ownerEmail: 'qa@example.com',
        metrics: { coverage: 0.95, testFailureRate: 0.01 }
      },
      {
        publicId: 'gate-change',
        gateKey: 'change-approval',
        status: 'in_progress',
        ownerEmail: 'release@example.com',
        metrics: { changeReviewCompleted: true, freezeWindowBypassed: false }
      }
    ]);
    ReleaseGateResultModel.upsertByRunAndGate.mockImplementation((_runId, gateKey, payload) =>
      Promise.resolve({
        publicId: gateKey,
        gateKey,
        status: payload.status,
        ownerEmail: payload.ownerEmail ?? null,
        metrics: payload.metrics ?? {},
        notes: payload.notes ?? null,
        lastEvaluatedAt: payload.lastEvaluatedAt ?? new Date().toISOString()
      })
    );
    ReleaseRunModel.updateByPublicId.mockResolvedValue({ ...run, status: 'ready', metadata: { readinessScore: 100 } });

    const evaluation = await releaseOrchestrationService.evaluateRun('rel-2');

    expect(ReleaseGateResultModel.upsertByRunAndGate).toHaveBeenCalledWith(
      21,
      'quality-verification',
      expect.objectContaining({ status: 'pass' })
    );
    expect(ReleaseRunModel.updateByPublicId).toHaveBeenCalledWith(
      'rel-2',
      expect.objectContaining({ status: 'ready' })
    );
    expect(evaluation.readinessScore).toBeGreaterThan(0);
    expect(metrics.recordReleaseRunStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ready', environment: 'production' })
    );
  });
});
