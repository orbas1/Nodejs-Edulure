import crypto from 'crypto';

import db from '../config/database.js';
import { env } from '../config/env.js';
import DomainEventModel from '../models/DomainEventModel.js';
import UserMagicLinkModel from '../models/UserMagicLinkModel.js';
import UserModel from '../models/UserModel.js';
import { MailService } from './MailService.js';

const mailService = new MailService();

function normalizeEmail(email) {
  if (!email) {
    return null;
  }
  const trimmed = String(email).trim().toLowerCase();
  return trimmed.length ? trimmed : null;
}

function buildMagicLinkUrl(token, redirectTo = null) {
  const baseUrl = env.mail.magicLinkBaseUrl;
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('token', token);
    if (redirectTo) {
      url.searchParams.set('redirect_to', redirectTo);
    }
    return url.toString();
  } catch (error) {
    throw Object.assign(new Error('Magic link base URL is misconfigured'), {
      cause: error,
      status: 500
    });
  }
}

export default class MagicLinkService {
  static generateToken() {
    return crypto.randomBytes(32).toString('base64url');
  }

  static async issue(email, context = {}, { redirectTo = null } = {}) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      const error = new Error('A valid email is required.');
      error.status = 422;
      throw error;
    }

    const expiresAt = new Date(Date.now() + env.security.magicLinks.tokenTtlMinutes * 60 * 1000);
    const ipAddress = context.ipAddress ?? null;
    const userAgent = context.userAgent ?? null;

    return db.transaction(async (trx) => {
      const user = await UserModel.findByEmail(normalizedEmail, trx);
      if (!user) {
        // Avoid leaking account existence, but still mimic work to deter enumeration.
        await crypto.webcrypto.subtle.digest('SHA-256', Buffer.from(normalizedEmail));
        return {
          delivered: false,
          expiresAt: null
        };
      }

      const token = this.generateToken();
      const tokenHash = UserMagicLinkModel.hashToken(token);

      await UserMagicLinkModel.create(
        {
          userId: user.id,
          email: normalizedEmail,
          tokenHash,
          redirectTo,
          metadata: {
            issuedIp: ipAddress,
            issuedUserAgent: userAgent
          },
          expiresAt
        },
        trx
      );

      const magicLinkUrl = buildMagicLinkUrl(token, redirectTo);

      await mailService.sendMagicLink({
        to: normalizedEmail,
        name: user.firstName ?? null,
        magicLinkUrl,
        expiresAt
      });

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: user.id,
          eventType: 'user.magic_link_issued',
          payload: {
            email: normalizedEmail,
            expiresAt: expiresAt.toISOString(),
            ipAddress,
            userAgent
          },
          performedBy: user.id
        },
        trx
      );

      return {
        delivered: true,
        expiresAt
      };
    });
  }

  static async consume(token, context = {}) {
    const trimmedToken = typeof token === 'string' ? token.trim() : '';
    if (!trimmedToken) {
      const error = new Error('Magic link token is required.');
      error.status = 422;
      throw error;
    }

    const tokenHash = UserMagicLinkModel.hashToken(trimmedToken);
    const ipAddress = context.ipAddress ?? null;
    const userAgent = context.userAgent ?? null;

    return db.transaction(async (trx) => {
      const record = await UserMagicLinkModel.findActiveByHash(tokenHash, trx, { forUpdate: true });
      if (!record) {
        const error = new Error('Magic link is invalid or has expired.');
        error.status = 401;
        error.code = 'MAGIC_LINK_INVALID';
        throw error;
      }

      await UserMagicLinkModel.markConsumed(
        record.id,
        { reason: 'consumed', ipAddress, userAgent },
        trx
      );

      const user = await UserModel.findById(record.userId, trx);
      if (!user) {
        const error = new Error('Account is unavailable.');
        error.status = 410;
        throw error;
      }

      if (!user.emailVerifiedAt) {
        await UserModel.markEmailVerified(user.id, trx);
      }
      await UserModel.clearLoginFailures(user.id, trx);

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: user.id,
          eventType: 'user.magic_link_consumed',
          payload: {
            magicLinkId: record.id,
            redirectTo: record.redirectTo ?? null,
            ipAddress,
            userAgent
          },
          performedBy: user.id
        },
        trx
      );

      const refreshedUser = await UserModel.findById(user.id, trx);

      return {
        user: refreshedUser,
        magicLink: record
      };
    });
  }
}
