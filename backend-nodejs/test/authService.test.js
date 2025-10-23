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

vi.mock('../src/config/database.js', () => ({
  default: { transaction: transactionSpy }
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: hashMock,
    compare: vi.fn()
  }
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
