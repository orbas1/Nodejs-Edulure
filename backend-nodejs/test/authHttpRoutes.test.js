import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const authServiceMock = {
  register: vi.fn(),
  login: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn()
};

vi.mock('../src/services/AuthService.js', () => ({
  default: authServiceMock
}));

let app;

describe('Auth HTTP routes', () => {
  beforeAll(async () => {
    const { default: authRouter } = await import('../src/routes/auth.routes.js');
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRouter);
    app.use((error, _req, res, _next) => {
      const status = error?.status ?? 500;
      res.status(status).json({
        success: false,
        message: error?.message ?? 'Internal Server Error'
      });
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('describes the password policy requirements', async () => {
    const response = await request(app).get('/api/v1/auth/password-policy');

    expect(response.status).toBe(200);
    expect(response.body?.data?.policy).toMatchObject({
      minLength: expect.any(Number),
      requireLowercase: expect.any(Boolean),
      requireUppercase: expect.any(Boolean),
      requireNumber: expect.any(Boolean),
      requireSymbol: expect.any(Boolean)
    });
    expect(response.body?.data?.requirements).toBeInstanceOf(Array);
    expect(response.body.data.requirements.length).toBeGreaterThan(0);
  });

  it('registers accounts with sanitised payloads and propagates the result', async () => {
    authServiceMock.register.mockResolvedValue({
      data: {
        id: 'user-42',
        email: 'ops-lead@example.com',
        twoFactor: { enabled: true, enforced: false }
      }
    });

    const response = await request(app)
      .post('/api/v1/auth/register')
      .set('User-Agent', 'vitest')
      .send({
        firstName: '  Alex ',
        lastName: '  Rivera ',
        email: 'ops-lead@example.com',
        password: 'SecurePass!234',
        role: 'instructor',
        dateOfBirth: '1994-11-08',
        twoFactor: { enabled: true }
      });

    expect(response.status).toBe(201);
    expect(response.body?.data?.twoFactor?.enabled).toBe(true);

    expect(authServiceMock.register).toHaveBeenCalledTimes(1);
    expect(authServiceMock.register).toHaveBeenCalledWith(
      {
        firstName: 'Alex',
        lastName: 'Rivera',
        email: 'ops-lead@example.com',
        password: 'SecurePass!234',
        role: 'instructor',
        dateOfBirth: expect.any(Date),
        twoFactor: { enabled: true }
      },
      expect.objectContaining({
        ipAddress: expect.any(String),
        userAgent: 'vitest'
      })
    );
  });

  it('rejects registration attempts that do not meet the password policy', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        firstName: 'Jordan',
        email: 'jordan@example.com',
        password: 'weakpass',
        role: 'user'
      });

    expect(response.status).toBe(422);
    expect(response.body?.message).toBe(
      'Use at least 12 characters including uppercase and lowercase letters, a number, and a special character.'
    );
    expect(authServiceMock.register).not.toHaveBeenCalled();
  });
});
