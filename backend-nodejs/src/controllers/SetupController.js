import Joi from 'joi';

import {
  setupOrchestratorService,
  DEFAULT_SETUP_TASK_SEQUENCE
} from '../services/SetupOrchestratorService.js';
import { success } from '../utils/httpResponse.js';

const startSchema = Joi.object({
  tasks: Joi.array()
    .items(Joi.string().valid(...setupOrchestratorService.listTaskIds()))
    .min(1)
    .optional(),
  envConfig: Joi.object({
    backend: Joi.object().pattern(/^[A-Z0-9_]+$/, Joi.string().allow('', null)).optional(),
    frontend: Joi.object().pattern(/^[A-Z0-9_]+$/, Joi.string().allow('', null)).optional()
  })
    .optional()
    .default({})
});

export default class SetupController {
  static async getStatus(_req, res) {
    const state = setupOrchestratorService.getStatus();
    return success(res, {
      status: 200,
      message: 'Setup status retrieved',
      data: {
        state,
        tasks: setupOrchestratorService.describeTasks(),
        defaults: {
          sequence: DEFAULT_SETUP_TASK_SEQUENCE
        }
      }
    });
  }

  static async startRun(req, res, next) {
    try {
      const payload = await startSchema.validateAsync(req.body ?? {}, { abortEarly: false, stripUnknown: true });
      const state = await setupOrchestratorService.startRun(payload);
      return success(res, {
        status: 202,
        message: 'Setup run started',
        data: {
          state
        }
      });
    } catch (error) {
      if (error.isJoi) {
        error.status = 422;
        error.details = error.details.map((detail) => detail.message);
      }
      return next(error);
    }
  }
}
