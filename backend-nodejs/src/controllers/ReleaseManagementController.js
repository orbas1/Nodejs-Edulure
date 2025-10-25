import Joi from 'joi';

import releaseOrchestrationService from '../services/ReleaseOrchestrationService.js';
import { success } from '../utils/httpResponse.js';

const paginationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(25),
  offset: Joi.number().integer().min(0).default(0)
});

const ENVIRONMENT_IDENTIFIER_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;
const ENVIRONMENT_IDENTIFIER_ERROR = 'environment must be a lowercase identifier without spaces';

function slugifyEnvironmentIdentifier(input) {
  if (input === undefined || input === null) {
    return '';
  }

  return String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function normaliseEnvironmentIdentifier(value, helpers) {
  const slug = slugifyEnvironmentIdentifier(value);
  if (!slug || !ENVIRONMENT_IDENTIFIER_PATTERN.test(slug)) {
    return helpers.error('any.invalid');
  }

  return slug;
}

const csvListSchema = Joi.alternatives()
  .try(
    Joi.array().items(Joi.string().trim().min(1).max(120)),
    Joi.string().trim().max(512)
  )
  .custom((value, helpers) => {
    const values = Array.isArray(value) ? value : String(value).split(',');
    const cleaned = values
      .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry).trim()))
      .filter(Boolean);

    if (cleaned.some((entry) => entry.length > 120)) {
      return helpers.error('string.max', { limit: 120 });
    }

    if (!cleaned.length) {
      return undefined;
    }

    return Array.from(new Set(cleaned));
  }, 'CSV normaliser')
  .optional();

const environmentIdentifierSchema = Joi.string()
  .trim()
  .max(120)
  .custom(normaliseEnvironmentIdentifier, 'environment normaliser')
  .messages({
    'any.invalid': ENVIRONMENT_IDENTIFIER_ERROR,
    'string.base': ENVIRONMENT_IDENTIFIER_ERROR,
    'string.empty': ENVIRONMENT_IDENTIFIER_ERROR
  });

const environmentListSchema = Joi.alternatives()
  .try(
    Joi.array()
      .items(Joi.any())
      .custom((values, helpers) => {
        const rawEntries = Array.isArray(values) ? values : [];
        const trimmed = rawEntries
          .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry ?? '').trim()))
          .filter(Boolean);

        if (!trimmed.length) {
          return undefined;
        }

        const unique = new Set();
        for (const entry of trimmed) {
          unique.add(normaliseEnvironmentIdentifier(entry, helpers));
        }

        return Array.from(unique);
      }, 'environment array normaliser'),
    Joi.string()
      .trim()
      .max(512)
      .custom((value, helpers) => {
        if (!value) {
          return undefined;
        }

        const entries = value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean);

        if (!entries.length) {
          return undefined;
        }

        const unique = new Set();
        for (const entry of entries) {
          unique.add(normaliseEnvironmentIdentifier(entry, helpers));
        }

        return Array.from(unique);
      }, 'environment csv normaliser')
  )
  .messages({ 'any.invalid': ENVIRONMENT_IDENTIFIER_ERROR })
  .optional();

const checklistQuerySchema = paginationSchema.append({
  category: csvListSchema
});

const runsQuerySchema = paginationSchema.append({
  environment: environmentListSchema,
  status: csvListSchema,
  versionTag: Joi.string().trim().max(120).optional()
});

const releaseIdParamsSchema = Joi.object({
  publicId: Joi.string()
    .trim()
    .pattern(/^[a-z0-9][a-z0-9._-]{2,80}$/i)
    .required()
    .messages({
      'string.pattern.base': 'publicId must contain letters, numbers, dots, underscores or hyphen characters only'
    })
});

const gateParamsSchema = releaseIdParamsSchema.append({
  gateKey: Joi.string()
    .trim()
    .pattern(/^[a-z0-9][a-z0-9-]{1,120}$/i)
    .required()
    .messages({
      'string.pattern.base': 'gateKey must contain letters, numbers, or hyphen separators'
    })
});

const gateSeedSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'in_progress', 'pass', 'fail', 'waived', 'blocked')
    .optional(),
  ownerEmail: Joi.string().trim().email().optional(),
  metrics: Joi.object().unknown(true).default({}),
  notes: Joi.string().trim().max(4000).allow(null, '').optional(),
  lastEvaluatedAt: Joi.date().iso().optional()
})
  .unknown(false)
  .optional();

