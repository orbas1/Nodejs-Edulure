import crypto from 'crypto';
import { describe, expect, it, vi } from 'vitest';

import twoFactorService from '../src/services/TwoFactorService.js';
import { env } from '../src/config/env.js';

function base32Decode(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const sanitized = String(secret ?? '')
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '');

  let bits = '';
  for (const char of sanitized) {
    const value = alphabet.indexOf(char);
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTotp(secret, timestamp = Date.now()) {
  const decoded = base32Decode(secret);
  const stepMs = env.security.twoFactor.stepSeconds * 1000;
  const counter = Math.floor(timestamp / stepMs);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', decoded).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  const modulus = 10 ** env.security.twoFactor.digits;
  return (code % modulus).toString().padStart(env.security.twoFactor.digits, '0');
}

describe('TwoFactorService', () => {
  it('encrypts and decrypts secrets symmetrically', () => {
    const encrypted = twoFactorService.encryptSecret('super-secret');
    const decrypted = twoFactorService.decryptSecret(encrypted);
    expect(decrypted).toBe('super-secret');
  });

  it('generates enrollment metadata with issuer and otpauth url', () => {
    const user = { email: 'user@example.com' };
    const enrollment = twoFactorService.generateEnrollment(user);
    expect(enrollment.secret).toMatch(/^[A-Z2-7]+$/);
    expect(enrollment.otpauthUrl).toContain(env.security.twoFactor.issuer);
    expect(enrollment.otpauthUrl).toContain(encodeURIComponent(user.email));
  });

  it('verifies totp tokens within the allowed time window', () => {
    const { secret } = twoFactorService.generateEnrollment({ email: 'user@example.com' });
    const encrypted = twoFactorService.encryptSecret(secret);

    const now = new Date('2024-05-01T10:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const token = generateTotp(secret, now.getTime());
    expect(twoFactorService.verifyToken(encrypted, token)).toBe(true);

    const futureToken = generateTotp(secret, now.getTime() + env.security.twoFactor.stepSeconds * 1000);
    expect(twoFactorService.verifyToken(encrypted, futureToken)).toBe(true);

    const invalidToken = generateTotp(secret, now.getTime() + 10 * env.security.twoFactor.stepSeconds * 1000);
    expect(twoFactorService.verifyToken(encrypted, invalidToken)).toBe(false);
    vi.useRealTimers();
  });

  it('determines enforcement requirements from roles and flags', () => {
    const requiredRole = env.security.twoFactor.requiredRoles[0] ?? 'admin';
    expect(twoFactorService.shouldEnforceForRole(requiredRole)).toBe(true);
    expect(twoFactorService.shouldEnforceForRole('guest')).toBe(false);

    const enabledUser = { role: 'guest', twoFactorEnabled: true };
    expect(twoFactorService.shouldEnforceForUser(enabledUser)).toBe(true);

    const roleUser = { role: requiredRole, twoFactorEnabled: false };
    expect(twoFactorService.shouldEnforceForUser(roleUser)).toBe(true);

    const disabledUser = { role: 'guest', twoFactorEnabled: false };
    expect(twoFactorService.shouldEnforceForUser(disabledUser)).toBe(false);
  });
});
