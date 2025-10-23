import Joi from 'joi';

import { setupOrchestratorService } from '../services/SetupOrchestratorService.js';
import { success } from '../utils/httpResponse.js';

const startSchema = Joi.object({
  tasks: Joi.array()
    .items(Joi.string().valid(...setupOrchestratorService.listTaskIds()))
    .min(1)
    .optional(),
  preset: Joi.string()
    .valid(...setupOrchestratorService.listPresetIds())
    .optional(),
  envConfig: Joi.object({
    backend: Joi.object().pattern(/^[A-Z0-9_]+$/, Joi.string().allow('', null)).optional(),
    frontend: Joi.object().pattern(/^[A-Z0-9_]+$/, Joi.string().allow('', null)).optional()
  })
    .optional()
    .default({})
});

export default class SetupController {
  static buildSnapshot() {
    return {
      state: setupOrchestratorService.getStatus(),
      tasks: setupOrchestratorService.describeTasks(),
      presets: setupOrchestratorService.describePresets(),
      defaults: setupOrchestratorService.describeDefaults()
    };
  }

  static async getStatus(_req, res) {
    return success(res, {
      status: 200,
      message: 'Setup status retrieved',
      data: SetupController.buildSnapshot()
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

  static streamEvents(req, res, next) {
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const sendSnapshot = () => {
        const snapshot = SetupController.buildSnapshot();
        res.write(`event: state\n`);
        res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
      };

      sendSnapshot();

      const listener = () => {
        sendSnapshot();
      };

      const heartbeat = setInterval(() => {
        res.write(`event: heartbeat\n`);
        res.write(`data: "${new Date().toISOString()}"\n\n`);
      }, 15_000);

      setupOrchestratorService.on('state', listener);

      req.on('close', () => {
        clearInterval(heartbeat);
        setupOrchestratorService.off('state', listener);
        res.end();
      });
    } catch (error) {
      next(error);
    }
  }
}
