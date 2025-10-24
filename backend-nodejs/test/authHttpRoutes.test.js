import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import './setupEnv.js';

const authServiceMock = {
  register: vi.fn(),
  login: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
  requestMagicLink: vi.fn(),
  consumeMagicLink: vi.fn()
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
        age: 28,
        address: {
          streetAddress: ' 10 Market Street ',
          city: '  London  ',
          postcode: '   '
        },
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
        age: 28,
        address: {
          streetAddress: '10 Market Street',
          city: 'London'
        },
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

  it('issues magic links without leaking account existence', async () => {
    authServiceMock.requestMagicLink.mockResolvedValue({
      data: {
        delivered: true,
        expiresAt: new Date('2025-01-01T00:00:00Z').toISOString()
      }
    });

    const response = await request(app)
      .post('/api/v1/auth/magic-link')
      .set('User-Agent', 'vitest')
      .set('X-Forwarded-For', '198.51.100.24')
      .send({
        email: 'learner@example.com',
        redirectTo: 'https://m.edulure.com/deeplink'
      });

    expect(response.status).toBe(200);
    expect(response.body?.message).toBe('If the email exists we sent a secure sign-in link.');
    expect(response.body?.data).toEqual({
      delivered: true,
      expiresAt: '2025-01-01T00:00:00.000Z'
    });

    expect(authServiceMock.requestMagicLink).toHaveBeenCalledTimes(1);
    expect(authServiceMock.requestMagicLink).toHaveBeenCalledWith(
      'learner@example.com',
      expect.objectContaining({
        ipAddress: '198.51.100.24',
        userAgent: 'vitest'
      }),
      { redirectTo: 'https://m.edulure.com/deeplink' }
    );
  });

  it('consumes magic link tokens and returns auth envelope', async () => {
    authServiceMock.consumeMagicLink.mockResolvedValue({
      data: {
        user: { id: 77, email: 'learner@example.com' },
        verification: { emailVerified: true, twoFactorRequired: false },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          tokenType: 'Bearer',
          expiresAt: '2025-02-01T12:00:00.000Z'
        },
        session: { id: 555, expiresAt: '2025-02-10T00:00:00.000Z' }
      }
    });

    const response = await request(app)
      .post('/api/v1/auth/magic-link/consume')
      .set('User-Agent', 'vitest')
      .set('X-Forwarded-For', '203.0.113.9')
      .send({ token: '  token-12345  ' });

    expect(response.status).toBe(200);
    expect(response.body?.message).toBe('Signed in using magic link');
    expect(response.body?.data?.session?.id).toBe(555);

    expect(authServiceMock.consumeMagicLink).toHaveBeenCalledTimes(1);
    expect(authServiceMock.consumeMagicLink).toHaveBeenCalledWith(
      'token-12345',
      expect.objectContaining({
        ipAddress: '203.0.113.9',
        userAgent: 'vitest'
      })
    );
  });
});
