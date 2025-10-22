import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const settingsServiceMock = {
  getAdminProfileSettings: vi.fn(),
  updateAdminProfileSettings: vi.fn(),
  getPaymentSettings: vi.fn(),
  updatePaymentSettings: vi.fn(),
  getEmailSettings: vi.fn(),
  updateEmailSettings: vi.fn(),
  getSecuritySettings: vi.fn(),
  updateSecuritySettings: vi.fn(),
  getFinanceSettings: vi.fn(),
  updateFinanceSettings: vi.fn()
};

vi.mock('../src/middleware/auth.js', () => ({
  default: () => (req, _res, next) => {
    req.user = { id: 99, role: 'admin', sessionId: 'sess-admin-settings' };
    return next();
  }
}));

vi.mock('../src/services/PlatformSettingsService.js', async () => {
  const actual = await vi.importActual('../src/services/PlatformSettingsService.js');
  return {
    __esModule: true,
    ...actual,
    default: settingsServiceMock
  };
});

let app;

beforeAll(async () => {
  const { default: adminRouter } = await import('../src/routes/admin.routes.js');

  app = express();
  app.use(express.json());
  app.use('/api/v1/admin', adminRouter);
  app.use((err, _req, res, _next) => {
    const status = err.status ?? 500;
    const payload = {
      success: false,
      message: err.message ?? 'Unexpected error'
    };
    if (err.details) {
      payload.errors = err.details;
    }
    return res.status(status).json(payload);
  });
});

beforeEach(() => {
  vi.clearAllMocks();

  settingsServiceMock.getAdminProfileSettings.mockResolvedValue({
    organisation: { name: 'Edulure Operations', mission: 'Keep the lights on.' },
    leadership: [],
    supportChannels: []
  });
  settingsServiceMock.updateAdminProfileSettings.mockImplementation(async (payload) => ({
    ...payload,
    leadership: payload.leadership ?? []
  }));

  settingsServiceMock.getPaymentSettings.mockResolvedValue({
    processors: [{ id: 'stripe', provider: 'Stripe', status: 'active' }],
    payoutRules: { schedule: 'weekly', dayOfWeek: 'friday' },
    bankAccounts: []
  });
  settingsServiceMock.updatePaymentSettings.mockImplementation(async (payload) => ({
    ...payload,
    payoutRules: { schedule: 'weekly', dayOfWeek: 'friday', ...payload.payoutRules }
  }));

  settingsServiceMock.getEmailSettings.mockResolvedValue({
    branding: { supportSignature: 'Ops team' },
    notifications: { incidents: true },
    escalationRecipients: ['ops@edulure.test']
  });
  settingsServiceMock.updateEmailSettings.mockImplementation(async (payload) => ({
    ...payload,
    escalationRecipients: payload.escalationRecipients ?? []
  }));

  settingsServiceMock.getSecuritySettings.mockResolvedValue({
    enforcement: { requireAllAdmins: true },
    methods: [{ id: 'email-otp', type: 'email_otp', enabled: true }],
    backup: { allowBypassCodes: true }
  });
  settingsServiceMock.updateSecuritySettings.mockImplementation(async (payload) => ({
    ...payload,
    methods: payload.methods ?? []
  }));

  settingsServiceMock.getFinanceSettings.mockResolvedValue({
    policies: { invoiceGraceDays: 7 },
    tiers: [],
    adjustments: [],
    approvals: { requireDualApproval: true }
  });
  settingsServiceMock.updateFinanceSettings.mockImplementation(async (payload) => ({
    ...payload,
    adjustments: payload.adjustments ?? []
  }));
});

