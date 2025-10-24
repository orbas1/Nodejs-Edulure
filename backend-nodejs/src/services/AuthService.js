import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import db from '../config/database.js';
import { env } from '../config/env.js';
import { getActiveJwtKey } from '../config/jwtKeyStore.js';
import UserModel from '../models/UserModel.js';
import UserSessionModel from '../models/UserSessionModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import LearnerOnboardingResponseModel from '../models/LearnerOnboardingResponseModel.js';
import { emailVerificationService } from './EmailVerificationService.js';
import { sessionRegistry } from './SessionRegistry.js';
import TwoFactorService from './TwoFactorService.js';
import MagicLinkService from './MagicLinkService.js';
import PasskeyService from './PasskeyService.js';
import { serializeUser } from './serializers/userSerializer.js';

function hashRefreshToken(token) {
  return crypto.createHmac('sha256', env.security.jwtRefreshSecret).update(token).digest('hex');
}

function buildVerificationMetadata(user) {
  return {
    status: user.emailVerifiedAt ? 'verified' : 'pending',
    emailVerifiedAt: user.emailVerifiedAt ?? null
  };
}

function toIso(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildSessionPayload(session) {
  return {
    id: session.sessionId ?? session.id ?? null,
    expiresAt: toIso(session.expiresAt),
    lastUsedAt: toIso(session.lastUsedAt ?? null)
  };
}

function buildRefreshTokenRequiredError() {
  const error = new Error('Refresh token is required to obtain a new session.');
  error.status = 400;
  error.code = 'REFRESH_TOKEN_REQUIRED';
  return error;
}

function buildInvalidRefreshTokenError() {
  const error = new Error('Refresh token is invalid or has expired. Please sign in again.');
  error.status = 401;
  error.code = 'INVALID_REFRESH_TOKEN';
  return error;
}

export default class AuthService {
  static async register(payload, context = {}) {
    return db.transaction(async (trx) => {
      const existing = await UserModel.findByEmail(payload.email, trx);
      if (existing) {
        const error = new Error('Email already registered');
        error.status = 409;
        throw error;
      }

      const enforceTwoFactor = TwoFactorService.shouldEnforceForRole(payload.role);
      const wantsTwoFactor = payload.twoFactor?.enabled === true;
      const enableTwoFactor = enforceTwoFactor || wantsTwoFactor;
      const twoFactorEnrollment = enableTwoFactor
        ? { enabled: true, enforced: enforceTwoFactor, method: 'email_otp' }
        : { enabled: false, enforced: enforceTwoFactor, method: 'email_otp' };

      const passwordHash = await bcrypt.hash(payload.password, 12);
      const user = await UserModel.create(
        {
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          passwordHash,
          role: payload.role,
          age: payload.age,
          address: payload.address,
          twoFactorEnabled: enableTwoFactor,
          twoFactorSecret: null,
          twoFactorEnrolledAt: enableTwoFactor ? new Date() : null,
          twoFactorLastVerifiedAt: null
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: user.id,
          eventType: 'user.registered',
          payload: { email: user.email },
          performedBy: user.id
        },
        trx
      );

      if (enableTwoFactor) {
        await DomainEventModel.record(
          {
            entityType: 'user',
            entityId: user.id,
            eventType: 'user.two_factor_enrolled',
            payload: {
              enforced: enforceTwoFactor,
              method: 'email_otp'
            },
            performedBy: user.id
          },
          trx
        );
      }

      await LearnerOnboardingResponseModel.linkUser(payload.email, payload.role, user.id, trx);

      const verification = await emailVerificationService.issueVerification(user, context, trx);

      return {
        data: {
          user: serializeUser(user),
          verification: {
            status: 'pending',
            expiresAt: verification.expiresAt.toISOString()
          },
          twoFactor: twoFactorEnrollment
        }
      };
    });
  }

  static async login(email, password, twoFactorCode = null, context = {}) {
    return db.transaction(async (trx) => {
      const user = await UserModel.forUpdateByEmail(email, trx);
      if (!user) {
        const error = new Error('Invalid credentials');
        error.status = 401;
        throw error;
      }

      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const error = new Error('Account temporarily locked due to repeated failed sign-in attempts.');
        error.status = 423;
        error.code = 'ACCOUNT_LOCKED';
        error.details = { lockedUntil: new Date(user.locked_until).toISOString() };
        throw error;
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        const result = await UserModel.recordLoginFailure(
          user,
          {
            threshold: env.security.accountLockoutThreshold,
            windowMinutes: env.security.accountLockoutWindowMinutes,
            lockoutDurationMinutes: env.security.accountLockoutDurationMinutes
          },
          trx
        );

        const remainingAttempts = Math.max(
          0,
          env.security.accountLockoutThreshold - result.failureCount
        );

        await DomainEventModel.record(
          {
            entityType: 'user',
            entityId: user.id,
            eventType: 'user.login_failed',
            payload: {
              attempts: result.failureCount,
              lockedUntil: result.lockedUntil ? result.lockedUntil.toISOString() : null,
              remainingAttempts,
              ipAddress: context.ipAddress ?? null,
              userAgent: context.userAgent ?? null
            }
          },
          trx
        );

        const error = new Error('Invalid credentials');
        error.status = result.lockedUntil ? 423 : 401;
        if (result.lockedUntil) {
          error.code = 'ACCOUNT_LOCKED';
          error.details = { lockedUntil: result.lockedUntil.toISOString() };
        } else {
          error.details = { remainingAttempts };
        }
        throw error;
      }

      if (!user.email_verified_at) {
        await emailVerificationService.issueVerification(user, context, trx);
        const error = new Error('Email verification required before accessing the platform.');
        error.status = 403;
        error.code = 'EMAIL_VERIFICATION_REQUIRED';
        error.details = { email: user.email };
        throw error;
      }

      const requiresTwoFactor = TwoFactorService.shouldEnforceForUser(user);
      if (requiresTwoFactor) {
        if (!TwoFactorService.isTwoFactorEnabled(user) && TwoFactorService.shouldEnforceForRole(user.role)) {
          await UserModel.updateById(
            user.id,
            { twoFactorEnabled: true, twoFactorEnrolledAt: new Date(), twoFactorSecret: null },
            trx
          );
          user.two_factor_enabled = 1;
        }

        if (!twoFactorCode) {
          const challenge = await TwoFactorService.issueChallenge(user, context, trx);
          await DomainEventModel.record(
            {
              entityType: 'user',
              entityId: user.id,
              eventType: 'user.two_factor_challenge_issued',
              payload: {
                method: 'email_otp',
                enforced: TwoFactorService.shouldEnforceForRole(user.role),
                challengeId: challenge.challengeId,
                delivered: challenge.delivered,
                expiresAt: challenge.expiresAt?.toISOString?.() ?? null,
                resendAvailableAt: challenge.resendAvailableAt?.toISOString?.() ?? null,
                ipAddress: context.ipAddress ?? null,
                userAgent: context.userAgent ?? null
              }
            },
            trx
          );
          const error = new Error('Check your email for a one-time sign-in code to continue.');
          error.status = 403;
          error.code = 'TWO_FACTOR_REQUIRED';
          error.details = {
            method: 'email_otp',
            delivered: challenge.delivered,
            expiresAt: challenge.expiresAt?.toISOString?.() ?? null,
            resendAvailableAt: challenge.resendAvailableAt?.toISOString?.() ?? null
          };
          throw error;
        }

        const verification = await TwoFactorService.verifyChallenge(user.id, twoFactorCode, trx);
        if (!verification.valid) {
          await DomainEventModel.record(
            {
              entityType: 'user',
              entityId: user.id,
              eventType: 'user.two_factor_challenge_failed',
              payload: {
                method: 'email_otp',
                enforced: TwoFactorService.shouldEnforceForRole(user.role),
                reason: verification.reason,
                ipAddress: context.ipAddress ?? null,
                userAgent: context.userAgent ?? null
              }
            },
            trx
          );
          const error = new Error('Invalid or expired two-factor sign-in code.');
          error.status = verification.reason === 'max_attempts' ? 423 : 401;
          error.code = 'TWO_FACTOR_INVALID';
          error.details = { method: 'email_otp', reason: verification.reason };
          throw error;
        }

        await UserModel.markTwoFactorVerified(user.id, trx);
        await DomainEventModel.record(
          {
            entityType: 'user',
            entityId: user.id,
            eventType: 'user.two_factor_challenge_verified',
            payload: {
              method: 'email_otp',
              enforced: TwoFactorService.shouldEnforceForRole(user.role),
              challengeId: verification.challenge.id,
              ipAddress: context.ipAddress ?? null,
              userAgent: context.userAgent ?? null
            }
          },
          trx
        );
      }

      await UserModel.clearLoginFailures(user.id, trx);
      const refreshedUser = await UserModel.findById(user.id, trx);

      const session = await this.createSession(
        { id: user.id, email: user.email, role: user.role },
        context,
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: user.id,
          eventType: 'user.login_succeeded',
          payload: {
            sessionId: session.sessionId,
            sessionExpiresAt: session.expiresAt.toISOString(),
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null
          }
        },
        trx
      );

      return this.buildAuthResponse(serializeUser(refreshedUser), session);
    });
  }

  static async verifyEmail(token, context = {}) {
    const user = await emailVerificationService.verifyToken(token, context);
    return {
      data: {
        user: serializeUser(user),
        verification: buildVerificationMetadata(user)
      }
    };
  }

  static async resendVerification(email, context = {}) {
    const result = await emailVerificationService.resend(email, context);
    const delivered = result.reason ? true : result.delivered;
    return {
      data: {
        delivered,
        expiresAt: result.expiresAt ?? null
      }
    };
  }

  static async refreshSession(refreshToken, context = {}) {
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw buildRefreshTokenRequiredError();
    }

    const refreshTokenHash = hashRefreshToken(refreshToken);

    return db.transaction(async (trx) => {
      const session = await UserSessionModel.findActiveByHash(refreshTokenHash, trx, { forUpdate: true });
      if (!session) {
        await DomainEventModel.record(
          {
            entityType: 'user_session',
            entityId: 'unknown',
            eventType: 'user.session_refresh_failed',
            payload: {
              reason: 'invalid_or_expired',
              ipAddress: context.ipAddress ?? null,
              userAgent: context.userAgent ?? null
            }
          },
          trx
        );
        throw buildInvalidRefreshTokenError();
      }

      await UserSessionModel.touch(session.id, trx);

      const user = await UserModel.findById(session.userId, trx);
      if (!user) {
        sessionRegistry.markRevoked(session.id, 'orphaned');
        await UserSessionModel.revokeById(session.id, 'orphaned', trx);
        throw buildInvalidRefreshTokenError();
      }

      await UserSessionModel.revokeById(session.id, 'rotated', trx);
      await UserSessionModel.markRotated(session.id, trx);
      sessionRegistry.markRevoked(session.id, 'rotated');

      const newSession = await this.createSession(
        { id: user.id, email: user.email, role: user.role },
        context,
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: user.id,
          eventType: 'user.session_rotated',
          payload: {
            previousSessionId: session.id,
            sessionId: newSession.sessionId,
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null
          },
          performedBy: user.id
        },
        trx
      );

      return this.buildAuthResponse(serializeUser(user), newSession);
    });
  }

  static async logout(sessionId, userId, context = {}) {
    if (!sessionId) {
      return { data: { revoked: false, reason: 'missing_session' } };
    }

    return db.transaction(async (trx) => {
      const session = await UserSessionModel.findById(sessionId, trx, { forUpdate: true });
      if (!session) {
        sessionRegistry.markRevoked(sessionId, 'unknown');
        return { data: { revoked: false, reason: 'not_found' } };
      }

      if (session.revokedAt) {
        sessionRegistry.markRevoked(session.id, session.revokedReason ?? 'previously_revoked');
        return { data: { revoked: false, reason: 'already_revoked' } };
      }

      await UserSessionModel.revokeById(session.id, 'user_logout', trx, userId ?? null);
      sessionRegistry.markRevoked(session.id, 'user_logout');

      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: session.userId,
          eventType: 'user.session_revoked',
          payload: {
            reason: 'user_logout',
            sessionId: session.id,
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null
          },
          performedBy: userId ?? session.userId
        },
        trx
      );

      return { data: { revoked: true } };
    });
  }

  static async logoutAll(userId, currentSessionId, context = {}, { includeCurrent = false } = {}) {
    return db.transaction(async (trx) => {
      const expiredIds = await UserSessionModel.revokeExpiredSessions(userId, trx);
      expiredIds.forEach((id) => sessionRegistry.markRevoked(id, 'expired'));

      const revokedIds = await UserSessionModel.revokeOtherSessions(
        userId,
        includeCurrent ? null : currentSessionId,
        includeCurrent ? 'user_forced_logout' : 'user_logout_other_devices',
        trx,
        userId
      );

      revokedIds.forEach((id) =>
        sessionRegistry.markRevoked(id, includeCurrent ? 'user_forced_logout' : 'user_logout_other_devices')
      );

      if (includeCurrent && currentSessionId && !revokedIds.includes(currentSessionId)) {
        await UserSessionModel.revokeById(currentSessionId, 'user_forced_logout', trx, userId);
        sessionRegistry.markRevoked(currentSessionId, 'user_forced_logout');
        revokedIds.push(currentSessionId);
      }

      if (revokedIds.length > 0) {
        await DomainEventModel.record(
          {
            entityType: 'user',
            entityId: userId,
            eventType: 'user.sessions_revoked',
            payload: {
              reason: includeCurrent ? 'user_forced_logout' : 'user_logout_other_devices',
              sessionIds: revokedIds,
              ipAddress: context.ipAddress ?? null,
              userAgent: context.userAgent ?? null
            },
            performedBy: userId
          },
          trx
        );
      }

      return {
        data: {
          revokedCount: revokedIds.length,
          revokedSessionIds: revokedIds
        }
      };
    });
  }

  static async requestMagicLink(email, context = {}, options = {}) {
    const result = await MagicLinkService.issue(email, context, options);
    return {
      data: {
        delivered: result.delivered,
        expiresAt: result.expiresAt ? result.expiresAt.toISOString() : null
      }
    };
  }

  static async consumeMagicLink(token, context = {}) {
    const { user } = await MagicLinkService.consume(token, context);
    const refreshedUser = await UserModel.findById(user.id);
    const session = await this.createSession(
      { id: refreshedUser.id, email: refreshedUser.email, role: refreshedUser.role },
      context
    );

    await DomainEventModel.record({
      entityType: 'user',
      entityId: refreshedUser.id,
      eventType: 'user.login_succeeded',
      payload: {
        sessionId: session.sessionId,
        sessionExpiresAt: session.expiresAt.toISOString(),
        method: 'magic_link',
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null
      },
      performedBy: refreshedUser.id
    });

    return this.buildAuthResponse(serializeUser(refreshedUser), session);
  }

  static async startPasskeyRegistration(userId, metadata = null, context = {}) {
    return PasskeyService.issueRegistrationOptions(userId, metadata, context);
  }

  static async completePasskeyRegistration(requestId, response, context = {}) {
    const { user, passkey } = await PasskeyService.completeRegistration(requestId, response, context);
    return {
      data: {
        user: serializeUser(user),
        passkey: {
          id: passkey.id,
          credentialId: passkey.credentialId,
          createdAt: passkey.createdAt
        }
      }
    };
  }

  static async startPasskeyLogin(payload, context = {}) {
    const { requestId, options } = await PasskeyService.issueAuthenticationOptions(payload, context);
    return {
      data: {
        requestId,
        options
      }
    };
  }

  static async completePasskeyLogin(requestId, response, context = {}) {
    const { user } = await PasskeyService.verifyAuthentication(requestId, response, context);
    await UserModel.clearLoginFailures(user.id);
    const refreshedUser = await UserModel.findById(user.id);
    const session = await this.createSession(
      { id: refreshedUser.id, email: refreshedUser.email, role: refreshedUser.role },
      context
    );

    await DomainEventModel.record({
      entityType: 'user',
      entityId: refreshedUser.id,
      eventType: 'user.login_succeeded',
      payload: {
        sessionId: session.sessionId,
        sessionExpiresAt: session.expiresAt.toISOString(),
        method: 'passkey',
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null
      },
      performedBy: refreshedUser.id
    });

    return this.buildAuthResponse(serializeUser(refreshedUser), session);
  }

  static async createSession(user, context = {}, connection = db) {
    const refreshToken = crypto.randomBytes(48).toString('base64url');
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + env.security.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

    const sessionRecord = await UserSessionModel.create(
      {
        userId: user.id,
        refreshTokenHash,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        expiresAt
      },
      connection
    );

    const expiredIds = await UserSessionModel.revokeExpiredSessions(user.id, connection);
    const trimmedIds = await UserSessionModel.pruneExcessSessions(
      user.id,
      env.security.maxActiveSessionsPerUser,
      connection
    );

    [...expiredIds, ...trimmedIds].forEach((id) => sessionRegistry.markRevoked(id, 'session_reaped'));

    if (trimmedIds.length > 0) {
      await DomainEventModel.record(
        {
          entityType: 'user',
          entityId: user.id,
          eventType: 'user.session_revoked',
          payload: {
            reason: 'session_limit_exceeded',
            sessionIds: trimmedIds,
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null
          },
          performedBy: user.id
        },
        connection
      );
    }

    sessionRegistry.remember(sessionRecord);

    const { secret, algorithm, kid } = getActiveJwtKey();
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, sid: sessionRecord.id },
      secret,
      {
        expiresIn: `${env.security.accessTokenTtlMinutes}m`,
        audience: env.security.jwtAudience,
        issuer: env.security.jwtIssuer,
        keyid: kid,
        algorithm
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresAt,
      tokenType: 'Bearer',
      sessionId: sessionRecord.id,
      lastUsedAt: sessionRecord.lastUsedAt ?? new Date()
    };
  }

  static buildAuthResponse(user, session) {
    return {
      data: {
        user,
        verification: buildVerificationMetadata(user),
        tokens: {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          tokenType: session.tokenType,
          expiresAt: session.expiresAt
        },
        session: buildSessionPayload(session)
      }
    };
  }
}
