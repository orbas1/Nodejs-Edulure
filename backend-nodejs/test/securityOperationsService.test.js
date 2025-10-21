import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SecurityOperationsService } from '../src/services/SecurityOperationsService.js';

const buildRepositoryMock = () => ({
  createRisk: vi.fn(),
  listRisks: vi.fn(),
  fetchRiskSummary: vi.fn(),
  getRiskById: vi.fn(),
  updateRisk: vi.fn(),
  deleteRisk: vi.fn(),
  createRiskReview: vi.fn(),
  listEvidence: vi.fn(),
  createEvidence: vi.fn(),
  listContinuityExercises: vi.fn(),
  fetchContinuitySummary: vi.fn(),
  createContinuityExercise: vi.fn(),
  listAssessments: vi.fn(),
  createAssessment: vi.fn()
});

describe('SecurityOperationsService', () => {
  let repository;
  let auditLogger;
  let changeDataCapture;
  let now;
  let service;

  beforeEach(() => {
    repository = buildRepositoryMock();
    auditLogger = { record: vi.fn() };
    changeDataCapture = { recordEvent: vi.fn() };
    now = new Date('2024-11-21T10:00:00.000Z');
    service = new SecurityOperationsService({
      repository,
      auditLogger,
      changeDataCapture,
      nowProvider: () => now
    });
  });

  it('creates a risk entry with computed scoring and side effects', async () => {
    repository.createRisk.mockResolvedValue({
      id: 11,
      riskUuid: 'risk-uuid-1',
      tenantId: 'tenant-ops',
      title: 'Unencrypted object storage bucket',
      description: 'S3 buckets storing learner evidence are unencrypted at rest.',
      category: 'security',
      status: 'identified',
      severity: 'high',
      likelihood: 'likely',
      residualSeverity: 'high',
      residualLikelihood: 'likely',
      inherentRiskScore: 12,
      residualRiskScore: 12,
      mitigationPlan: 'Enable default encryption and KMS rotation.',
      residualNotes: null,
      regulatoryDriver: 'SOC2',
      reviewCadenceDays: 30,
      identifiedAt: now,
      acceptedAt: null,
      remediatedAt: null,
      closedAt: null,
      lastReviewedAt: null,
      nextReviewAt: null,
      owner: { type: 'team', id: 42, displayName: 'Security', email: 'security@edulure.com' },
      riskOwnerUserId: null,
      tags: ['soc2', 'encryption'],
      detectionControls: ['cloudtrail'],
      mitigationControls: ['kms'],
      metadata: { classification: 'restricted' },
      createdAt: now,
      updatedAt: now
    });

    const created = await service.createRiskEntry({
      tenantId: 'tenant-ops',
      title: 'Unencrypted object storage bucket',
      description: 'S3 buckets storing learner evidence are unencrypted at rest.',
      category: 'security',
      severity: 'high',
      likelihood: 'likely',
      reviewCadenceDays: 30,
      mitigationPlan: 'Enable default encryption and KMS rotation.',
      regulatoryDriver: 'SOC2',
      detectionControls: ['cloudtrail'],
      mitigationControls: ['kms'],
      tags: ['soc2', 'encryption'],
      owner: { type: 'team', id: 42, displayName: 'Security', email: 'security@edulure.com' },
      metadata: { classification: 'restricted' },
      actor: { id: 'admin-1', role: 'admin', type: 'user' },
      requestContext: { requestId: 'req-1' }
    });

    expect(repository.createRisk).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-ops',
        inherentRiskScore: 12,
        residualRiskScore: 12,
        owner: expect.objectContaining({ id: 42, displayName: 'Security' })
      })
    );
    expect(auditLogger.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'risk.register.created' })
    );
    expect(changeDataCapture.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ entityName: 'security_risk_register', operation: 'INSERT' })
    );
    expect(created.residualRiskScore).toBe(12);
  });

  it('records a risk review and updates residual scoring', async () => {
    const risk = {
      id: 44,
      riskUuid: 'risk-uuid-44',
      tenantId: 'tenant-ops',
      title: 'Legacy VPN concentrator',
      description: 'Legacy VPN lacks MFA enforcement.',
      category: 'security',
      status: 'identified',
      severity: 'high',
      likelihood: 'possible',
      residualSeverity: 'high',
      residualLikelihood: 'possible',
      residualRiskScore: 9,
      reviewCadenceDays: 60,
      lastReviewedAt: null,
      nextReviewAt: null
    };
    repository.getRiskById.mockResolvedValue(risk);

    const reviewRecord = {
      reviewUuid: 'review-uuid-1',
      status: 'in_review',
      residualSeverity: 'moderate',
      residualLikelihood: 'unlikely',
      residualRiskScore: 4,
      reviewerId: 'admin-1',
      reviewerName: 'Compliance Lead',
      reviewerEmail: 'compliance@edulure.com',
      nextReviewAt: new Date('2025-01-20T10:00:00.000Z')
    };
    repository.createRiskReview.mockResolvedValue(reviewRecord);

    const updatedRisk = {
      ...risk,
      status: 'in_review',
      residualSeverity: 'moderate',
      residualLikelihood: 'unlikely',
      residualRiskScore: 4,
      lastReviewedAt: new Date('2024-11-21T10:00:00.000Z'),
      nextReviewAt: reviewRecord.nextReviewAt
    };
    repository.updateRisk.mockResolvedValue(updatedRisk);

    const result = await service.recordRiskReview({
      riskId: 44,
      status: 'in_review',
      residualSeverity: 'moderate',
      residualLikelihood: 'unlikely',
      notes: 'VPN migrated to managed SASE pilot.',
      evidenceReferences: ['evidence://vpn/cutover-plan.pdf'],
      reviewer: { id: 'admin-1', displayName: 'Compliance Lead', email: 'compliance@edulure.com' },
      actor: { id: 'admin-1', role: 'admin', type: 'user' },
      requestContext: { traceId: 'trace-22' }
    });

    expect(repository.createRiskReview).toHaveBeenCalledWith(
      expect.objectContaining({
        riskId: 44,
        residualSeverity: 'moderate',
        residualLikelihood: 'unlikely',
        residualRiskScore: 4
      })
    );
    expect(repository.updateRisk).toHaveBeenCalledWith(
      44,
      expect.objectContaining({ residualRiskScore: 4, status: 'in_review' })
    );
    expect(auditLogger.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'risk.register.reviewed' })
    );
    expect(changeDataCapture.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ entityName: 'security_risk_reviews', operation: 'INSERT' })
    );
    expect(result.review.residualRiskScore).toBe(4);
    expect(result.risk.residualSeverity).toBe('moderate');
  });

  it('returns risk register listings with summary analytics', async () => {
    repository.listRisks.mockResolvedValue({
      records: [
        {
          id: 1,
          riskUuid: 'risk-uuid',
          tenantId: 'tenant-ops',
          title: 'Unpatched bastion hosts',
          description: 'Jump boxes lag patching cadence.',
          category: 'security',
          status: 'identified',
          severity: 'moderate',
          likelihood: 'possible',
          residualSeverity: 'moderate',
          residualLikelihood: 'possible',
          inherentRiskScore: 6,
          residualRiskScore: 6,
          owner: { type: 'team', id: null, displayName: 'Platform', email: null },
          tags: ['patching'],
          detectionControls: ['osquery'],
          mitigationControls: ['ansible'],
          metadata: {},
          createdAt: now,
          updatedAt: now
        }
      ],
      total: 1
    });
    repository.fetchRiskSummary.mockResolvedValue({
      statusTotals: { identified: 1 },
      totals: { risks: 1, dueForReview: 0, openFollowUps: 0 },
      averages: { inherent: 6, residual: 6 },
      nextReviewAt: null,
      lastUpdatedAt: now,
      topOwners: [{ owner: 'Platform', total: 1 }],
      topTags: [{ tag: 'patching', count: 1 }]
    });

    const payload = await service.listRiskRegister({ tenantId: 'tenant-ops', limit: 10, offset: 0 });

    expect(payload.items).toHaveLength(1);
    expect(payload.summary.statusTotals.identified).toBe(1);
    expect(payload.pagination.total).toBe(1);
    expect(repository.listRisks).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-ops' }));
    expect(repository.fetchRiskSummary).toHaveBeenCalledWith({ tenantId: 'tenant-ops' });
  });

  it('deletes a risk and records audit plus cdc events', async () => {
    const risk = {
      id: 77,
      riskUuid: 'risk-uuid-77',
      tenantId: 'tenant-ops',
      title: 'Expired TLS certificates',
      status: 'identified',
      residualRiskScore: 9
    };

    repository.getRiskById.mockResolvedValue(risk);

    const result = await service.deleteRisk({
      riskId: 77,
      tenantId: 'tenant-ops',
      actor: { id: 'admin-1', role: 'admin', type: 'user' },
      requestContext: { requestId: 'req-risk-delete' },
      reason: 'Consolidated with centralised certificate automation'
    });

    expect(repository.deleteRisk).toHaveBeenCalledWith(77);
    expect(auditLogger.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'risk.register.deleted',
        metadata: expect.objectContaining({
          title: 'Expired TLS certificates',
          residualRiskScore: 9,
          reason: 'Consolidated with centralised certificate automation'
        })
      })
    );
    expect(changeDataCapture.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entityName: 'security_risk_register',
        operation: 'DELETE',
        payload: expect.objectContaining({ reason: 'Consolidated with centralised certificate automation' })
      })
    );
    expect(result).toEqual({ success: true });
  });

  it('records audit evidence with normalised sources and timestamps', async () => {
    const capturedAt = '2024-11-18T12:00:00.000Z';
    const evidence = {
      evidenceUuid: 'evidence-uuid-1',
      riskId: 55,
      framework: 'SOC2',
      controlReference: 'CC1.1',
      status: 'submitted',
      sources: ['jira-123', 'confluence-9'],
      capturedAt: new Date(capturedAt)
    };

    repository.createEvidence.mockResolvedValue(evidence);

    const result = await service.recordAuditEvidence({
      tenantId: 'tenant-ops',
      riskId: 55,
      framework: 'SOC2',
      controlReference: 'CC1.1',
      evidenceType: 'report',
      storagePath: 's3://evidence/cc1.1.pdf',
      checksum: 'sha256:abcd',
      sources: 'jira-123, confluence-9',
      capturedAt,
      status: 'submitted',
      submittedBy: 'compliance-bot',
      submittedByEmail: 'compliance@edulure.com',
      description: 'Quarterly evidence package',
      metadata: { quarter: 'Q4' },
      actor: { id: 'auditor-1', role: 'admin', type: 'user' },
      requestContext: { requestId: 'req-evidence-1' }
    });

    expect(repository.createEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-ops',
        storagePath: 's3://evidence/cc1.1.pdf',
        sources: ['jira-123', 'confluence-9'],
        capturedAt: expect.any(Date),
        status: 'submitted'
      })
    );
    const [createArgs] = repository.createEvidence.mock.calls;
    expect(createArgs[0].capturedAt.toISOString()).toBe(capturedAt);
    expect(auditLogger.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'risk.evidence.recorded', metadata: expect.objectContaining({ framework: 'SOC2' }) })
    );
    expect(changeDataCapture.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ entityName: 'security_audit_evidence', operation: 'INSERT' })
    );
    expect(result).toEqual(evidence);
  });
});
