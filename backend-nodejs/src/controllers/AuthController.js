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

const clientMetadataSchema = Joi.object({
  platform: Joi.string().trim().max(64).optional(),
  appVersion: Joi.string().trim().max(64).optional(),
  buildNumber: Joi.string().trim().max(64).optional(),
  environment: Joi.string().trim().max(64).optional(),
  timezone: Joi.string().trim().max(64).optional(),
  locale: Joi.string().trim().max(64).optional(),
  osVersion: Joi.string().trim().max(120).optional(),
  deviceModel: Joi.string().trim().max(120).optional(),
  deviceManufacturer: Joi.string().trim().max(120).optional(),
  deviceId: Joi.string().trim().max(120).optional(),
  releaseChannel: Joi.string().trim().max(64).optional(),
  packageName: Joi.string().trim().max(120).optional()
}).optional();

const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(120).required(),
  lastName: Joi.string().trim().max(120).allow('', null),
  email: Joi.string().email().required(),
  password: Joi.string().pattern(passwordPattern).required().messages({
    'string.pattern.base': resolvedPasswordPolicy.description
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
    .optional(),
  client: clientMetadataSchema
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().trim().min(10).required()
});

const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required()
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().min(24).required(),
  client: clientMetadataSchema
});

const logoutAllSchema = Joi.object({
  includeCurrent: Joi.boolean().default(false)
});

function sanitizeClientMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }

  const allowedKeys = new Set([
    'platform',
    'appVersion',
    'buildNumber',
    'environment',
    'timezone',
  'locale',
  'osVersion',
  'deviceModel',
  'deviceManufacturer',
  'deviceId',
  'releaseChannel',
  'packageName'
]);

  return Object.entries(metadata).reduce((acc, [key, value]) => {
    if (!allowedKeys.has(key)) {
      return acc;
    }
    if (value === undefined || value === null) {
      return acc;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        acc[key] = trimmed.slice(0, 255);
      }
      return acc;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function buildContext(req, clientPayload = null) {
  const forwardedIp = req.headers['x-forwarded-for']?.split(',').shift()?.trim();
  const rawPlatform =
    (clientPayload && typeof clientPayload.platform === 'string' && clientPayload.platform.trim()) ||
    req.get('x-client-platform') ||
    'web';
  const platform = rawPlatform.trim().toLowerCase() || 'web';
  const acceptedLocales = typeof req.acceptsLanguages === 'function' ? req.acceptsLanguages() : [];
  const headerLocale = req.get('x-locale');
  const headerTimezone = req.get('x-timezone');
  const metadata = sanitizeClientMetadata({
    ...clientPayload,
    platform,
    appVersion: clientPayload?.appVersion ?? req.get('x-app-version'),
    buildNumber: clientPayload?.buildNumber ?? req.get('x-app-build'),
    locale: clientPayload?.locale ?? headerLocale ?? acceptedLocales?.[0],
    timezone: clientPayload?.timezone ?? headerTimezone,
    osVersion: clientPayload?.osVersion ?? req.get('x-os-version')
  });

  return {
    ipAddress: forwardedIp ?? req.ip,
    userAgent: req.get('user-agent'),
    client: platform,
    clientMetadata: metadata
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
      const { client, ...credentials } = payload;
      const context = buildContext(req, client ?? null);
      const result = await AuthService.login(
        credentials.email,
        credentials.password,
        credentials.twoFactorCode ?? null,
        context
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
      const { client, refreshToken } = payload;
      const context = buildContext(req, client ?? null);
      const result = await AuthService.refreshSession(refreshToken, context);
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
