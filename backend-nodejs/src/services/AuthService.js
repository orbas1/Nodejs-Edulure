import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import db from '../config/database.js';
import { env } from '../config/env.js';
import { getActiveJwtKey } from '../config/jwtKeyStore.js';
import UserModel from '../models/UserModel.js';
import UserSessionModel from '../models/UserSessionModel.js';
import DomainEventModel from '../models/DomainEventModel.js';
import { emailVerificationService } from './EmailVerificationService.js';

function hashRefreshToken(token) {
  return crypto.createHmac('sha256', env.security.jwtRefreshSecret).update(token).digest('hex');
}

function sanitizeUserRecord(user) {
  return {
    id: user.id,
    firstName: user.firstName ?? user.first_name,
    lastName: user.lastName ?? user.last_name,
    email: user.email,
    role: user.role,
    age: user.age,
    address: user.address,
    createdAt: user.createdAt ?? user.created_at,
    updatedAt: user.updatedAt ?? user.updated_at,
    emailVerifiedAt: user.emailVerifiedAt ?? user.email_verified_at ?? null,
    lastLoginAt: user.lastLoginAt ?? user.last_login_at ?? null
  };
}

function buildVerificationMetadata(user) {
  return {
    status: user.emailVerifiedAt ? 'verified' : 'pending',
    emailVerifiedAt: user.emailVerifiedAt ?? null
  };
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

      const passwordHash = await bcrypt.hash(payload.password, 12);
      const user = await UserModel.create(
        {
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          passwordHash,
          role: payload.role,
          age: payload.age,
          address: payload.address
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

      const verification = await emailVerificationService.issueVerification(user, context, trx);

      return {
        data: {
          user: sanitizeUserRecord(user),
          verification: {
            status: 'pending',
            expiresAt: verification.expiresAt.toISOString()
          }
        }
      };
    });
  }

  static async login(email, password, context = {}) {
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
            sessionExpiresAt: session.expiresAt.toISOString(),
            ipAddress: context.ipAddress ?? null,
            userAgent: context.userAgent ?? null
          }
        },
        trx
      );

      return this.buildAuthResponse(sanitizeUserRecord(refreshedUser), session);
    });
  }

  static async verifyEmail(token, context = {}) {
    const user = await emailVerificationService.verifyToken(token, context);
    return {
      data: {
        user: sanitizeUserRecord(user),
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

  static async createSession(user, context = {}, connection = db) {
    const refreshToken = crypto.randomBytes(48).toString('base64url');
    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + env.security.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

    await UserSessionModel.create(
      {
        userId: user.id,
        refreshTokenHash,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        expiresAt
      },
      connection
    );

    const { secret, algorithm, kid } = getActiveJwtKey();
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
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
      tokenType: 'Bearer'
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
        }
      }
    };
  }
}
