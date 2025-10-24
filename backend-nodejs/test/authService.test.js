import { beforeEach, describe, expect, it, vi } from 'vitest';

const trxStub = { id: 'trx-stub' };
const transactionSpy = vi.fn(async (handler) => handler(trxStub));
const hashMock = vi.fn();
const findByEmailMock = vi.fn();
const createUserMock = vi.fn();
const recordEventMock = vi.fn();
const linkOnboardingMock = vi.fn();
const issueVerificationMock = vi.fn();
const shouldEnforceForRoleMock = vi.fn();
const createSessionMock = vi.fn();
const revokeExpiredSessionsMock = vi.fn();
const pruneExcessSessionsMock = vi.fn();
const findActiveByHashMock = vi.fn();
const findByIdMock = vi.fn();
const markRotatedMock = vi.fn();
const touchMock = vi.fn();
const revokeByIdMock = vi.fn();
const revokeByHashMock = vi.fn();
const rememberSessionMock = vi.fn();
const markSessionRevokedMock = vi.fn();
const jwtSignMock = vi.fn(() => 'signed-access-token');

vi.mock('../src/config/database.js', () => ({
  default: { transaction: transactionSpy }
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: hashMock,
    compare: vi.fn()
  }
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: jwtSignMock
  }
}));

vi.mock('../src/config/env.js', () => ({
  env: {
    security: {
      jwtRefreshSecret: 'refresh-secret',
      refreshTokenTtlDays: 30,
      accessTokenTtlMinutes: 15,
      maxActiveSessionsPerUser: 3,
      jwtAudience: 'mobile-client',
      jwtIssuer: 'edulure',
      accountLockoutThreshold: 5,
      accountLockoutWindowMinutes: 10,
      accountLockoutDurationMinutes: 30,
      sessionValidationCacheTtlMs: 60000
    }
  }
}));

vi.mock('../src/config/jwtKeyStore.js', () => ({
  getActiveJwtKey: () => ({ secret: 'jwt-secret', algorithm: 'HS256', kid: 'kid-1' })
}));

vi.mock('../src/models/UserModel.js', () => ({
  default: {
    findByEmail: findByEmailMock,
    create: createUserMock
  }
}));

vi.mock('../src/models/DomainEventModel.js', () => ({
  default: {
    record: recordEventMock
  }
}));

vi.mock('../src/models/LearnerOnboardingResponseModel.js', () => ({
  default: {
    linkUser: linkOnboardingMock
  }
}));

vi.mock('../src/models/UserSessionModel.js', () => ({
  default: {
    create: createSessionMock,
    revokeExpiredSessions: revokeExpiredSessionsMock,
    pruneExcessSessions: pruneExcessSessionsMock,
    findActiveByHash: findActiveByHashMock,
    findById: findByIdMock,
    markRotated: markRotatedMock,
    touch: touchMock,
    revokeById: revokeByIdMock,
    revokeByHash: revokeByHashMock
  }
}));

vi.mock('../src/services/EmailVerificationService.js', () => ({
  emailVerificationService: {
    issueVerification: issueVerificationMock
  }
}));

vi.mock('../src/services/TwoFactorService.js', () => ({
  default: {
    issueChallenge: vi.fn(),
    verifyChallenge: vi.fn(),
    shouldEnforceForRole: shouldEnforceForRoleMock,
    shouldEnforceForUser: vi.fn(),
    isTwoFactorEnabled: vi.fn(),
    sanitizeCode: vi.fn(),
    updateEnforcementPolicy: vi.fn()
  }
}));

vi.mock('../src/services/SessionRegistry.js', () => ({
  sessionRegistry: {
    remember: rememberSessionMock,
    markRevoked: markSessionRevokedMock
  }
}));

import AuthService from '../src/services/AuthService.js';

const verificationExpiry = new Date('2024-04-05T12:00:00.000Z');

