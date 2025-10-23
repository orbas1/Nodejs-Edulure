import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import OperatorDashboardService from '../src/services/OperatorDashboardService.js';
import PlatformSettingsService from '../src/services/PlatformSettingsService.js';

describe('OperatorDashboardService release readiness integration', () => {
  const logger = { warn: vi.fn(), error: vi.fn() };
  let manifestService;
  let incidentsModel;
  let integrationDashboardService;
  let complianceService;
  let auditEventService;
  let identityVerificationService;
  let partitionService;
  let releaseService;
  let governanceContractModel;
  let now;

  beforeEach(() => {
    vi.restoreAllMocks();

    now = new Date('2025-04-18T19:00:00Z');

    vi.spyOn(PlatformSettingsService, 'getAdminProfileSettings').mockResolvedValue({ organisation: { name: 'Edulure' } });
    vi.spyOn(PlatformSettingsService, 'getPaymentSettings').mockResolvedValue({ processors: [] });
    vi.spyOn(PlatformSettingsService, 'getEmailSettings').mockResolvedValue({ branding: {} });
    vi.spyOn(PlatformSettingsService, 'getSecuritySettings').mockResolvedValue({ mfa: {} });
    vi.spyOn(PlatformSettingsService, 'getFinanceSettings').mockResolvedValue({ approvals: {} });
    vi.spyOn(PlatformSettingsService, 'getMonetizationSettings').mockResolvedValue({ commissions: {} });

    manifestService = {
      buildManifest: vi.fn().mockResolvedValue({
        generatedAt: now.toISOString(),
        services: [],
        capabilities: [],
        summary: { services: {}, capabilities: {} }
      })
    };

    incidentsModel = {
      listActive: vi.fn().mockResolvedValue([]),
      listRecentlyResolved: vi.fn().mockResolvedValue([])
    };

    integrationDashboardService = {
      buildSnapshot: vi.fn().mockResolvedValue({ integrations: [], searchIndex: [] })
    };

    const kycOverview = {
      metrics: [],
      queue: [],
      slaBreaches: 0,
      manualReviewQueue: 0,
      gdpr: { dsar: { overdue: 0 }, ico: {} }
    };

    identityVerificationService = {
      getAdminOverview: vi.fn().mockResolvedValue(kycOverview)
    };

    complianceService = {
      summarisePolicyAttestations: vi
        .fn()
        .mockResolvedValue({ policies: [], totals: { required: 0, granted: 0, outstanding: 0, coverage: 100 } })
    };

    auditEventService = {
      summariseRecent: vi.fn().mockResolvedValue({
        totals: { events: 0, investigations: 0, controlsTested: 0, policyUpdates: 0 },
        countsBySeverity: { info: 0, notice: 0, warning: 0, error: 0, critical: 0 },
        eventTypeBreakdown: [],
        actorBreakdown: [],
        latestEvents: [],
        lastEventAt: null
      })
    };

    partitionService = {
      listArchives: vi.fn().mockResolvedValue([
        {
          id: 'archive-1',
          tableName: 'audit_events',
          partitionName: 'p2025',
          rangeStart: '2025-04-01T00:00:00Z',
          rangeEnd: '2025-04-18T00:00:00Z',
          retentionDays: 90,
          archivedAt: '2025-04-18T00:00:00Z',
          droppedAt: null,
          byteSize: 5120,
          rowCount: 120,
          checksum: 'abc',
          metadata: {}
        }
      ])
    };

    releaseService = {
      listChecklist: vi.fn().mockResolvedValue({
        items: [
          {
            slug: 'quality-verification',
            title: 'Quality assurance sign-off',
            description: 'Ensure QA run passes.',
            category: 'quality'
          }
        ],
        requiredGates: ['quality-verification', 'security-review'],
        thresholds: { minCoverage: 0.9, maxErrorRate: 0.01 }
      }),
      listRuns: vi.fn().mockResolvedValue({
        items: [
          {
            publicId: 'run-1',
            versionTag: 'v1.0.0-rc.5',
            environment: 'staging',
            status: 'in_progress',
            metadata: { readinessScore: 72 }
          }
        ]
      }),
      getRun: vi.fn().mockResolvedValue({
        run: {
          publicId: 'run-1',
          versionTag: 'v1.0.0-rc.5',
          environment: 'staging',
          changeWindowStart: '2025-04-18T18:00:00Z',
          changeWindowEnd: '2025-04-18T19:00:00Z',
          startedAt: '2025-04-18T17:30:00Z',
          metadata: { readinessScore: 72 }
        },
        gates: [
          {
            gateKey: 'quality-verification',
            status: 'pass',
            ownerEmail: 'qa@edulure.com',
            lastEvaluatedAt: '2025-04-18T18:10:00Z',
            snapshot: { title: 'Quality assurance sign-off', category: 'quality' }
          },
          {
            gateKey: 'security-review',
            status: 'in_progress',
            ownerEmail: 'security@edulure.com',
            notes: 'Awaiting mitigation sign-off',
            lastEvaluatedAt: '2025-04-18T18:15:00Z',
            snapshot: { title: 'Security review', category: 'security' }
          }
        ]
      })
    };

    governanceContractModel = {
      getLifecycleSummary: vi.fn().mockResolvedValue({
        totalContracts: 3,
        activeContracts: 2,
        renewalsWithinWindow: 1,
        overdueRenewals: 1,
        escalatedContracts: 0
      }),
      list: vi.fn().mockResolvedValue({
        items: [
          {
            publicId: 'gov-1',
            vendorName: 'ShieldGuard Security',
            contractType: 'penetration-testing',
            status: 'active',
            riskTier: 'high',
            renewalDate: '2025-07-01',
            ownerEmail: 'security@edulure.com',
            obligations: [{ id: 'evidence', description: 'Upload pen test report' }],
            metadata: { runbookUrl: 'https://docs.edulure.com/shieldguard' }
          }
        ],
        total: 1
      })
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('aggregates release readiness, governance, and seed-backed data for the admin console', async () => {
    const service = new OperatorDashboardService({
      manifestService,
      incidentsModel,
      integrationDashboardService,
      complianceService,
      auditEventService,
      identityVerificationService,
      partitionService,
      storage: { createDownloadUrl: vi.fn() },
      releaseService,
      governanceContractModel,
      nowProvider: () => now,
      loggerInstance: logger
    });

    const result = await service.build({ user: { id: 'admin-1', role: 'admin' }, tenantId: 'global', now });

    expect(releaseService.listChecklist).toHaveBeenCalledWith({}, { limit: 200 });
    expect(releaseService.listRuns).toHaveBeenCalledWith({}, { limit: 5 });
    expect(releaseService.getRun).toHaveBeenCalledWith('run-1');

    const release = result.dashboard.release;
    expect(release.requiredGates).toEqual(['quality-verification', 'security-review']);
    expect(release.thresholds).toMatchObject({ minCoverage: 0.9, maxErrorRate: 0.01 });
    expect(release.latestRun.versionTag).toBe('v1.0.0-rc.5');
    expect(release.summary).toMatchObject({ pass: 1, in_progress: 1 });
    expect(release.tasks).toHaveLength(1);
    expect(release.tasks[0]).toMatchObject({ gateKey: 'security-review', status: 'in_progress' });

    expect(result.dashboard.meta.releaseTasks).toBe(1);
    expect(result.dashboard.meta.helperText).toMatch(/Release readiness requires 1 gate/i);
    expect(result.profileStats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Release gates', value: '1 pending' })
      ])
    );

    expect(result.dashboard.compliance.governance.summary).toMatchObject({
      totalContracts: 3,
      renewalsWithinWindow: 1,
      overdueRenewals: 1
    });
    expect(result.dashboard.compliance.governance.contracts[0]).toMatchObject({
      publicId: 'gov-1',
      vendorName: 'ShieldGuard Security',
      obligations: expect.arrayContaining(['Upload pen test report'])
    });
  });
});
