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
  let integrationInviteModel;
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
      listActive: vi.fn().mockResolvedValue([
        {
          incidentUuid: 'inc-001',
          severity: 'critical',
          status: 'open',
          reportedAt: '2025-04-18T16:30:00Z',
          acknowledgement: { ackBreached: true },
          resolution: { resolutionBreached: false },
          metadata: {
            reference: 'FRAUD-221',
            watchers: 12,
            detectionChannel: 'fraud-monitor',
            summary: 'Payment gateway flagged a spike in disputes.',
            recommendedActions: ['Escalate to fraud team'],
            playbooks: [{ id: 'fraud-default', title: 'Fraud default playbook' }]
          },
          category: 'fraud'
        }
      ]),
      listRecentlyResolved: vi.fn().mockResolvedValue([])
    };

    integrationDashboardService = {
      buildSnapshot: vi.fn().mockResolvedValue({
        integrations: [
          {
            id: 'stripe',
            name: 'Stripe',
            health: 'critical',
            summary: { openFailures: 3 }
          },
          {
            id: 'slack',
            name: 'Slack',
            health: 'operational',
            summary: { openFailures: 0 }
          }
        ],
        searchIndex: []
      })
    };

    const kycOverview = {
      metrics: [],
      queue: [
        {
          id: 'kyc-1',
          user: { name: 'Skylar Ops', email: 'skylar@edulure.com' },
          status: 'review',
          documentsSubmitted: 3,
          documentsRequired: 4,
          riskScore: 72,
          waitingHours: 1.25,
          lastSubmittedAt: '2025-04-18T17:30:00Z'
        }
      ],
      slaBreaches: 1,
      manualReviewQueue: 2,
      gdpr: { dsar: { overdue: 1, dueSoon: 2 }, ico: {}, owner: 'Privacy Desk' }
    };

    identityVerificationService = {
      getAdminOverview: vi.fn().mockResolvedValue(kycOverview)
    };

    complianceService = {
      summarisePolicyAttestations: vi
        .fn()
        .mockResolvedValue({ policies: [], totals: { required: 10, granted: 8, outstanding: 2, coverage: 80 } })
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

    integrationInviteModel = {
      list: vi.fn().mockResolvedValue([
        {
          id: 'invite-1',
          provider: 'stripe',
          alias: 'Production',
          ownerEmail: 'ops@edulure.com',
          status: 'pending',
          requestedAt: new Date('2025-04-18T15:45:00Z'),
          expiresAt: new Date('2025-04-25T15:45:00Z')
        }
      ])
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
      integrationInviteModel,
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

    expect(integrationInviteModel.list).toHaveBeenCalledWith({ status: 'pending' });
    expect(result.dashboard.approvals).toMatchObject({
      pendingCount: 3,
      categories: { integrations: 1, compliance: 1, release: 1 }
    });
    expect(result.dashboard.approvals.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'Integration' }),
        expect.objectContaining({ type: 'Compliance' }),
        expect.objectContaining({ type: 'Release' })
      ])
    );

    expect(result.dashboard.operations.support).toMatchObject({
      backlog: 1,
      pendingMemberships: 2,
      followRequests: 1,
      avgResponseMinutes: 150,
      dailyActiveMembers: 12
    });
    expect(result.dashboard.operations.risk).toMatchObject({
      failedPayments: 1,
      refundsPending: 2,
      alertsOpen: 1
    });
    expect(result.dashboard.operations.platform).toMatchObject({
      activeIntegrations: 1,
      degradedIntegrations: 0,
      releaseGatesPending: 1,
      policyCoverage: 80
    });
    expect(result.dashboard.operations.upcomingLaunches).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: expect.stringContaining('Security') })])
    );
  });
});
