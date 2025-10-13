import { beforeEach, describe, expect, it, vi } from 'vitest';

const listQueueMock = vi.fn();
const getStatusBreakdownMock = vi.fn();

vi.mock('../src/models/KycVerificationModel.js', () => ({
  default: {
    listQueue: listQueueMock,
    getStatusBreakdown: getStatusBreakdownMock,
    upsertForUser: vi.fn(),
    update: vi.fn(),
    findById: vi.fn()
  }
}));

vi.mock('../src/models/KycDocumentModel.js', () => ({
  default: {
    listForVerification: vi.fn(),
    upsertDocument: vi.fn(),
    countByStatus: vi.fn()
  }
}));

vi.mock('../src/models/KycAuditLogModel.js', () => ({
  default: {
    record: vi.fn(),
    listForVerification: vi.fn()
  }
}));

vi.mock('../src/services/StorageService.js', () => ({
  default: {
    headObject: vi.fn(),
    generateStorageKey: vi.fn(() => 'kyc/generated/object.png'),
    createUploadUrl: vi.fn(async () => ({
      bucket: 'edulure-uploads',
      key: 'kyc/generated/object.png',
      url: 'https://example-upload',
      expiresAt: new Date(Date.now() + 60000)
    }))
  }
}));

const { default: IdentityVerificationService } = await import('../src/services/IdentityVerificationService.js');

describe('IdentityVerificationService.getAdminOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates compliance metrics and flags SLA breaches', async () => {
    const now = new Date('2024-11-07T12:00:00Z');

    listQueueMock.mockResolvedValueOnce([
      {
        id: 11,
        reference: 'kyc_alpha',
        status: 'pending_review',
        userId: 201,
        userFirstName: 'Kai',
        userLastName: 'Watanabe',
        userEmail: 'kai.watanabe@edulure.test',
        riskScore: 12.5,
        escalationLevel: 't1',
        documentsSubmitted: 3,
        documentsRequired: 3,
        lastSubmittedAt: new Date('2024-11-06T00:00:00Z'),
        updatedAt: new Date('2024-11-05T18:00:00Z')
      },
      {
        id: 12,
        reference: 'kyc_beta',
        status: 'submitted',
        userId: 202,
        userFirstName: 'Noemi',
        userLastName: 'Carvalho',
        userEmail: 'noemi.carvalho@edulure.test',
        riskScore: 3.2,
        escalationLevel: 'none',
        documentsSubmitted: 2,
        documentsRequired: 3,
        lastSubmittedAt: new Date('2024-11-07T10:00:00Z'),
        updatedAt: new Date('2024-11-07T09:30:00Z')
      }
    ]);

    getStatusBreakdownMock.mockResolvedValueOnce({
      breakdown: [
        { status: 'pending_review', total: 4 },
        { status: 'submitted', total: 3 },
        { status: 'collecting', total: 2 },
        { status: 'resubmission_required', total: 1 }
      ],
      approvalsWithinWindow: 5,
      manualReviewQueue: 2
    });

    const overview = await IdentityVerificationService.getAdminOverview({ now, limit: 5 });

    expect(listQueueMock).toHaveBeenCalledWith({
      statuses: ['pending_review', 'submitted', 'resubmission_required'],
      limit: 5
    });
    expect(getStatusBreakdownMock).toHaveBeenCalledTimes(1);
    expect(overview.metrics[0]).toMatchObject({ id: 'kyc-pending-review', value: '7' });
    expect(overview.metrics[1]).toMatchObject({ id: 'kyc-awaiting-documents', value: '2' });
    expect(overview.metrics[2]).toMatchObject({ id: 'kyc-resubmissions', value: '1' });
    expect(overview.queue).toHaveLength(2);
    expect(overview.queue[0]).toMatchObject({ id: 11, hasBreachedSla: true, riskScore: 12.5 });
    expect(overview.queue[1]).toMatchObject({ id: 12, hasBreachedSla: false, documentsSubmitted: 2 });
    expect(overview.slaBreaches).toBe(1);
    expect(overview.manualReviewQueue).toBe(2);
    expect(overview.lastGeneratedAt).toBe(now.toISOString());
  });
});