const scheduleRunSchema = Joi.object({
  versionTag: Joi.string().trim().min(1).max(120).required(),
  environment: environmentIdentifierSchema
    .required()
    .messages({
      'any.required': 'environment is required',
      'string.base': ENVIRONMENT_IDENTIFIER_ERROR,
      'string.empty': ENVIRONMENT_IDENTIFIER_ERROR,
      'any.invalid': ENVIRONMENT_IDENTIFIER_ERROR
    }),
  initiatedByEmail: Joi.string().trim().email().required(),
  initiatedByName: Joi.string().trim().max(160).allow(null, '').optional(),
  changeWindowStart: Joi.date().iso().optional(),
  changeWindowEnd: Joi.date().iso().min(Joi.ref('changeWindowStart')).optional(),
  summaryNotes: Joi.string().trim().max(4000).allow(null, '').optional(),
  metadata: Joi.object().unknown(true).default({}),
  changeTicket: Joi.string().trim().max(160).allow(null, '').optional(),
  scheduledAt: Joi.date().iso().optional(),
  initialGates: Joi.object()
    .pattern(/^[a-z0-9][a-z0-9-]{1,120}$/i, gateSeedSchema)
    .default({})
}).with('changeWindowEnd', 'changeWindowStart');

const gateEvaluationSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'in_progress', 'pass', 'fail', 'waived', 'blocked')
    .required(),
  ownerEmail: Joi.string().trim().email().optional(),
  metrics: Joi.object().unknown(true).default({}),
  notes: Joi.string().trim().max(4000).allow(null, '').optional(),
  evidenceUrl: Joi.string().trim().uri({ allowRelative: false }).max(2000).allow(null, '').optional(),
  lastEvaluatedAt: Joi.date().iso().optional()
});

const dashboardQuerySchema = Joi.object({
  environment: environmentIdentifierSchema.optional()
}).unknown(true);

function handleValidationError(error, next) {
  if (!error) {
    return false;
  }

  error.status = 422;
  error.details = Array.isArray(error.details)
    ? error.details.map((detail) => detail.message)
    : error.details;

  next(error);
  return true;
}

export default class ReleaseManagementController {
  static async getChecklist(req, res, next) {
    try {
      const { value, error } = checklistQuerySchema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      if (handleValidationError(error, next)) {
        return;
      }

      const filters = {};
      if (value.category) {
        filters.category = value.category;
      }

      const pagination = { limit: value.limit, offset: value.offset };
      const checklist = await releaseOrchestrationService.listChecklist(filters, pagination);
      return success(res, {
        data: checklist,
        message: 'Release readiness checklist retrieved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async scheduleRun(req, res, next) {
    try {
      const { value, error } = scheduleRunSchema.validate(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      if (handleValidationError(error, next)) {
        return;
      }

      const result = await releaseOrchestrationService.scheduleReleaseRun(value);
      return success(res, {
        data: result,
        message: 'Release run scheduled',
        status: 201
      });
    } catch (error) {
      return next(error);
    }
  }

  static async listRuns(req, res, next) {
    try {
      const { value, error } = runsQuerySchema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      if (handleValidationError(error, next)) {
        return;
      }

      const filters = {};
      if (value.environment) {
        filters.environment = value.environment;
      }
      if (value.status) {
        filters.status = value.status;
      }
      if (value.versionTag) {
        filters.versionTag = value.versionTag;
      }

      const pagination = { limit: value.limit, offset: value.offset };
      const runs = await releaseOrchestrationService.listRuns(filters, pagination);
      return success(res, {
        data: runs,
        message: 'Release runs retrieved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getRun(req, res, next) {
    try {
      const { value: params, error } = releaseIdParamsSchema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true
      });
      if (handleValidationError(error, next)) {
        return;
      }

      const result = await releaseOrchestrationService.getRun(params.publicId);
      if (!result) {
        return res.status(404).json({ success: false, message: 'Release run not found' });
      }

      return success(res, {
        data: result,
        message: 'Release run retrieved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async recordGateEvaluation(req, res, next) {
    try {
      const { value: params, error: paramsError } = gateParamsSchema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true
      });
      if (handleValidationError(paramsError, next)) {
        return;
      }

      const { value: payload, error: payloadError } = gateEvaluationSchema.validate(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true
      });
      if (handleValidationError(payloadError, next)) {
        return;
      }

      const gate = await releaseOrchestrationService.recordGateEvaluation(
        params.publicId,
        params.gateKey,
        payload
      );

      if (!gate) {
        return res.status(404).json({ success: false, message: 'Release run not found' });
      }

      return success(res, {
        data: gate,
        message: 'Release gate evaluation recorded'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async evaluateRun(req, res, next) {
    try {
      const { value: params, error } = releaseIdParamsSchema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true
      });
      if (handleValidationError(error, next)) {
        return;
      }

      const result = await releaseOrchestrationService.evaluateRun(params.publicId);
      if (!result) {
        return res.status(404).json({ success: false, message: 'Release run not found' });
      }

      return success(res, {
        data: result,
        message: 'Release run evaluated'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getDashboard(req, res, next) {
    try {
      const { value, error } = dashboardQuerySchema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      if (handleValidationError(error, next)) {
        return;
      }

      const dashboard = await releaseOrchestrationService.getDashboard({ environment: value.environment });
      return success(res, {
        data: dashboard,
        message: 'Release readiness dashboard generated'
      });
    } catch (error) {
      return next(error);
    }
  }
}

