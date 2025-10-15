import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMock = {
  getVerificationSummaryForUser: vi.fn(),
  requestUpload: vi.fn(),
  attachDocument: vi.fn(),
  submitForReview: vi.fn(),
  reviewVerification: vi.fn(),
  listAuditTrail: vi.fn(),
  getAdminOverview: vi.fn()
};

vi.mock('../src/middleware/auth.js', () => ({
  default: (requiredRole) => (req, _res, next) => {
    req.user = {
      id: requiredRole === 'admin' ? 1 : 42,
      role: requiredRole ?? 'user'
    };
    return next();
  }
}));

vi.mock('../src/services/IdentityVerificationService.js', () => ({
  default: serviceMock
}));

let app;

beforeAll(async () => {
  ({ default: app } = await import('../src/app.js'));
});

beforeEach(() => {
  vi.clearAllMocks();
  serviceMock.getVerificationSummaryForUser.mockResolvedValue({ status: 'collecting' });
  serviceMock.requestUpload.mockResolvedValue({
    verificationReference: 'kyc_seed',
    documentType: 'government-id-front',
    upload: { url: 'https://upload.test', bucket: 'edulure-uploads', key: 'kyc/seed/front.png' }
  });
  serviceMock.attachDocument.mockResolvedValue({
    verification: { status: 'submitted', documentsSubmitted: 3 },
    document: { id: 90 }
  });
  serviceMock.submitForReview.mockResolvedValue({ status: 'pending_review' });
  serviceMock.reviewVerification.mockResolvedValue({ status: 'approved' });
  serviceMock.listAuditTrail.mockResolvedValue([{ id: 1, action: 'submitted_for_review' }]);
  serviceMock.getAdminOverview.mockResolvedValue({
    metrics: [],
    queue: [],
    slaBreaches: 0,
    manualReviewQueue: 0,
    lastGeneratedAt: new Date().toISOString(),
    gdpr: {
      dsar: {
        open: 0,
        dueSoon: 0,
        overdue: 0,
        completed30d: 0,
        averageCompletionHours: 0,
        slaHours: 72,
        owner: 'Data Protection Officer',
        nextIcoSubmission: new Date().toISOString()
      },
      registers: [],
      controls: {},
      ico: { registrationNumber: 'ZB765432', status: 'Active' }
    }
  });
});

describe('Identity verification HTTP routes', () => {
  it('returns the verification summary for the authenticated user', async () => {
    const response = await request(app).get('/api/v1/verification/me').set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(serviceMock.getVerificationSummaryForUser).toHaveBeenCalledWith(42);
    expect(response.body.data.status).toBe('collecting');
  });

  it('creates upload requests for verification documents', async () => {
    const response = await request(app)
      .post('/api/v1/verification/me/upload-requests')
      .set('Authorization', 'Bearer token')
      .send({ documentType: 'government-id-front', fileName: 'passport.png', mimeType: 'image/png', sizeBytes: 12345 });

    expect(response.status).toBe(201);
    expect(serviceMock.requestUpload).toHaveBeenCalledWith(42, {
      documentType: 'government-id-front',
      fileName: 'passport.png',
      mimeType: 'image/png',
      sizeBytes: 12345
    });
    expect(response.body.data.upload.url).toBe('https://upload.test');
  });

  it('accepts uploaded document metadata for attachment', async () => {
    const payload = {
      documentType: 'identity-selfie',
      storageBucket: 'edulure-uploads',
      storageKey: 'kyc/seed/selfie.png',
      fileName: 'selfie.png',
      mimeType: 'image/png',
      sizeBytes: 98765,
      checksumSha256: 'a'.repeat(64)
    };

    const response = await request(app)
      .post('/api/v1/verification/me/documents')
      .set('Authorization', 'Bearer token')
      .send(payload);

    expect(response.status).toBe(201);
    expect(serviceMock.attachDocument).toHaveBeenCalledWith(42, payload);
    expect(response.body.data.verification.status).toBe('submitted');
  });

  it('submits verification packages for review', async () => {
    const response = await request(app)
      .post('/api/v1/verification/me/submit')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(serviceMock.submitForReview).toHaveBeenCalledWith(42);
    expect(response.body.data.status).toBe('pending_review');
  });

  it('exposes the admin compliance overview', async () => {
    const response = await request(app)
      .get('/api/v1/verification/admin/overview')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(serviceMock.getAdminOverview).toHaveBeenCalledTimes(1);
    expect(response.body.data.gdpr).toBeDefined();
    expect(response.body.data.gdpr.ico.registrationNumber).toBe('ZB765432');
  });

  it('allows admins to review verification cases', async () => {
    const response = await request(app)
      .post('/api/v1/verification/77/review')
      .set('Authorization', 'Bearer token')
      .send({ status: 'approved', riskScore: 5 });

    expect(response.status).toBe(200);
    expect(serviceMock.reviewVerification).toHaveBeenCalledWith(77, 1, { status: 'approved', riskScore: 5 });
  });

  it('returns audit trails for verification cases', async () => {
    const response = await request(app)
      .get('/api/v1/verification/77/audit')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(serviceMock.listAuditTrail).toHaveBeenCalledWith(77);
    expect(response.body.data[0].action).toBe('submitted_for_review');
  });
});
