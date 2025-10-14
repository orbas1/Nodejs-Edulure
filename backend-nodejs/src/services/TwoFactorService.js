import crypto from 'crypto';

import { env } from '../config/env.js';

const AES_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = env.security.twoFactor.encryptionKey;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function coerceBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
    const parsed = Number.parseInt(normalized, 10);
    if (!Number.isNaN(parsed)) {
      return parsed !== 0;
    }
  }
  if (value == null) {
    return false;
  }
  return Boolean(value);
}

function base32Encode(buffer) {
  let bits = '';
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }
  let output = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    const padded = chunk.padEnd(5, '0');
    const index = parseInt(padded, 2);
    output += BASE32_ALPHABET[index];
  }
  return output;
}

function base32Decode(secret) {
  const sanitized = String(secret ?? '')
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const char of sanitized) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) {
      throw new Error('Invalid base32 character in two-factor secret.');
    }
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    const chunk = bits.slice(i, i + 8);
    bytes.push(parseInt(chunk, 2));
  }
  return Buffer.from(bytes);
}

function generateSecret(byteLength = 20) {
  return base32Encode(crypto.randomBytes(byteLength));
}

function encryptSecret(secret) {
  if (!secret) {
    throw new Error('Two-factor secret cannot be empty.');
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(AES_ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function decryptSecret(payload) {
  if (!payload) {
    throw new Error('Two-factor secret payload missing.');
  }
  const buffer = Buffer.from(payload, 'base64');
  if (buffer.length <= 28) {
    throw new Error('Stored two-factor secret payload is malformed.');
  }
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = crypto.createDecipheriv(AES_ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

function hotp(secretBuffer, counter, digits) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', secretBuffer).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  const modulus = 10 ** digits;
  return (code % modulus).toString().padStart(digits, '0');
}

function generateTotp(secret, timestamp = Date.now()) {
  const decodedSecret = base32Decode(secret);
  const stepMs = env.security.twoFactor.stepSeconds * 1000;
  const counter = Math.floor(timestamp / stepMs);
  return hotp(decodedSecret, counter, env.security.twoFactor.digits);
}

function generateEnrollment(user) {
  const secret = generateSecret();
  const issuer = encodeURIComponent(env.security.twoFactor.issuer);
  const accountLabel = encodeURIComponent(user.email);
  const otpauthUrl = `otpauth://totp/${issuer}:${accountLabel}?secret=${secret}&issuer=${issuer}&digits=${env.security.twoFactor.digits}&period=${env.security.twoFactor.stepSeconds}`;
  return { secret, otpauthUrl };
}

function shouldEnforceForRole(role) {
  if (!role) {
    return false;
  }
  return env.security.twoFactor.requiredRoles.includes(String(role).toLowerCase());
}

function shouldEnforceForUser(user) {
  if (!user) {
    return false;
  }
  if (isTwoFactorEnabled(user)) {
    return true;
  }
  return shouldEnforceForRole(user.role);
}

function sanitizeToken(token) {
  if (!token) {
    return '';
  }
  return String(token).replace(/\s+/g, '');
}

function verifyToken(encryptedSecret, token) {
  const normalized = sanitizeToken(token);
  if (!normalized) {
    return false;
  }
  const secret = decryptSecret(encryptedSecret);
  const stepMs = env.security.twoFactor.stepSeconds * 1000;
  const window = env.security.twoFactor.window;
  const now = Date.now();

  for (let offset = -window; offset <= window; offset += 1) {
    const timestamp = now + offset * stepMs;
    if (generateTotp(secret, timestamp) === normalized) {
      return true;
    }
  }
  return false;
}

function isTwoFactorEnabled(user) {
  if (!user) {
    return false;
  }
  const enabledFlag =
    user.twoFactorEnabled ??
    user.two_factor_enabled ??
    (typeof user.get === 'function' ? user.get('two_factor_enabled') : null);
  return coerceBoolean(enabledFlag);
}

export default {
  encryptSecret,
  decryptSecret,
  generateEnrollment,
  shouldEnforceForRole,
  shouldEnforceForUser,
  isTwoFactorEnabled,
  verifyToken
};
