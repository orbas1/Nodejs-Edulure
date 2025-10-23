import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PASSWORD_POLICY,
  evaluatePasswordStrength,
  validateLoginState,
  validateRegisterAccountState
} from '../auth.js';

describe('auth validation helpers', () => {
  it('evaluates password strength against the default policy', () => {
    const result = evaluatePasswordStrength('SecurePass!234');

    expect(result.isCompliant).toBe(true);
    expect(result.metCount).toBe(result.totalRequired);
    expect(result.requirements.find((item) => item.id === 'length')?.met).toBe(true);
  });

  it('marks unmet password requirements and produces descriptive copy', () => {
    const result = evaluatePasswordStrength('weakpass', {
      ...DEFAULT_PASSWORD_POLICY,
      minLength: 10,
      requireUppercase: true,
      requireNumber: true,
      requireSymbol: true
    });

    expect(result.isCompliant).toBe(false);
    const unmet = result.requirements.filter((item) => !item.met).map((item) => item.id);
    expect(unmet).toEqual(expect.arrayContaining(['uppercase', 'number', 'symbol']));
    expect(typeof result.description).toBe('string');
  });

  it('validates register state and returns descriptive errors when invalid', () => {
    const validation = validateRegisterAccountState({
      firstName: ' ',
      email: 'invalid-email',
      password: 'password',
      confirmPassword: 'different',
      role: 'guest'
    });

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toMatchObject({
      firstName: expect.any(String),
      email: expect.any(String),
      password: expect.any(String),
      confirmPassword: expect.any(String),
      role: expect.any(String)
    });
  });

  it('normalises register state when valid', () => {
    const validation = validateRegisterAccountState({
      firstName: ' Alex ',
      lastName: '  Morgan ',
      email: 'FLOW5@EXAMPLE.COM ',
      password: 'SecurePass!234',
      confirmPassword: 'SecurePass!234',
      role: 'instructor'
    });

    expect(validation.isValid).toBe(true);
    expect(validation.cleaned).toMatchObject({
      firstName: 'Alex',
      lastName: 'Morgan',
      email: 'flow5@example.com',
      role: 'instructor'
    });
    expect(validation.cleaned.evaluation.isCompliant).toBe(true);
  });

  it('enforces two factor code when required during login validation', () => {
    const validation = validateLoginState(
      { email: 'user@example.com', password: 'SecretPass!234', twoFactorCode: '' },
      { requireTwoFactor: true }
    );

    expect(validation.isValid).toBe(false);
    expect(validation.errors.twoFactorCode).toBeDefined();
  });
});
