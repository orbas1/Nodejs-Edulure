import Joi from 'joi';

import logger from '../config/logger.js';
import LearnerOnboardingInsightsService from '../services/LearnerOnboardingInsightsService.js';
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
  static async buildSnapshot() {
    const [defaults, learnerReadiness] = await Promise.all([
      setupOrchestratorService.describeDefaults(),
      LearnerOnboardingInsightsService.summarise()
    ]);

    const state = {
      ...setupOrchestratorService.getStatus(),
      learnerReadiness
    };

    return {
      state,
      tasks: setupOrchestratorService.describeTasks(),
      presets: setupOrchestratorService.describePresets(),
      defaults,
      history: setupOrchestratorService.getRecentRuns()
    };
  }

  static async getStatus(_req, res, next) {
    try {
      const snapshot = await SetupController.buildSnapshot();
      return success(res, {
        status: 200,
        message: 'Setup status retrieved',
        data: snapshot
      });
    } catch (error) {
      return next(error);
    }
  }

  static async startRun(req, res, next) {
    try {
      const payload = await startSchema.validateAsync(req.body ?? {}, { abortEarly: false, stripUnknown: true });
      const state = await setupOrchestratorService.startRun(payload);
      const learnerReadiness = await LearnerOnboardingInsightsService.summarise();
      return success(res, {
        status: 202,
        message: 'Setup run started',
        data: {
          state: {
            ...state,
            learnerReadiness
          }
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

      const sendSnapshot = async () => {
        try {
          const snapshot = await SetupController.buildSnapshot();
          res.write(`event: state\n`);
          res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
        } catch (error) {
          logger.error({ err: error }, 'Failed to stream setup snapshot');
          res.write(`event: error\n`);
          res.write(`data: "snapshot-error"\n\n`);
        }
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
