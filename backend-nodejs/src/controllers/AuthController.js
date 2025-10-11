import Joi from 'joi';

import AuthService from '../services/AuthService.js';
import { success } from '../utils/httpResponse.js';

const passwordPattern = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{12,}$');

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
  address: Joi.string().trim().max(255).allow('', null)
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().trim().min(10).required()
});

const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required()
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
      const result = await AuthService.login(payload.email, payload.password, buildContext(req));
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
}
