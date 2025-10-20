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
      .send({ title: 'Third-party outage', description: 'Vendor SOC2 revoked.' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(201);
    expect(createRiskEntry).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Third-party outage', description: 'Vendor SOC2 revoked.' })
    );
  });

  it('updates residual status information', async () => {
    updateRiskStatus.mockResolvedValue({ id: 99, status: 'accepted', residualRiskScore: 4 });

    const response = await request(app)
      .patch('/api/v1/security/risk-register/99/status')
      .send({ status: 'accepted', residualSeverity: 'moderate', residualLikelihood: 'unlikely' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(updateRiskStatus).toHaveBeenCalledWith(
      expect.objectContaining({ riskId: 99, status: 'accepted' })
    );
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
    expect(response.body.error).toBe('A valid riskId is required');
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

  it('records audit evidence submissions', async () => {
    recordAuditEvidence.mockResolvedValue({ evidenceUuid: 'evidence-uuid-1' });

    const response = await request(app)
      .post('/api/v1/security/audit-evidence')
      .send({ storagePath: 's3://evidence/path.pdf' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(201);
    expect(recordAuditEvidence).toHaveBeenCalledWith(
      expect.objectContaining({ storagePath: 's3://evidence/path.pdf' })
    );
  });

  it('logs business continuity exercises', async () => {
    logContinuityExercise.mockResolvedValue({ exerciseUuid: 'exercise-uuid-1', scenarioKey: 'rds-drill' });

    const response = await request(app)
      .post('/api/v1/security/continuity/exercises')
      .send({
        scenarioKey: 'rds-drill',
        scenarioSummary: 'RDS failover validation',
        exerciseType: 'tabletop'
      })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(201);
    expect(logContinuityExercise).toHaveBeenCalledWith(
      expect.objectContaining({ scenarioKey: 'rds-drill' })
    );
  });
});
