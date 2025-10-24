import { beforeEach, describe, expect, it, vi } from 'vitest';

const listQueueMock = vi.fn();
const getStatusBreakdownMock = vi.fn();
const upsertForUserMock = vi.fn();
const updateVerificationMock = vi.fn();
const findVerificationByIdMock = vi.fn();

const listDocumentsMock = vi.fn();
const upsertDocumentMock = vi.fn();
const countDocumentsByStatusMock = vi.fn();

const recordAuditLogMock = vi.fn();
const listAuditLogsMock = vi.fn();

vi.mock('../src/models/KycVerificationModel.js', () => ({
  default: {
    listQueue: listQueueMock,
    getStatusBreakdown: getStatusBreakdownMock,
    upsertForUser: upsertForUserMock,
    update: updateVerificationMock,
    findById: findVerificationByIdMock
  }
}));

vi.mock('../src/models/KycDocumentModel.js', () => ({
  default: {
    listForVerification: listDocumentsMock,
    upsertDocument: upsertDocumentMock,
    countByStatus: countDocumentsByStatusMock
  }
}));

vi.mock('../src/models/KycAuditLogModel.js', () => ({
  default: {
    record: recordAuditLogMock,
    listForVerification: listAuditLogsMock
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

beforeEach(() => {
  vi.clearAllMocks();
  listDocumentsMock.mockResolvedValue([]);
  listAuditLogsMock.mockResolvedValue([]);
  upsertForUserMock.mockResolvedValue(null);
});

describe('IdentityVerificationService.getAdminOverview', () => {

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
    expect(overview.gdpr).toBeTruthy();
    expect(overview.gdpr.dsar).toMatchObject({
      open: 4,
      dueSoon: 1,
      overdue: 1,
      completed30d: 5,
      averageCompletionHours: 64,
      slaHours: 72,
      owner: 'Data Protection Officer'
    });
    expect(overview.gdpr.dsar.nextIcoSubmission).toBeDefined();
    expect(overview.gdpr.registers).toHaveLength(3);
    expect(overview.gdpr.registers[0]).toMatchObject({ id: 'ropa', status: 'current' });
    expect(overview.gdpr.controls).toMatchObject({
      breachNotifications: expect.objectContaining({ status: 'tested' }),
      dataProtectionImpactAssessments: expect.objectContaining({ status: 'current' }),
      training: expect.objectContaining({ status: 'in_progress' })
    });
    expect(overview.gdpr.ico).toMatchObject({
      registrationNumber: 'ZB765432',
      status: 'Active'
    });
  });
});

describe('IdentityVerificationService.getVerificationSummaryForUser', () => {
  it('maps documents, outstanding requirements, and audit timeline events', async () => {
    const verificationRecord = {
      id: 9,
      reference: 'kyc_1234567890',
      userId: 55,
      status: 'pending_review',
      documentsRequired: 3,
      documentsSubmitted: 2,
      riskScore: 7.5,
      needsManualReview: true,
      escalationLevel: 't1',
      lastSubmittedAt: new Date('2024-05-01T10:00:00Z'),
      lastReviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
      policyReferences: JSON.stringify(['AML-2024']),
      sensitiveNotesCiphertext: null,
      sensitiveNotesHash: null,
      sensitiveNotesClassification: null,
      encryptionKeyVersion: 'v1',
      createdAt: new Date('2024-04-30T08:00:00Z'),
      updatedAt: new Date('2024-05-01T10:00:00Z')
    };

    upsertForUserMock.mockResolvedValueOnce(verificationRecord);
    listDocumentsMock.mockResolvedValueOnce([
      {
        id: 1,
        verificationId: verificationRecord.id,
        documentType: 'government-id-front',
        status: 'accepted',
        fileNameMask: 'id-front.png',
        mimeTypeMask: 'image/png',
        sizeBytes: 2048,
        submittedAt: new Date('2024-04-30T09:15:00Z'),
        reviewedAt: new Date('2024-04-30T12:00:00Z'),
        documentPayloadCiphertext: null,
        documentEncryptionKeyVersion: 'v1'
      },
      {
        id: 2,
        verificationId: verificationRecord.id,
        documentType: 'identity-selfie',
        status: 'pending',
        fileNameMask: 'selfie.png',
        mimeTypeMask: 'image/png',
        sizeBytes: 1024,
        submittedAt: new Date('2024-04-30T09:30:00Z'),
        reviewedAt: null,
        documentPayloadCiphertext: null,
        documentEncryptionKeyVersion: 'v1'
      }
    ]);
    listAuditLogsMock.mockResolvedValueOnce([
      {
        id: 90,
        verificationId: verificationRecord.id,
        actorId: 77,
        action: 'document_attached',
        notes: null,
        metadata: JSON.stringify({ documentType: 'identity-selfie' }),
        createdAt: new Date('2024-04-30T09:30:00Z'),
        actorFirstName: 'Kai',
        actorLastName: 'Watanabe',
        actorEmail: 'kai@example.com'
      },
      {
        id: 91,
        verificationId: verificationRecord.id,
        actorId: 88,
        action: 'submitted_for_review',
        notes: null,
        metadata: JSON.stringify({ documentsSubmitted: 2 }),
        createdAt: new Date('2024-05-01T10:00:00Z'),
        actorFirstName: 'Mira',
        actorLastName: 'Patel',
        actorEmail: 'mira@example.com'
      }
    ]);

    const summary = await IdentityVerificationService.getVerificationSummaryForUser(55);

    expect(upsertForUserMock.mock.calls[0][0]).toBe(55);
    expect(listDocumentsMock.mock.calls[0][0]).toBe(verificationRecord.id);
    expect(listAuditLogsMock.mock.calls[0][0]).toBe(verificationRecord.id);
    expect(summary.reference).toBe('kyc_1234567890');
    expect(summary.requiredDocuments).toHaveLength(3);
    expect(summary.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'government-id-front', label: 'Government ID (front)' }),
        expect.objectContaining({ type: 'identity-selfie', status: 'pending' })
      ])
    );
    expect(summary.outstandingDocuments.map((doc) => doc.type)).toContain('government-id-back');
    expect(summary.timeline.length).toBeGreaterThanOrEqual(4);
    expect(summary.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'audit', action: 'submitted_for_review' }),
        expect.objectContaining({ type: 'document', metadata: expect.objectContaining({ type: 'identity-selfie' }) }),
        expect.objectContaining({ type: 'status', status: 'pending_review' })
      ])
    );
    const timestamps = summary.timeline.map((event) => event.occurredAt).filter(Boolean);
    expect(timestamps).toEqual([...timestamps].sort());
    expect(summary.history).toEqual(summary.timeline);
  });
});
