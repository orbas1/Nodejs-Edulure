import Joi from 'joi';

import instructorOrchestrationService from '../services/InstructorOrchestrationService.js';
import { success } from '../utils/httpResponse.js';

const courseOutlineSchema = Joi.object({
  courseId: Joi.string().trim().max(120).optional(),
  topic: Joi.string().trim().max(200).optional(),
  moduleCount: Joi.number().integer().min(1).max(50).default(6),
  outcomes: Joi.array().items(Joi.string().trim().max(200)).max(20).optional()
});

const notionImportSchema = Joi.object({
  workspaceId: Joi.string().trim().max(120).optional(),
  pageUrl: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
  sections: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(200)),
    Joi.string().trim().max(500)
  )
});

const lmsSyncSchema = Joi.object({
  provider: Joi.string().trim().max(120).optional(),
  courseCode: Joi.string().trim().max(120).optional()
});

const routingSchema = Joi.object({
  rulesetId: Joi.string().trim().max(120).optional(),
  pendingCount: Joi.number().integer().min(0).optional()
});

const mentorInviteSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().trim().max(120).optional(),
  role: Joi.string().trim().max(80).optional()
});

const pricingExportSchema = Joi.object({
  format: Joi.string().valid('csv', 'json', 'xlsx').default('csv')
});

function handleValidationError(error) {
  if (error.isJoi) {
    error.status = 422;
    error.details = error.details.map((detail) => detail.message);
  }
  return error;
}

export default class InstructorOrchestrationController {
  static async generateCourseOutline(req, res, next) {
    try {
      const payload = await courseOutlineSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await instructorOrchestrationService.generateCourseOutline(req.user.id, payload);
      return success(res, {
        data: result,
        message: 'Course outline orchestration scheduled',
        status: 202
      });
    } catch (error) {
      return next(handleValidationError(error));
    }
  }

  static async importFromNotion(req, res, next) {
    try {
      const payload = await notionImportSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await instructorOrchestrationService.importFromNotion(req.user.id, payload);
      return success(res, {
        data: result,
        message: 'Notion import queued',
        status: 202
      });
    } catch (error) {
      return next(handleValidationError(error));
    }
  }

  static async syncFromLms(req, res, next) {
    try {
      const payload = await lmsSyncSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await instructorOrchestrationService.syncFromLms(req.user.id, payload);
      return success(res, {
        data: result,
        message: 'LMS synchronisation in progress',
        status: 202
      });
    } catch (error) {
      return next(handleValidationError(error));
    }
  }

  static async routeTutorRequest(req, res, next) {
    try {
      const payload = await routingSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await instructorOrchestrationService.routeTutorRequest(req.user.id, payload);
      return success(res, {
        data: result,
        message: 'Tutor routing recalibrated',
        status: 202
      });
    } catch (error) {
      return next(handleValidationError(error));
    }
  }

  static async sendMentorInvite(req, res, next) {
    try {
      const payload = await mentorInviteSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await instructorOrchestrationService.sendMentorInvite(req.user.id, payload);
      return success(res, {
        data: result,
        message: 'Mentor invite dispatched',
        status: 202
      });
    } catch (error) {
      return next(handleValidationError(error));
    }
  }

  static async exportPricing(req, res, next) {
    try {
      const payload = await pricingExportSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      const result = await instructorOrchestrationService.exportPricing(req.user.id, payload);
      return success(res, {
        data: result,
        message: 'Pricing export scheduled',
        status: 202
      });
    } catch (error) {
      return next(handleValidationError(error));
    }
  }
}
