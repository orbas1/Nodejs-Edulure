import crypto from 'node:crypto';

import db from '../config/database.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import TwoFactorChallengeModel from '../models/TwoFactorChallengeModel.js';
import { MailService } from './MailService.js';

const mailService = new MailService();

function coerceBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    const parsed = Number.parseInt(normalized, 10);
    if (!Number.isNaN(parsed)) {
      return parsed !== 0;
    }
  }
  if (value == null) return false;
  return Boolean(value);
}

function sanitizeCode(value) {
  if (!value) {
    return '';
  }
  return String(value).replace(/\D+/g, '').slice(0, env.security.twoFactor.digits);
}

function generateCode() {
  const digits = env.security.twoFactor.digits;
  const max = 10 ** digits;
  const code = crypto.randomInt(0, max);
  return code.toString().padStart(digits, '0');
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function getDisplayName(user) {
  const parts = [user.firstName ?? user.first_name, user.lastName ?? user.last_name]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);
  return parts.length ? parts.join(' ') : user.email;
}

async function issueChallenge(user, context = {}, connection = db) {
  await TwoFactorChallengeModel.purgeExpired(connection);

  const latest = await TwoFactorChallengeModel.findLatestActive(user.id, connection);
  const cooldownMs = env.security.twoFactor.resendCooldownSeconds * 1000;
  if (latest) {
    const createdAt = latest.created_at ? new Date(latest.created_at) : null;
    if (createdAt && Date.now() - createdAt.getTime() < cooldownMs) {
      return {
        challengeId: latest.id,
        delivered: false,
        expiresAt: latest.expires_at,
        resendAvailableAt: new Date(createdAt.getTime() + cooldownMs)
      };
    }
  }

  await TwoFactorChallengeModel.invalidateActive(user.id, connection);

  const code = generateCode();
  const expiresAt = new Date(Date.now() + env.security.twoFactor.challengeTtlSeconds * 1000);
  const challenge = await TwoFactorChallengeModel.create(
    {
      userId: user.id,
      tokenHash: hashCode(code),
      deliveryChannel: 'email',
      expiresAt
    },
    connection
  );

  try {
    await mailService.sendTwoFactorCode({
      to: user.email,
      name: getDisplayName(user),
      code,
      expiresAt,
      context
    });
  } catch (error) {
    logger.error({ err: error, userId: user.id }, 'Failed to dispatch two-factor OTP');
    throw error;
  }

  return { challengeId: challenge.id, delivered: true, expiresAt };
}

async function verifyChallenge(userId, code, connection = db) {
  const normalized = sanitizeCode(code);
  if (!normalized) {
    return { valid: false, reason: 'missing_code' };
  }

  const tokenHash = hashCode(normalized);
  const challenge = await TwoFactorChallengeModel.findActiveByHash(userId, tokenHash, connection);

  if (!challenge) {
    const latest = await TwoFactorChallengeModel.findLatestActive(userId, connection);
    if (latest) {
      await TwoFactorChallengeModel.incrementAttempts(latest.id, connection);
      const attemptLimit = env.security.twoFactor.maxAttemptsPerChallenge;
      if (attemptLimit > 0 && latest.attempt_count + 1 >= attemptLimit) {
        await TwoFactorChallengeModel.consume(latest.id, 'max_attempts', connection);
        return { valid: false, reason: 'max_attempts' };
      }
    }
    return { valid: false, reason: 'not_found' };
  }

  await TwoFactorChallengeModel.consume(challenge.id, 'verified', connection);
  return { valid: true, challenge };
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
  issueChallenge,
  verifyChallenge,
  shouldEnforceForRole,
  shouldEnforceForUser,
  isTwoFactorEnabled,
  sanitizeCode
};
