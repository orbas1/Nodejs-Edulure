import Joi from 'joi';
import AuthService from '../services/AuthService.js';

const registerSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().allow('', null),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('user', 'instructor', 'admin').default('user'),
  age: Joi.number().integer().min(16).max(120).optional(),
  address: Joi.string().allow('', null)
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export default class AuthController {
  static async register(req, res, next) {
    try {
      const payload = await registerSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const result = await AuthService.register(payload);
      res.status(201).json(result);
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const payload = await loginSchema.validateAsync(req.body, { abortEarly: false, stripUnknown: true });
      const result = await AuthService.login(payload.email, payload.password);
      res.json(result);
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((d) => d.message);
      }
      next(error);
    }
  }
}
