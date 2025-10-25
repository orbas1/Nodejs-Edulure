import Joi from 'joi';

import AuthService from '../services/AuthService.js';
import { success } from '../utils/httpResponse.js';
import { env } from '../config/env.js';
import {
  DEFAULT_PASSWORD_POLICY,
  buildPasswordPattern,
  describePasswordPolicy,
  resolvePasswordPolicy
} from '../config/passwordPolicy.js';

const runtimePasswordPolicy = env?.security?.passwordPolicy ?? DEFAULT_PASSWORD_POLICY;
const resolvedPasswordPolicy = resolvePasswordPolicy(runtimePasswordPolicy);
const passwordPattern = buildPasswordPattern(resolvedPasswordPolicy);
const passwordPolicySummary = describePasswordPolicy(resolvedPasswordPolicy);

const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(120).required(),
  lastName: Joi.string().trim().max(120).allow('', null),
  email: Joi.string().email().required(),
  password: Joi.string().pattern(passwordPattern).required().messages({
    'string.pattern.base': resolvedPasswordPolicy.description
  }),
  role: Joi.string().valid('user', 'instructor', 'admin').default('user'),
  dateOfBirth: Joi.date().iso().less('now').greater('1905-01-01').allow(null),
  twoFactor: Joi.object({
    enabled: Joi.boolean().default(false)
  })
    .optional()
    .default({ enabled: false })
});

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
  static passwordPolicy = passwordPolicySummary.policy;

  static passwordRequirements = passwordPolicySummary.requirements;

  static async describePasswordPolicy(_req, res) {
    return success(res, {
      data: {
        policy: AuthController.passwordPolicy,
        requirements: AuthController.passwordRequirements
      },
      message: 'Password policy retrieved'
    });
  }

  static async register(req, res, next) {
    try {
      const payload = await registerSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await AuthService.register(payload, buildContext(req));
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
}
