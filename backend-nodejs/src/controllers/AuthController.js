import Joi from 'joi';

import AuthService from '../services/AuthService.js';
import { success } from '../utils/httpResponse.js';

const PASSWORD_POLICY = Object.freeze({
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
  description:
    'Passwords must contain at least 12 characters with upper and lower case letters, a number, and a special character.'
});

const passwordPattern = new RegExp(
  `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{${PASSWORD_POLICY.minLength},}$`
);

const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(120).required(),
  lastName: Joi.string().trim().max(120).allow('', null),
  email: Joi.string().email().required(),
  password: Joi.string().pattern(passwordPattern).required().messages({
    'string.pattern.base':
      'Password must be at least 12 characters and include upper, lower, numeric, and special characters.'
  }),
  role: Joi.string().valid('user', 'instructor', 'admin').default('user'),
  age: Joi.number().integer().min(16).max(120).optional(),
  address: Joi.object({
    streetAddress: Joi.string().trim().max(255).allow('', null),
    addressLine2: Joi.string().trim().max(255).allow('', null),
    town: Joi.string().trim().max(120).allow('', null),
    city: Joi.string().trim().max(120).allow('', null),
    country: Joi.string().trim().max(120).allow('', null),
    postcode: Joi.string().trim().max(60).allow('', null)
  })
    .optional()
    .default({}),
  twoFactor: Joi.object({
    enabled: Joi.boolean().default(false)
  })
    .optional()
    .default({ enabled: false })
});

function normalizeAddress(address) {
  if (!address || typeof address !== 'object') {
    return null;
  }

  const normalized = Object.entries(address).reduce((acc, [key, value]) => {
    if (typeof value !== 'string') {
      return acc;
    }
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      acc[key] = trimmed;
    }
    return acc;
  }, {});

  return Object.keys(normalized).length > 0 ? normalized : null;
}

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  twoFactorCode: Joi.string()
    .trim()
    .pattern(/^\d{6,10}$/)
    .messages({
      'string.pattern.base': 'Two-factor code must be 6-10 digits.'
    })
    .optional()
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().trim().min(10).required()
});

const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required()
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().min(24).required()
});

const logoutAllSchema = Joi.object({
  includeCurrent: Joi.boolean().default(false)
});

function buildContext(req) {
  return {
    ipAddress: req.headers['x-forwarded-for']?.split(',').shift()?.trim() ?? req.ip,
    userAgent: req.get('user-agent')
  };
}

export default class AuthController {
  static async register(req, res, next) {
    try {
      const payload = await registerSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await AuthService.register(
        { ...payload, address: normalizeAddress(payload.address) },
        buildContext(req)
      );
      return success(res, {
        data: result.data,
        message: 'Account created. We have sent a verification email to confirm ownership.',
        status: 201
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const payload = await loginSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await AuthService.login(
        payload.email,
        payload.password,
        payload.twoFactorCode ?? null,
        buildContext(req)
      );
      return success(res, {
        data: result.data,
        message: 'Login successful'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async verifyEmail(req, res, next) {
    try {
      const payload = await verifyEmailSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await AuthService.verifyEmail(payload.token, buildContext(req));
      return success(res, {
        data: result.data,
        message: 'Email address verified successfully'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async resendVerification(req, res, next) {
    try {
      const payload = await resendVerificationSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await AuthService.resendVerification(payload.email, buildContext(req));
      return success(res, {
        data: result.data,
        message: 'If an account exists for this email, a verification link has been sent.'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async refresh(req, res, next) {
    try {
      const payload = await refreshSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await AuthService.refreshSession(payload.refreshToken, buildContext(req));
      return success(res, {
        data: result.data,
        message: 'Session refreshed successfully'
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      const sessionId = req.user?.sessionId ?? null;
      const result = await AuthService.logout(sessionId, req.user?.id, buildContext(req));
      const message = result.data.revoked
        ? 'Signed out from current session.'
        : 'Session already closed.';
      return success(res, {
        data: result.data,
        message
      });
    } catch (error) {
      return next(error);
    }
  }

  static async logoutAll(req, res, next) {
    try {
      const payload = await logoutAllSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await AuthService.logoutAll(
        req.user.id,
        req.user.sessionId,
        buildContext(req),
        { includeCurrent: payload.includeCurrent }
      );
      const message = payload.includeCurrent
        ? 'All sessions have been revoked.'
        : 'Signed out from other devices.';
      return success(res, {
        data: result.data,
        message
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      return next(error);
    }
  }

  static async passwordPolicy(_req, res, next) {
    try {
      const requirements = [
        `At least ${PASSWORD_POLICY.minLength} characters`,
        PASSWORD_POLICY.requireUppercase ? 'One uppercase letter (A-Z)' : null,
        PASSWORD_POLICY.requireLowercase ? 'One lowercase letter (a-z)' : null,
        PASSWORD_POLICY.requireNumber ? 'One digit (0-9)' : null,
        PASSWORD_POLICY.requireSymbol ? 'One special character (!@#$…)' : null
      ].filter(Boolean);

      return success(res, {
        data: {
          policy: PASSWORD_POLICY,
          requirements,
          example: 'Skool#Launch42',
          updatedAt: new Date().toISOString()
        },
        message: 'Password policy retrieved'
      });
    } catch (error) {
      return next(error);
    }
  }
}

export { PASSWORD_POLICY };