describe('Admin settings HTTP routes', () => {
  it('returns the admin profile settings snapshot', async () => {
    const response = await request(app)
      .get('/api/v1/admin/settings/profile')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.organisation.name).toBe('Edulure Operations');
    expect(settingsServiceMock.getAdminProfileSettings).toHaveBeenCalledTimes(1);
  });

  it('updates admin profile settings and returns the persisted payload', async () => {
    const response = await request(app)
      .put('/api/v1/admin/settings/profile')
      .set('Authorization', 'Bearer admin-token')
      .send({
        organisation: { name: 'Night Ops', mission: 'Stay resilient.' },
        leadership: [{ id: 'avery', name: 'Avery Chen' }],
        supportChannels: [{ id: 'email', type: 'Email', destination: 'ops@night.io' }]
      });

    expect(response.status).toBe(200);
    expect(response.body.data.leadership).toHaveLength(1);
    expect(settingsServiceMock.updateAdminProfileSettings).toHaveBeenCalledWith(
      expect.objectContaining({ organisation: expect.any(Object) })
    );
  });

  it('returns the payment processing configuration', async () => {
    const response = await request(app)
      .get('/api/v1/admin/settings/payments')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body.data.processors[0].provider).toBe('Stripe');
    expect(settingsServiceMock.getPaymentSettings).toHaveBeenCalledTimes(1);
  });

  it('validates payment settings payloads and rejects invalid data', async () => {
    const response = await request(app)
      .put('/api/v1/admin/settings/payments')
      .set('Authorization', 'Bearer admin-token')
      .send({ processors: [{ provider: '', status: 'invalid' }] });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(settingsServiceMock.updatePaymentSettings).not.toHaveBeenCalled();
  });

  it('allows administrators to update email policies', async () => {
    const response = await request(app)
      .put('/api/v1/admin/settings/emails')
      .set('Authorization', 'Bearer admin-token')
      .send({
        branding: { footer: 'Thank you for building with Edulure' },
        notifications: { incidents: true, releases: true },
        escalationRecipients: ['ops@edulure.test', 'alerts@edulure.test']
      });

    expect(response.status).toBe(200);
    expect(response.body.data.escalationRecipients).toContain('alerts@edulure.test');
    expect(settingsServiceMock.updateEmailSettings).toHaveBeenCalledWith(
      expect.objectContaining({ notifications: expect.any(Object) })
    );
  });

  it('returns MFA and enforcement rules for admins', async () => {
    const response = await request(app)
      .get('/api/v1/admin/settings/security')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body.data.methods[0]).toMatchObject({ type: 'email_otp', enabled: true });
    expect(settingsServiceMock.getSecuritySettings).toHaveBeenCalledTimes(1);
  });

  it('prevents security configuration without supported MFA methods', async () => {
    const response = await request(app)
      .put('/api/v1/admin/settings/security')
      .set('Authorization', 'Bearer admin-token')
      .send({ methods: [{ id: 'unsupported', type: 'voice', enabled: true }] });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(settingsServiceMock.updateSecuritySettings).not.toHaveBeenCalled();
  });

  it('returns finance, adjustments, and approvals snapshot', async () => {
    const response = await request(app)
      .get('/api/v1/admin/settings/finance')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
    expect(response.body.data.policies.invoiceGraceDays).toBe(7);
    expect(settingsServiceMock.getFinanceSettings).toHaveBeenCalledTimes(1);
  });

  it('persists finance adjustments with reviewer controls', async () => {
    const response = await request(app)
      .put('/api/v1/admin/settings/finance')
      .set('Authorization', 'Bearer admin-token')
      .send({
        policies: { invoiceGraceDays: 5, payoutScheduleDays: 10 },
        approvals: { requireDualApproval: true, approvers: ['ops@edulure.test'] },
        adjustments: [
          {
            id: 'adj-1',
            description: 'Launch incentive',
            amountCents: 5000,
            status: 'scheduled'
          }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body.data.adjustments).toHaveLength(1);
    expect(settingsServiceMock.updateFinanceSettings).toHaveBeenCalledWith(
      expect.objectContaining({ policies: expect.any(Object) })
    );
  });
});
