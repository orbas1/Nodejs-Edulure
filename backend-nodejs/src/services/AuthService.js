import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import db from '../config/database.js';
import { env } from '../config/env.js';
import UserModel from '../models/UserModel.js';
import UserSessionModel from '../models/UserSessionModel.js';
import DomainEventModel from '../models/DomainEventModel.js';

export const ACCESS_TOKEN_AUDIENCE = 'api.edulure.com';

function hashRefreshToken(token) {
  return crypto.createHmac('sha256', env.security.jwtRefreshSecret).update(token).digest('hex');
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

      const session = await this.createSession(user, context, trx);
      return this.buildAuthResponse(user, session);
    });
  }

  static async login(email, password, context = {}) {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      const error = new Error('Invalid credentials');
      error.status = 401;
      throw error;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const error = new Error('Invalid credentials');
      error.status = 401;
      throw error;
    }

    const session = await this.createSession({ id: user.id, email: user.email, role: user.role }, context);
    return this.buildAuthResponse(
      {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        age: user.age,
        address: user.address,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      session
    );
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

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      env.security.jwtSecret,
      {
        expiresIn: `${env.security.accessTokenTtlMinutes}m`,
        audience: ACCESS_TOKEN_AUDIENCE,
        issuer: 'edulure-platform'
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
        user: {
          id: user.id,
          firstName: user.firstName ?? user.first_name,
          lastName: user.lastName ?? user.last_name,
          email: user.email,
          role: user.role,
          age: user.age,
          address: user.address,
          createdAt: user.createdAt ?? user.created_at,
          updatedAt: user.updatedAt ?? user.updated_at
        },
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
