import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/models/GovernanceContractModel.js', () => ({
  __esModule: true,
  default: {
    getLifecycleSummary: vi.fn(),
    list: vi.fn(),
    updateByPublicId: vi.fn(),
    findByPublicId: vi.fn()
  }
}));

vi.mock('../src/models/GovernanceVendorAssessmentModel.js', () => ({
  __esModule: true,
  default: {
    getRiskSummary: vi.fn(),
    list: vi.fn(),
    updateByPublicId: vi.fn()
  }
}));

vi.mock('../src/models/GovernanceReviewCycleModel.js', () => ({
  __esModule: true,
  default: {
    getScheduleSummary: vi.fn(),
    list: vi.fn(),
    findByPublicId: vi.fn(),
    updateByPublicId: vi.fn()
  }
}));

vi.mock('../src/models/GovernanceRoadmapCommunicationModel.js', () => ({
  __esModule: true,
  default: {
    getCommunicationSummary: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    findByPublicId: vi.fn(),
    updateByPublicId: vi.fn()
  }
}));

const contractModel = (await import('../src/models/GovernanceContractModel.js')).default;
const vendorAssessmentModel = (await import('../src/models/GovernanceVendorAssessmentModel.js')).default;
const reviewCycleModel = (await import('../src/models/GovernanceReviewCycleModel.js')).default;
const communicationModel = (await import('../src/models/GovernanceRoadmapCommunicationModel.js')).default;

vi.mock('../src/observability/metrics.js', () => ({
  updateGovernanceContractHealthMetrics: vi.fn(),
  updateVendorAssessmentRiskMetrics: vi.fn(),
  recordGovernanceCommunicationScheduled: vi.fn(),
  recordGovernanceCommunicationPerformance: vi.fn()
}));

const metrics = await import('../src/observability/metrics.js');
const governanceStakeholderServiceModule = await import('../src/services/GovernanceStakeholderService.js');
const governanceStakeholderService = governanceStakeholderServiceModule.default;

describe('GovernanceStakeholderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds governance overview with lifecycle enrichments', async () => {
    contractModel.getLifecycleSummary.mockResolvedValue({
      totalContracts: 5,
      activeContracts: 4,
      renewalsWithinWindow: 2,
      overdueRenewals: 1,
      escalatedContracts: 1
    });
    contractModel.list
      .mockResolvedValueOnce({ total: 2, items: [{ publicId: 'contract-1', renewalDate: '2025-05-01', obligations: [] }] })
      .mockResolvedValueOnce({ total: 0, items: [] });
    vendorAssessmentModel.getRiskSummary.mockResolvedValue({
      totalAssessments: 6,
      highRiskAssessments: 2,
      criticalRiskAssessments: 1,
      remediationInProgress: 1
    });
    vendorAssessmentModel.list.mockResolvedValue({ total: 2, items: [{ publicId: 'assessment-1' }] });
    reviewCycleModel.getScheduleSummary.mockResolvedValue({
      totalReviews: 3,
      activeReviews: 1,
      overdueMilestones: 0,
      completedReviews: 2
    });
    reviewCycleModel.list.mockResolvedValue({
      total: 1,
      items: [{ publicId: 'review-1', nextMilestoneAt: '2025-04-20T00:00:00.000Z', actionItems: [] }]
    });
    communicationModel.getCommunicationSummary.mockResolvedValue({
      totalCommunications: 4,
      scheduledCommunications: 2,
      sentCommunications: 1,
      cancelledCommunications: 1
    });
    communicationModel.list.mockResolvedValue({ total: 2, items: [{ publicId: 'comm-1', metrics: {} }] });

    const overview = await governanceStakeholderService.getOverview();

    expect(overview.contracts.summary.totalContracts).toBe(5);
    expect(overview.contracts.upcomingRenewals[0]).toHaveProperty('daysUntilRenewal');
    expect(metrics.updateGovernanceContractHealthMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ totalContracts: 5 })
    );
    expect(metrics.updateVendorAssessmentRiskMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ totalAssessments: 6 })
    );
    expect(metrics.recordGovernanceCommunicationPerformance).toHaveBeenCalledWith(
      expect.objectContaining({ summary: expect.objectContaining({ totalCommunications: 4 }) })
    );
  });

  it('updates contract obligations and refreshes metrics', async () => {
    contractModel.updateByPublicId.mockResolvedValue({
      publicId: 'contract-2',
      renewalDate: '2025-06-01',
      obligations: [{ id: 'existing', completedAt: null }]
    });

    const updated = await governanceStakeholderService.updateContract('contract-2', {
      obligations: [{ description: 'Renew SOC 2 report', owner: 'risk@edulure.com' }]
    });

    expect(contractModel.updateByPublicId).toHaveBeenCalledWith(
      'contract-2',
      expect.objectContaining({ obligations: expect.any(Array) })
    );
    expect(updated.renewalStatus).toBeDefined();
    expect(metrics.updateGovernanceContractHealthMetrics).toHaveBeenCalled();
  });

  it('records vendor assessment decision and updates metrics', async () => {
    vendorAssessmentModel.updateByPublicId.mockResolvedValue({ publicId: 'assessment-3', status: 'approved' });

    const updated = await governanceStakeholderService.recordVendorAssessmentDecision('assessment-3', {
      status: 'approved',
      riskLevel: 'medium',
      riskScore: 3.4
    });

    expect(updated.status).toBe('approved');
    expect(vendorAssessmentModel.updateByPublicId).toHaveBeenCalledWith(
      'assessment-3',
      expect.objectContaining({ status: 'approved', riskLevel: 'medium' })
    );
    expect(metrics.updateVendorAssessmentRiskMetrics).toHaveBeenCalled();
  });

  it('appends review action items with readiness score tracking', async () => {
    reviewCycleModel.findByPublicId.mockResolvedValue({
      publicId: 'review-7',
      actionItems: [],
      readinessScore: 40
    });
    reviewCycleModel.updateByPublicId.mockResolvedValue({
      publicId: 'review-7',
      actionItems: [{ id: 'new-action', status: 'open' }],
      readinessScore: 55,
      nextMilestoneAt: '2025-04-10T00:00:00.000Z'
    });

    const updated = await governanceStakeholderService.recordReviewAction('review-7', {
      summary: 'Collect provider steering committee notes',
      owner: 'partners@edulure.com',
      readinessScore: 55
    });

    expect(reviewCycleModel.updateByPublicId).toHaveBeenCalledWith(
      'review-7',
      expect.objectContaining({ readinessScore: 55 })
    );
    expect(updated.openActionItems).toBe(1);
  });

  it('schedules communications and records telemetry', async () => {
    communicationModel.create.mockResolvedValue({
      publicId: 'comm-55',
      audience: 'executive-sponsors',
      channel: 'webinar',
      status: 'scheduled',
      metrics: {}
    });

    const created = await governanceStakeholderService.scheduleCommunication({
      audience: 'executive-sponsors',
      channel: 'webinar',
      subject: 'Roadmap deep-dive'
    });

    expect(communicationModel.create).toHaveBeenCalled();
    expect(metrics.recordGovernanceCommunicationScheduled).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'executive-sponsors', channel: 'webinar', status: 'scheduled' })
    );
    expect(created.engagementRate).toBeNull();
  });
});
