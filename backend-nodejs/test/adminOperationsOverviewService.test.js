import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminOperationsOverviewService } from '../src/services/AdminOperationsOverviewService.js';

const governanceContractModel = {
  list: vi.fn(),
  getLifecycleSummary: vi.fn()
};

const releaseChecklistItemModel = {
  list: vi.fn()
};

const releaseService = {
  summariseReadiness: vi.fn()
};

const auditLogService = {
  listRecent: vi.fn()
};

function createService() {
  return new AdminOperationsOverviewService({
    governanceContractModel,
    releaseChecklistItemModel,
    releaseService,
    auditLogService
  });
}

describe('AdminOperationsOverviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds an overview snapshot with prioritised compliance alerts', async () => {
    const today = new Date();
    const upcoming = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 10)
      .toISOString()
      .slice(0, 10);
    const overdue = new Date(today.getTime() - 1000 * 60 * 60 * 24 * 5)
      .toISOString()
      .slice(0, 10);

    governanceContractModel.list
      .mockResolvedValueOnce({
        items: [
          {
            publicId: 'contract-overdue',
            vendorName: 'ShieldGuard',
            status: 'pending_renewal',
            riskTier: 'medium',
            renewalDate: overdue,
            ownerEmail: 'ops@example.com',
            contractValueCents: 1250000,
            currency: 'USD'
          }
        ]
      })
      .mockResolvedValueOnce({
        items: [
          {
            publicId: 'contract-escalated',
            vendorName: 'AuditSync',
            status: 'escalated',
            riskTier: 'high',
            renewalDate: upcoming,
            ownerEmail: 'legal@example.com',
            contractValueCents: 250000,
            currency: 'USD'
          },
          {
            publicId: 'contract-high-risk',
            vendorName: 'FlowOps',
            status: 'active',
            riskTier: 'high',
            renewalDate: upcoming,
            ownerEmail: 'governance@example.com',
            contractValueCents: 0,
            currency: 'USD'
          }
        ]
      });

    governanceContractModel.getLifecycleSummary.mockResolvedValue({
      totalContracts: 12,
      activeContracts: 10,
      renewalsWithinWindow: 3,
      overdueRenewals: 1,
      escalatedContracts: 1
    });

    releaseService.summariseReadiness.mockResolvedValue({
      environment: 'all',
      totals: { ready: 2, blocked: 1, in_progress: 0, scheduled: 2 },
      averageReadinessScore: 82,
      evaluatedAt: '2024-06-01T00:00:00.000Z'
    });

    releaseChecklistItemModel.list.mockResolvedValue({
      items: [
        {
          category: 'quality',
          autoEvaluated: true,
          defaultOwnerEmail: 'qa@example.com'
        },
        {
          category: 'quality',
          autoEvaluated: false,
          defaultOwnerEmail: 'qa@example.com'
        },
        {
          category: 'security',
          autoEvaluated: false,
          defaultOwnerEmail: 'security@example.com'
        }
      ]
    });

    auditLogService.listRecent.mockResolvedValue({
      entries: [
        { id: 'a1', severity: 'warning' },
        { id: 'a2', severity: 'critical' },
        { id: 'a3', severity: 'warning' }
      ],
      totals: { content: 1, identity: 1, featureFlags: 1, social: 0 },
      generatedAt: '2024-06-01T12:00:00.000Z'
    });

    const service = createService();
    const overview = await service.getOverview();

    expect(governanceContractModel.list).toHaveBeenCalledTimes(2);
    expect(overview.compliance.alerts.map((alert) => alert.id)).toEqual([
      'contract-escalated',
      'contract-overdue',
      'contract-high-risk'
    ]);
    expect(overview.compliance.alerts[0]).toMatchObject({
      severity: 'critical',
      vendor: 'AuditSync'
    });
    expect(overview.compliance.summary).toEqual({
      totalContracts: 12,
      activeContracts: 10,
      renewalsWithinWindow: 3,
      overdueRenewals: 1,
      escalatedContracts: 1
    });

    expect(overview.release.readiness).toEqual({
      environment: 'all',
      totals: { ready: 2, blocked: 1, in_progress: 0, scheduled: 2 },
      averageReadinessScore: 82,
      evaluatedAt: '2024-06-01T00:00:00.000Z'
    });
    expect(overview.release.checklist).toEqual({
      totalItems: 3,
      autoEvaluated: 1,
      manual: 2,
      categories: [
        {
          id: 'quality',
          label: 'Quality',
          total: 2,
          autoEvaluated: 1,
          manual: 1,
          defaultOwners: ['qa@example.com']
        },
        {
          id: 'security',
          label: 'Security',
          total: 1,
          autoEvaluated: 0,
          manual: 1,
          defaultOwners: ['security@example.com']
        }
      ]
    });

    expect(overview.audit.totalsBySource).toEqual({
      content: 1,
      identity: 1,
      featureFlags: 1,
      social: 0
    });
    expect(overview.audit.totalsBySeverity).toEqual({
      warning: 2,
      critical: 1
    });
    expect(overview.audit.generatedAt).toBe('2024-06-01T12:00:00.000Z');
  });
});
