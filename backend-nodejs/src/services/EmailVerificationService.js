import crypto from 'crypto';

import db from '../config/database.js';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import DomainEventModel from '../models/DomainEventModel.js';
import EmailVerificationTokenModel from '../models/EmailVerificationTokenModel.js';
import UserModel from '../models/UserModel.js';
import { MailService } from './MailService.js';

const TOKEN_BYTES = 48;

function getDisplayName(user) {
  const parts = [user.firstName ?? user.first_name, user.lastName ?? user.last_name]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.join(' ');
}

export class EmailVerificationService {
  constructor(mailService = new MailService()) {
    this.mailService = mailService;
  }

  static generateToken() {
    return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  }

  static hashToken(rawToken) {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async issueVerification(user, context = {}, connection = db) {
    const token = EmailVerificationService.generateToken();
    const tokenHash = EmailVerificationService.hashToken(token);
    const expiresAt = new Date(Date.now() + env.mail.verificationTokenTtlMinutes * 60 * 1000);

    await EmailVerificationTokenModel.invalidateActiveTokens(user.id, connection);
    await EmailVerificationTokenModel.create({
      userId: user.id,
      tokenHash,
      expiresAt
    }, connection);
    await UserModel.touchVerificationSentAt(user.id, connection);

    await DomainEventModel.record(
      {
        entityType: 'user',
        entityId: user.id,
        eventType: 'user.email_verification_issued',
        payload: {
          expiresAt: expiresAt.toISOString(),
          userAgent: context.userAgent ?? null,
          ipAddress: context.ipAddress ?? null
        }
      },
      connection
    );

    try {
      await this.mailService.sendEmailVerification({
        to: user.email,
        name: getDisplayName(user) || user.email,
        token,
        expiresAt
      });
    } catch (error) {
      logger.error({ err: error, userId: user.id }, 'Failed to dispatch email verification');
      throw error;
    }

    return { token, expiresAt };
  }

  async verifyToken(rawToken, context = {}) {
    const tokenHash = EmailVerificationService.hashToken(rawToken);

    return db.transaction(async (trx) => {
      const tokenRecord = await EmailVerificationTokenModel.findActiveByHash(tokenHash, trx);
      if (!tokenRecord) {
        const error = new Error('Verification token is invalid or has expired');
        error.status = 410;
        error.code = 'EMAIL_VERIFICATION_INVALID';
        throw error;
      }

      const user = await trx('users').where({ id: tokenRecord.user_id }).first().forUpdate();
      if (!user) {
        const error = new Error('Associated account could not be located');
        error.status = 404;
        throw error;
      }

      if (user.email_verified_at) {
        await EmailVerificationTokenModel.consume(tokenRecord.id, 'already-verified', trx);
        return UserModel.findById(user.id, trx);
      }

      await EmailVerificationTokenModel.consume(tokenRecord.id, 'verified', trx);
      const updatedUser = await UserModel.markEmailVerified(user.id, trx);

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: user.id,
          eventType: 'user.email_verified',
          payload: {
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null
          }
        },
        trx
      );

      return updatedUser;
    });
  }

  async resend(email, context = {}) {
    return db.transaction(async (trx) => {
      const user = await UserModel.forUpdateByEmail(email, trx);
      if (!user) {
        return { delivered: false, reason: 'account_not_found' };
      }

      if (user.email_verified_at) {
        return { delivered: false, reason: 'already_verified' };
      }

      const lastSentAt = user.last_verification_sent_at ? new Date(user.last_verification_sent_at) : null;
      if (lastSentAt) {
        const cooldownMs = env.mail.verificationResendCooldownMinutes * 60 * 1000;
        const nextAllowedAt = new Date(lastSentAt.getTime() + cooldownMs);
        if (nextAllowedAt > new Date()) {
          const error = new Error('Verification email was recently sent. Please try again later.');
          error.status = 429;
          error.code = 'EMAIL_VERIFICATION_RATE_LIMIT';
          error.details = {
            nextAttemptAt: nextAllowedAt.toISOString()
          };
          throw error;
        }
      }

      const result = await this.issueVerification(user, context, trx);
      return { delivered: true, expiresAt: result.expiresAt.toISOString() };
    });
  }
}

export const emailVerificationService = new EmailVerificationService();
