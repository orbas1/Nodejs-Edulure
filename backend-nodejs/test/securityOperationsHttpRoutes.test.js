import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (_req, _res, next) => next()
}));

const listRiskRegister = vi.fn();
const createRiskEntry = vi.fn();
const updateRiskStatus = vi.fn();
const deleteRisk = vi.fn();
const recordRiskReview = vi.fn();
const listAuditEvidence = vi.fn();
const recordAuditEvidence = vi.fn();
const listContinuityExercises = vi.fn();
const logContinuityExercise = vi.fn();
const listAssessments = vi.fn();
const scheduleAssessment = vi.fn();

vi.mock('../src/services/SecurityOperationsService.js', () => ({
  SecurityOperationsService: class {},
  default: {
    listRiskRegister,
    createRiskEntry,
    updateRiskStatus,
    deleteRisk,
    recordRiskReview,
    listAuditEvidence,
    recordAuditEvidence,
    listContinuityExercises,
    logContinuityExercise,
    listAssessments,
    scheduleAssessment
  }
}));

let app;

describe('Security operations HTTP routes', () => {
  beforeAll(async () => {
    const { default: securityRouter } = await import('../src/routes/security.routes.js');
    app = express();
    app.use(express.json());
    app.use('/api/v1/security', securityRouter);
    app.use((error, _req, res, _next) => {
      const status = error?.status ?? 500;
      res.status(status).json({ success: false, error: error?.message ?? 'Internal Server Error' });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns risk register listings with pagination metadata', async () => {
    listRiskRegister.mockResolvedValue({
      items: [],
      pagination: { total: 0, limit: 20, offset: 0 },
      summary: {
        statusTotals: {},
        totals: { risks: 0, dueForReview: 0, openFollowUps: 0 },
        averages: { inherent: 0, residual: 0 },
        nextReviewAt: null,
        lastUpdatedAt: null,
        topOwners: [],
        topTags: []
      }
    });

    const response = await request(app)
      .get('/api/v1/security/risk-register')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.pagination.total).toBe(0);
    expect(listRiskRegister).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'global' }));
  });

  it('creates risk entries and returns persisted payload', async () => {
    createRiskEntry.mockResolvedValue({ id: 1, riskUuid: 'risk-uuid-1', title: 'Third-party outage' });

    const response = await request(app)
      .post('/api/v1/security/risk-register')
      .send({
        title: '  Third-party outage ',
        description: ' Vendor SOC2 revoked. ',
        mitigationPlan: '  Documented  ',
        reviewCadenceDays: 45,
        tags: [' vendor-risk ', '', 'x'.repeat(120)],
        detectionControls: ['  audit-log '],
        mitigationControls: '  playbook  '
      })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(201);
    expect(createRiskEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Third-party outage',
        description: 'Vendor SOC2 revoked.',
        mitigationPlan: 'Documented',
        reviewCadenceDays: 45,
        detectionControls: ['audit-log'],
        mitigationControls: ['playbook'],
        tags: ['vendor-risk', 'x'.repeat(100)]
      })
    );
  });

  it('rejects create requests without the minimum required attributes', async () => {
    const response = await request(app)
      .post('/api/v1/security/risk-register')
      .send({ description: 'Missing title' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('title is required');
    expect(createRiskEntry).not.toHaveBeenCalled();
  });

  it('rejects create requests with invalid review cadence', async () => {
    const response = await request(app)
      .post('/api/v1/security/risk-register')
      .send({ title: 'Risk', description: 'Description', reviewCadenceDays: -2 })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('reviewCadenceDays must be a positive number');
    expect(createRiskEntry).not.toHaveBeenCalled();
  });

  it('updates residual status information', async () => {
    updateRiskStatus.mockResolvedValue({ id: 99, status: 'accepted', residualRiskScore: 4 });

    const response = await request(app)
      .patch('/api/v1/security/risk-register/99/status')
      .send({ status: ' accepted ', residualSeverity: 'moderate', residualLikelihood: 'unlikely' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(updateRiskStatus).toHaveBeenCalledWith(
      expect.objectContaining({ riskId: 99, status: 'accepted' })
    );
  });

  it('rejects status updates when the status value is missing', async () => {
    const response = await request(app)
      .patch('/api/v1/security/risk-register/11/status')
      .send({ residualSeverity: 'moderate' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('status is required');
    expect(updateRiskStatus).not.toHaveBeenCalled();
  });

  it('deletes risks from the register', async () => {
    deleteRisk.mockResolvedValue({ success: true });

    const response = await request(app)
      .delete('/api/v1/security/risk-register/23')
      .send({ reason: '  Duplicate entry resolved  ' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ success: true });
    expect(deleteRisk).toHaveBeenCalledWith(
      expect.objectContaining({ riskId: 23, reason: 'Duplicate entry resolved' })
    );
  });

  it('rejects delete operations when the identifier is invalid', async () => {
    const response = await request(app)
      .delete('/api/v1/security/risk-register/not-a-number')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('riskId must be a positive integer');
    expect(deleteRisk).not.toHaveBeenCalled();
  });

  it('truncates excessively long deletion reasons', async () => {
    deleteRisk.mockResolvedValue({ success: true });
    const longReason = 'x'.repeat(600);

    await request(app)
      .delete('/api/v1/security/risk-register/42')
      .send({ reason: longReason })
      .set('Authorization', 'Bearer token');

    const [[payload]] = deleteRisk.mock.calls.slice(-1);
    expect(payload.reason).toBe('x'.repeat(500));
  });

  it('normalises risk register filters and sorting', async () => {
    listRiskRegister.mockResolvedValue({
      items: [],
      pagination: { total: 0, limit: 50, offset: 10 },
      summary: {}
    });

    const response = await request(app)
      .get(
        '/api/v1/security/risk-register?limit=50&offset=10&ownerId=5&includeClosed=no&sortBy=updated_at&sortDirection=ASC&search=  outage  '
      )
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(listRiskRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 50,
        offset: 10,
        ownerId: 5,
        includeClosed: false,
        sortBy: 'updatedAt',
        sortDirection: 'asc',
        search: 'outage'
      })
    );
  });

  it('rejects risk register listings when pagination values are invalid', async () => {
    const response = await request(app)
      .get('/api/v1/security/risk-register?limit=-1&offset=-10')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('limit must be a positive integer not exceeding 100');
    expect(listRiskRegister).not.toHaveBeenCalled();
  });

  it('rejects risk register listings when sort values are invalid', async () => {
    const response = await request(app)
      .get('/api/v1/security/risk-register?sortBy=unknown&sortDirection=sideways')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      'sortBy must be one of residualRisk, inherentRisk, updatedAt, createdAt, nextReviewAt, status'
    );
    expect(listRiskRegister).not.toHaveBeenCalled();
  });

  it('rejects risk register listings when includeClosed is not boolean-like', async () => {
    const response = await request(app)
      .get('/api/v1/security/risk-register?includeClosed=maybe')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('includeClosed must be a boolean value');
    expect(listRiskRegister).not.toHaveBeenCalled();
  });

  it('lists audit evidence with filtering', async () => {
    listAuditEvidence.mockResolvedValue({
      items: [],
      pagination: { total: 0, limit: 20, offset: 0 }
    });

    const response = await request(app)
      .get('/api/v1/security/audit-evidence?framework=SOC2&limit=5')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(listAuditEvidence).toHaveBeenCalledWith(expect.objectContaining({ framework: 'SOC2', limit: 5 }));
  });

  it('rejects audit evidence listings with invalid filters', async () => {
    const response = await request(app)
      .get('/api/v1/security/audit-evidence?riskId=-4&limit=200')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('riskId must be a positive integer');
    expect(listAuditEvidence).not.toHaveBeenCalled();
  });

  it('records audit evidence submissions', async () => {
    recordAuditEvidence.mockResolvedValue({ evidenceUuid: 'evidence-uuid-1' });

    const response = await request(app)
      .post('/api/v1/security/audit-evidence')
      .send({
        storagePath: '  s3://evidence/path.pdf  ',
        framework: ' SOC2 ',
        controlReference: ' CC-1 ',
        capturedAt: '2024-05-01T00:00:00.000Z',
        sources: [' policy ', '', null]
      })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(201);
    expect(recordAuditEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        storagePath: 's3://evidence/path.pdf',
        framework: 'SOC2',
        controlReference: 'CC-1',
        capturedAt: expect.any(Date),
        sources: ['policy']
      })
    );
  });

  it('rejects audit evidence submissions without a storage path', async () => {
    const response = await request(app)
      .post('/api/v1/security/audit-evidence')
      .send({ framework: 'SOC2' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('storagePath is required');
    expect(recordAuditEvidence).not.toHaveBeenCalled();
  });

  it('rejects audit evidence submissions when the riskId is invalid', async () => {
    const response = await request(app)
      .post('/api/v1/security/audit-evidence')
      .send({ storagePath: 's3://bucket', riskId: -1 })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('riskId must be a positive integer');
    expect(recordAuditEvidence).not.toHaveBeenCalled();
  });

  it('logs business continuity exercises', async () => {
    logContinuityExercise.mockResolvedValue({ exerciseUuid: 'exercise-uuid-1', scenarioKey: 'rds-drill' });

    const response = await request(app)
      .post('/api/v1/security/continuity/exercises')
      .send({
        scenarioKey: ' rds-drill ',
        scenarioSummary: ' RDS failover validation ',
        exerciseType: 'tabletop',
        followUpActions: ['  notify ']
      })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(201);
    expect(logContinuityExercise).toHaveBeenCalledWith(
      expect.objectContaining({
        scenarioKey: 'rds-drill',
        scenarioSummary: 'RDS failover validation',
        followUpActions: ['notify']
      })
    );
  });

  it('rejects continuity exercise listings with invalid date filters', async () => {
    const response = await request(app)
      .get('/api/v1/security/continuity/exercises?since=not-a-date')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('since must be a valid date');
    expect(listContinuityExercises).not.toHaveBeenCalled();
  });

  it('rejects continuity exercise submissions with invalid durations', async () => {
    const response = await request(app)
      .post('/api/v1/security/continuity/exercises')
      .send({ scenarioKey: 'drill', scenarioSummary: 'summary', actualRtoMinutes: -1 })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('actualRtoMinutes must be a non-negative integer');
    expect(logContinuityExercise).not.toHaveBeenCalled();
  });

  it('requires a positive identifier when recording risk reviews', async () => {
    const response = await request(app)
      .post('/api/v1/security/risk-register/not-valid/reviews')
      .send({ status: 'complete' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('riskId must be a positive integer');
    expect(recordRiskReview).not.toHaveBeenCalled();
  });

  it('rejects risk review submissions with invalid date payloads', async () => {
    const response = await request(app)
      .post('/api/v1/security/risk-register/12/reviews')
      .send({ reviewedAt: 'not-a-date' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('reviewedAt must be a valid date');
    expect(recordRiskReview).not.toHaveBeenCalled();
  });

  it('records risk reviews with sanitised payloads', async () => {
    recordRiskReview.mockResolvedValue({ reviewUuid: 'review-uuid-1' });

    const response = await request(app)
      .post('/api/v1/security/risk-register/12/reviews')
      .send({
        status: ' in_review ',
        notes: '  Needs approval  ',
        evidenceReferences: ['  doc-ref ', '', null],
        reviewer: { id: 'admin-1', displayName: ' Security Lead ' }
      })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(201);
    const [[payload]] = recordRiskReview.mock.calls.slice(-1);
    expect(payload.status).toBe('in_review');
    expect(payload.notes).toBe('Needs approval');
    expect(payload.evidenceReferences).toEqual(['doc-ref']);
    expect(payload.reviewer).toEqual(expect.objectContaining({ id: 'admin-1' }));
  });

  it('rejects audit evidence submissions with invalid timestamps', async () => {
    const response = await request(app)
      .post('/api/v1/security/audit-evidence')
      .send({ storagePath: 's3://bucket', capturedAt: 'invalid-date' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('capturedAt must be a valid date');
    expect(recordAuditEvidence).not.toHaveBeenCalled();
  });

  it('rejects assessment listings with invalid pagination', async () => {
    const response = await request(app)
      .get('/api/v1/security/assessments?limit=0')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('limit must be a positive integer not exceeding 100');
    expect(listAssessments).not.toHaveBeenCalled();
  });

  it('rejects schedule assessment requests without required fields', async () => {
    const response = await request(app)
      .post('/api/v1/security/assessments')
      .send({ assessmentType: 'pentest' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('scheduledFor is required');
    expect(scheduleAssessment).not.toHaveBeenCalled();
  });

  it('rejects schedule assessment requests with invalid dates', async () => {
    const response = await request(app)
      .post('/api/v1/security/assessments')
      .send({ assessmentType: 'pentest', scheduledFor: 'invalid' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('scheduledFor must be a valid date');
    expect(scheduleAssessment).not.toHaveBeenCalled();
  });

  it('schedules assessments with sanitised payloads', async () => {
    scheduleAssessment.mockResolvedValue({ assessmentUuid: 'asm-1' });

    const response = await request(app)
      .post('/api/v1/security/assessments')
      .send({
        assessmentType: '  pentest ',
        scheduledFor: '2025-01-01T00:00:00.000Z',
        scope: '  External perimeter  ',
        methodology: '  OWASP  '
      })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(201);
    expect(scheduleAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        assessmentType: 'pentest',
        scheduledFor: expect.any(Date),
        scope: 'External perimeter',
        methodology: 'OWASP'
      })
    );
  });

  it('rejects continuity exercises missing the scenario context', async () => {
    const response = await request(app)
      .post('/api/v1/security/continuity/exercises')
      .send({})
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('scenarioKey is required');
    expect(logContinuityExercise).not.toHaveBeenCalled();
  });
});