describe('AuthService.register', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    hashMock.mockResolvedValue('hashed-password');
    findByEmailMock.mockResolvedValue(null);
    shouldEnforceForRoleMock.mockReturnValue(false);
    createUserMock.mockResolvedValue({
      id: 42,
      email: 'ops-lead@example.com',
      first_name: 'Alex',
      last_name: 'Rivera',
      role: 'instructor',
      two_factor_enabled: 1
    });
    issueVerificationMock.mockResolvedValue({
      token: 'token-value',
      expiresAt: verificationExpiry
    });
    linkOnboardingMock.mockResolvedValue(null);
    createSessionMock.mockReset();
    revokeExpiredSessionsMock.mockResolvedValue([]);
    pruneExcessSessionsMock.mockResolvedValue([]);
    rememberSessionMock.mockReset();
    markSessionRevokedMock.mockReset();
  });

  it('hashes the password, links onboarding drafts, and returns verification metadata', async () => {
    const result = await AuthService.register(
      {
        firstName: 'Alex',
        lastName: 'Rivera',
        email: 'ops-lead@example.com',
        password: 'SecurePass!234',
        role: 'instructor',
        twoFactor: { enabled: true }
      },
      { ipAddress: '127.0.0.1', userAgent: 'vitest' }
    );

    expect(transactionSpy).toHaveBeenCalledTimes(1);
    expect(hashMock).toHaveBeenCalledWith('SecurePass!234', 12);
    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Alex',
        lastName: 'Rivera',
        email: 'ops-lead@example.com',
        role: 'instructor',
        passwordHash: 'hashed-password',
        twoFactorEnabled: true
      }),
      trxStub
    );

    expect(recordEventMock).toHaveBeenCalledTimes(2);
    expect(recordEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'user.registered', entityId: 42 }),
      trxStub
    );
    expect(recordEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'user.two_factor_enrolled', entityId: 42 }),
      trxStub
    );

    expect(linkOnboardingMock).toHaveBeenCalledWith(
      'ops-lead@example.com',
      'instructor',
      42,
      trxStub
    );

    expect(issueVerificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ops-lead@example.com', id: 42 }),
      { ipAddress: '127.0.0.1', userAgent: 'vitest' },
      trxStub
    );

    expect(result.data.user).toMatchObject({
      id: 42,
      email: 'ops-lead@example.com',
      role: 'instructor'
    });
    expect(result.data.twoFactor).toEqual({ enabled: true, enforced: false, method: 'email_otp' });
    expect(result.data.verification).toEqual({
      status: 'pending',
      expiresAt: verificationExpiry.toISOString()
    });
  });
});

describe('AuthService.createSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSessionMock.mockReset();
    revokeExpiredSessionsMock.mockResolvedValue([]);
    pruneExcessSessionsMock.mockResolvedValue([]);
    rememberSessionMock.mockReset();
    markSessionRevokedMock.mockReset();
    jwtSignMock.mockClear();
  });

  it('persists client metadata and returns enriched session envelope', async () => {
    const sessionRecord = {
      id: 91,
      client: 'mobile',
      clientMetadata: { platform: 'mobile', appVersion: '1.2.3', timezone: 'UTC' },
      expiresAt: new Date('2025-05-01T00:00:00.000Z'),
      lastUsedAt: new Date('2025-04-01T00:00:00.000Z')
    };
    createSessionMock.mockResolvedValue(sessionRecord);

    const session = await AuthService.createSession(
      { id: 7, email: 'device@example.com', role: 'learner' },
      {
        client: 'mobile',
        clientMetadata: {
          appVersion: '1.2.3',
          timezone: 'UTC',
          locale: 'en-US'
        }
      },
      trxStub
    );

    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        client: 'mobile',
        clientMetadata: expect.objectContaining({
          platform: 'mobile',
          appVersion: '1.2.3',
          timezone: 'UTC',
          locale: 'en-US'
        })
      }),
      trxStub
    );
    expect(rememberSessionMock).toHaveBeenCalledWith(sessionRecord);
    expect(session.client).toBe('mobile');
    expect(session.sessionId).toBe(91);
    expect(session.clientMetadata).toMatchObject({
      platform: 'mobile',
      appVersion: '1.2.3',
      timezone: 'UTC',
      locale: 'en-US'
    });
    expect(typeof session.refreshToken).toBe('string');
    expect(jwtSignMock).toHaveBeenCalledWith(
      expect.objectContaining({ sid: 91 }),
      'jwt-secret',
      expect.objectContaining({ keyid: 'kid-1' })
    );
  });

  it('normalises client metadata and ignores unsupported keys', async () => {
    createSessionMock.mockResolvedValue({
      id: 33,
      client: 'android',
      clientMetadata: { platform: 'android', timezone: 'UTC' },
      expiresAt: new Date('2025-03-01T00:00:00.000Z'),
      lastUsedAt: new Date('2025-02-01T00:00:00.000Z')
    });

    const session = await AuthService.createSession(
      { id: 11, email: 'learner@example.com', role: 'learner' },
      {
        client: ' ANDROID ',
        clientMetadata: {
          timezone: 'UTC',
          locale: 'en-GB',
          appVersion: '0.9.0',
          random: 'value'
        }
      },
      trxStub
    );

    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        client: 'android',
        clientMetadata: expect.not.objectContaining({ random: expect.anything() })
      }),
      trxStub
    );
    expect(session.client).toBe('android');
    expect(session.clientMetadata.random).toBeUndefined();
    expect(session.clientMetadata.locale).toBe('en-GB');
  });
});
