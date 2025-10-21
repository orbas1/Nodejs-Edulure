import Joi from 'joi';
import createHttpError from 'http-errors';

import securityOperationsService from '../services/SecurityOperationsService.js';

const BOOLEAN_TRUE_VALUES = new Set(['true', '1', 'yes', 'y', 'on']);
const BOOLEAN_FALSE_VALUES = new Set(['false', '0', 'no', 'n', 'off']);
const RISK_SORT_FIELDS = new Map([
  ['residualrisk', 'residualRisk'],
  ['inherentrisk', 'inherentRisk'],
  ['updatedat', 'updatedAt'],
  ['createdat', 'createdAt'],
  ['nextreviewat', 'nextReviewAt'],
  ['status', 'status']
]);

const riskIdParamSchema = Joi.object({
  riskId: Joi.number().integer().positive().required()
});

const deleteRiskSchema = Joi.object({
  reason: Joi.string().trim().max(240).allow('', null).default(null)
});

function resolveStatus(error, fallback = 500) {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const candidates = [error.status, error.statusCode, error.httpStatus, error.response?.status];
  const resolved = candidates.find((value) => Number.isInteger(value));
  return resolved ?? fallback;
}

function formatErrorMessage(error, fallback = 'Unexpected security operations error') {
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error?.response?.data?.message === 'string' && error.response.data.message.trim()) {
    return error.response.data.message.trim();
  }
  return fallback;
}

function handleValidationError(error, res) {
  if (!error?.isJoi) {
    return false;
  }

  const details = Array.isArray(error.details)
    ? error.details.map((detail) => detail.message ?? String(detail))
    : [];

  res.status(422).json({
    success: false,
    error: {
      message: details[0] ?? 'Validation failed',
      details
    }
  });

  return true;
}

function handleControllerError(error, res, next) {
  if (handleValidationError(error, res)) {
    return true;
  }

  const status = resolveStatus(error);
  const message = formatErrorMessage(error);

  if (status >= 500) {
    next(error);
    return true;
  }

  res.status(status).json({ success: false, error: message });
  return true;
}

function resolveActor(req) {
  if (!req.user) {
    return { id: null, role: 'system', type: 'system' };
  }
  return {
    id: req.user.id ?? null,
    role: req.user.role ?? 'user',
    type: req.user.type ?? 'user',
    email: req.user.email ?? null,
    name: req.user.name ?? null
  };
}

function resolveTenant(req) {
  const candidate =
    req.query?.tenantId ?? req.body?.tenantId ?? req.user?.tenantId ?? 'global';
  return sanitiseOptionalText(candidate, { maxLength: 100 }) ?? 'global';
}

function resolveRequestContext(req) {
  return {
    requestId: req.id ?? req.headers?.['x-request-id'] ?? null,
    traceId: req.traceId ?? null,
    spanId: req.spanId ?? null,
    ipAddress: req.ip ?? null,
    userAgent: req.headers?.['user-agent'] ?? null,
    method: req.method ?? null,
    path: req.originalUrl ?? req.url ?? null
  };
}

function sanitiseOptionalText(input, { maxLength = 500 } = {}) {
  if (input === undefined || input === null) {
    return null;
  }

  const candidate = Array.isArray(input) ? input[0] : input;
  if (candidate === undefined || candidate === null) {
    return null;
  }

  const text = String(candidate).trim();
  if (!text) {
    return null;
  }

  return text.slice(0, maxLength);
}

function sanitiseRequiredText(input, fieldName, options) {
  const value = sanitiseOptionalText(input, options);
  if (!value) {
    throw createHttpError(400, `${fieldName} is required`);
  }
  return value;
}

function requirePositiveInteger(value, fieldName) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw createHttpError(400, `${fieldName} must be a positive integer`);
  }
  return numeric;
}

function parseOptionalPositiveInteger(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw createHttpError(400, `${fieldName} must be a positive integer`);
  }
  return numeric;
}

function parseOptionalNonNegativeInteger(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw createHttpError(400, `${fieldName} must be a non-negative integer`);
  }
  return numeric;
}

function parseLimit(value, fallback = 20, { max = 100 } = {}) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw createHttpError(400, `limit must be a positive integer not exceeding ${max}`);
  }
  if (numeric > max) {
    throw createHttpError(400, `limit must be a positive integer not exceeding ${max}`);
  }
  return numeric;
}

function parseOffset(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw createHttpError(400, 'offset must be a non-negative integer');
  }
  return numeric;
}

function parseOptionalBoolean(value, fallback, fieldName) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalised = String(value).trim().toLowerCase();
  if (BOOLEAN_TRUE_VALUES.has(normalised)) {
    return true;
  }
  if (BOOLEAN_FALSE_VALUES.has(normalised)) {
    return false;
  }
  throw createHttpError(400, `${fieldName} must be a boolean value`);
}

function parseOptionalDate(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw createHttpError(400, `${fieldName} must be a valid date`);
    }
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createHttpError(400, `${fieldName} must be a valid date`);
  }
  return parsed;
}

function ensurePlainObject(value, fallback = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback;
  }
  return value;
}

function sanitiseOptionalStringArray(value, { maxItems = 50, maxItemLength = 500 } = {}) {
  if (!value && value !== 0) {
    return undefined;
  }

  const entries = Array.isArray(value) ? value : [value];
  const sanitised = entries
    .map((entry) => sanitiseOptionalText(entry, { maxLength: maxItemLength }))
    .filter(Boolean);

  if (!sanitised.length) {
    return undefined;
  }

  return sanitised.slice(0, maxItems);
}

function resolveSortField(value) {
  const text = sanitiseOptionalText(value, { maxLength: 50 });
  if (!text) {
    return undefined;
  }
  const key = text.replace(/[^a-z]/gi, '').toLowerCase();
  const resolved = RISK_SORT_FIELDS.get(key);
  if (!resolved) {
    throw createHttpError(
      400,
      'sortBy must be one of residualRisk, inherentRisk, updatedAt, createdAt, nextReviewAt, status'
    );
  }
  return resolved;
}

function resolveSortDirection(value) {
  const text = sanitiseOptionalText(value, { maxLength: 4 });
  if (!text) {
    return undefined;
  }
  const direction = text.toLowerCase();
  if (direction !== 'asc' && direction !== 'desc') {
    throw createHttpError(400, 'sortDirection must be either asc or desc');
  }
  return direction;
}

export default class SecurityOperationsController {
  static async listRiskRegister(req, res, next) {
    try {
      const tenantId = resolveTenant(req);
      const payload = await securityOperationsService.listRiskRegister({
        tenantId,
        limit: parseLimit(req.query?.limit),
        offset: parseOffset(req.query?.offset),
        status: sanitiseOptionalText(req.query?.status, { maxLength: 100 }),
        category: sanitiseOptionalText(req.query?.category, { maxLength: 100 }),
        ownerId: parseOptionalPositiveInteger(req.query?.ownerId, 'ownerId'),
        tag: sanitiseOptionalText(req.query?.tag, { maxLength: 100 }),
        severity: sanitiseOptionalText(req.query?.severity, { maxLength: 100 }),
        includeClosed: parseOptionalBoolean(req.query?.includeClosed, true, 'includeClosed'),
        sortBy: resolveSortField(req.query?.sortBy),
        sortDirection: resolveSortDirection(req.query?.sortDirection),
        search: sanitiseOptionalText(req.query?.search, { maxLength: 200 })
      });
      return res.json({ success: true, data: payload });
    } catch (error) {
      return handleControllerError(error, res, next);
    }
  }

  static async createRiskEntry(req, res, next) {
    try {
      const tenantId = resolveTenant(req);
      const actor = resolveActor(req);
      const title = sanitiseRequiredText(req.body?.title, 'title', { maxLength: 300 });
      const description = sanitiseRequiredText(req.body?.description, 'description', { maxLength: 5000 });
      const mitigationPlan = sanitiseOptionalText(req.body?.mitigationPlan, { maxLength: 5000 });
      const residualNotes = sanitiseOptionalText(req.body?.residualNotes, { maxLength: 5000 });
      const regulatoryDriver = sanitiseOptionalText(req.body?.regulatoryDriver, { maxLength: 500 });
      const reviewCadence = req.body?.reviewCadenceDays;
      let reviewCadenceDays;
      if (reviewCadence !== undefined) {
        const cadenceNumber = Number(reviewCadence);
        if (!Number.isFinite(cadenceNumber) || cadenceNumber <= 0) {
          throw createHttpError(400, 'reviewCadenceDays must be a positive number');
        }
        reviewCadenceDays = Math.trunc(cadenceNumber);
      }

      const record = await securityOperationsService.createRiskEntry({
        tenantId,
        title,
        description,
        category: sanitiseOptionalText(req.body?.category, { maxLength: 100 }),
        severity: sanitiseOptionalText(req.body?.severity, { maxLength: 100 }),
        likelihood: sanitiseOptionalText(req.body?.likelihood, { maxLength: 100 }),
        reviewCadenceDays,
        mitigationPlan,
        residualNotes,
        regulatoryDriver,
        detectionControls: sanitiseOptionalStringArray(req.body?.detectionControls, {
          maxItems: 50,
          maxItemLength: 200
        }),
        mitigationControls: sanitiseOptionalStringArray(req.body?.mitigationControls, {
          maxItems: 50,
          maxItemLength: 200
        }),
        tags: sanitiseOptionalStringArray(req.body?.tags, { maxItems: 50, maxItemLength: 100 }),
        owner: ensurePlainObject(req.body?.owner, {}),
        metadata: ensurePlainObject(req.body?.metadata, {}),
        actor,
        requestContext: resolveRequestContext(req)
      });
      return res.status(201).json({ success: true, data: record });
    } catch (error) {
      return handleControllerError(error, res, next);
    }
  }

  static async updateRiskStatus(req, res, next) {
    try {
      const tenantId = resolveTenant(req);
      const actor = resolveActor(req);
      const riskId = requirePositiveInteger(req.params?.riskId, 'riskId');
      const status = sanitiseRequiredText(req.body?.status, 'status', { maxLength: 100 });
      const residualNotes = sanitiseOptionalText(req.body?.residualNotes, { maxLength: 5000 });
      const mitigationPlan = sanitiseOptionalText(req.body?.mitigationPlan, { maxLength: 5000 });
      const nextReviewAt = parseOptionalDate(req.body?.nextReviewAt, 'nextReviewAt');
      const updated = await securityOperationsService.updateRiskStatus({
        riskId,
        tenantId,
        status,
        residualSeverity: req.body?.residualSeverity,
        residualLikelihood: req.body?.residualLikelihood,
        residualNotes,
        mitigationPlan,
        nextReviewAt,
        actor,
        requestContext: resolveRequestContext(req)
      });
      return res.json({ success: true, data: updated });
    } catch (error) {
      return handleControllerError(error, res, next);
    }
  }

  static async deleteRisk(req, res, next) {
    try {
      const tenantId = resolveTenant(req);
      const actor = resolveActor(req);

      const [{ riskId }, { reason }] = await Promise.all([
        riskIdParamSchema.validateAsync(req.params ?? {}, { abortEarly: false, convert: true }),
        deleteRiskSchema.validateAsync(
          {
            reason: req.body?.reason ?? req.query?.reason ?? null
          },
          { abortEarly: false, stripUnknown: true }
        )
      ]);

      const result = await securityOperationsService.deleteRisk({
        riskId,
        tenantId,
        reason: reason === '' ? null : reason,
        actor,
        requestContext: resolveRequestContext(req)
      });

      return res.json({ success: true, data: result });
    } catch (error) {
      return handleControllerError(error, res, next);
    }
  }

  static async recordRiskReview(req, res, next) {
    try {
      const tenantId = resolveTenant(req);
      const actor = resolveActor(req);
      const riskId = requirePositiveInteger(req.params?.riskId, 'riskId');
      const status = sanitiseOptionalText(req.body?.status, { maxLength: 100 });
      const notes = sanitiseOptionalText(req.body?.notes, { maxLength: 5000 });
      const nextReviewAt = parseOptionalDate(req.body?.nextReviewAt, 'nextReviewAt');
      const reviewedAt = parseOptionalDate(req.body?.reviewedAt, 'reviewedAt');
      const payload = await securityOperationsService.recordRiskReview({
        riskId,
        tenantId,
        status,
        residualSeverity: req.body?.residualSeverity,
        residualLikelihood: req.body?.residualLikelihood,
        notes,
        evidenceReferences: sanitiseOptionalStringArray(req.body?.evidenceReferences, {
          maxItems: 50,
          maxItemLength: 500
        }),
        reviewer: ensurePlainObject(req.body?.reviewer, {}),
        nextReviewAt,
        reviewedAt,
        actor,
        requestContext: resolveRequestContext(req)
      });
      return res.status(201).json({ success: true, data: payload });
    } catch (error) {
      return handleControllerError(error, res, next);
    }
  }

  static async listAuditEvidence(req, res, next) {
    try {
      const tenantId = resolveTenant(req);
      const payload = await securityOperationsService.listAuditEvidence({
        tenantId,
        framework: sanitiseOptionalText(req.query?.framework, { maxLength: 200 }),
        controlReference: sanitiseOptionalText(req.query?.controlReference, { maxLength: 200 }),
        riskId: parseOptionalPositiveInteger(req.query?.riskId, 'riskId'),
        status: sanitiseOptionalText(req.query?.status, { maxLength: 100 }),
        limit: parseLimit(req.query?.limit),
        offset: parseOffset(req.query?.offset)
      });
      return res.json({ success: true, data: payload });
    } catch (error) {
      return handleControllerError(error, res, next);
    }
  }

  static async recordAuditEvidence(req, res, next) {
    try {
      const tenantId = resolveTenant(req);
      const actor = resolveActor(req);
      const storagePath = sanitiseRequiredText(req.body?.storagePath, 'storagePath', { maxLength: 1024 });
      const framework = sanitiseOptionalText(req.body?.framework, { maxLength: 200 });
      const controlReference = sanitiseOptionalText(req.body?.controlReference, { maxLength: 200 });
      const evidenceType = sanitiseOptionalText(req.body?.evidenceType, { maxLength: 200 });
      const checksum = sanitiseOptionalText(req.body?.checksum, { maxLength: 512 });
      const description = sanitiseOptionalText(req.body?.description, { maxLength: 5000 });
      const capturedAt = parseOptionalDate(req.body?.capturedAt, 'capturedAt');
      const expiresAt = parseOptionalDate(req.body?.expiresAt, 'expiresAt');
      const evidence = await securityOperationsService.recordAuditEvidence({
        tenantId,
        riskId: parseOptionalPositiveInteger(req.body?.riskId, 'riskId'),
        framework,
        controlReference,
        evidenceType,
        storagePath,
        checksum,
        sources: sanitiseOptionalStringArray(req.body?.sources, { maxItems: 50, maxItemLength: 200 }),
        capturedAt,
        expiresAt,
        status: req.body?.status,
        submittedBy: req.body?.submittedBy,
        submittedByEmail: req.body?.submittedByEmail,
        description,
        metadata: ensurePlainObject(req.body?.metadata, {}),
        actor,
        requestContext: resolveRequestContext(req)
      });
      return res.status(201).json({ success: true, data: evidence });
    } catch (error) {
      return handleControllerError(error, res, next);
    }
  }

  static async listContinuityExercises(req, res, next) {
    try {
      const tenantId = resolveTenant(req);
      const payload = await securityOperationsService.listContinuityExercises({
        tenantId,
        outcome: sanitiseOptionalText(req.query?.outcome, { maxLength: 200 }),
        ownerId: parseOptionalPositiveInteger(req.query?.ownerId, 'ownerId'),
        since: parseOptionalDate(req.query?.since, 'since'),
        limit: parseLimit(req.query?.limit),
        offset: parseOffset(req.query?.offset)
      });
      return res.json({ success: true, data: payload });
    } catch (error) {
      return handleControllerError(error, res, next);
    }
  }

  static async logContinuityExercise(req, res, next) {
    try {
      const tenantId = resolveTenant(req);
      const actor = resolveActor(req);
      const scenarioKey = sanitiseRequiredText(req.body?.scenarioKey, 'scenarioKey', { maxLength: 200 });
      const scenarioSummary = sanitiseRequiredText(req.body?.scenarioSummary, 'scenarioSummary', { maxLength: 2000 });
      const exerciseType = sanitiseOptionalText(req.body?.exerciseType, { maxLength: 200 });
      const outcome = sanitiseOptionalText(req.body?.outcome, { maxLength: 200 });
      const lessonsLearned = sanitiseOptionalText(req.body?.lessonsLearned, { maxLength: 5000 });
      const record = await securityOperationsService.logContinuityExercise({
        tenantId,
        scenarioKey,
        scenarioSummary,
        exerciseType,
        startedAt: parseOptionalDate(req.body?.startedAt, 'startedAt'),
        completedAt: parseOptionalDate(req.body?.completedAt, 'completedAt'),
        rtoTargetMinutes: parseOptionalNonNegativeInteger(req.body?.rtoTargetMinutes, 'rtoTargetMinutes'),
        rpoTargetMinutes: parseOptionalNonNegativeInteger(req.body?.rpoTargetMinutes, 'rpoTargetMinutes'),
        actualRtoMinutes: parseOptionalNonNegativeInteger(req.body?.actualRtoMinutes, 'actualRtoMinutes'),
        actualRpoMinutes: parseOptionalNonNegativeInteger(req.body?.actualRpoMinutes, 'actualRpoMinutes'),
        outcome,
        lessonsLearned,
        followUpActions: sanitiseOptionalStringArray(req.body?.followUpActions, {
          maxItems: 50,
          maxItemLength: 500
        }),
        owner: ensurePlainObject(req.body?.owner, {}),
        metadata: ensurePlainObject(req.body?.metadata, {}),
        actor,
        requestContext: resolveRequestContext(req)
      });
      return res.status(201).json({ success: true, data: record });
    } catch (error) {
      return handleControllerError(error, res, next);
    }
  }

  static async listAssessments(req, res, next) {
    try {
      const tenantId = resolveTenant(req);
      const payload = await securityOperationsService.listAssessments({
        tenantId,
        status: sanitiseOptionalText(req.query?.status, { maxLength: 100 }),
        assessmentType: sanitiseOptionalText(req.query?.assessmentType, { maxLength: 200 }),
        scheduledFrom: parseOptionalDate(req.query?.scheduledFrom, 'scheduledFrom'),
        scheduledTo: parseOptionalDate(req.query?.scheduledTo, 'scheduledTo'),
        limit: parseLimit(req.query?.limit),
        offset: parseOffset(req.query?.offset)
      });
      return res.json({ success: true, data: payload });
    } catch (error) {
      return handleControllerError(error, res, next);
    }
  }

  static async scheduleAssessment(req, res, next) {
    try {
      const tenantId = resolveTenant(req);
      const actor = resolveActor(req);
      const assessmentType = sanitiseRequiredText(req.body?.assessmentType, 'assessmentType', { maxLength: 200 });
      const scheduledFor = parseOptionalDate(req.body?.scheduledFor, 'scheduledFor');
      if (!scheduledFor) {
        throw createHttpError(400, 'scheduledFor is required');
      }
      const status = sanitiseOptionalText(req.body?.status, { maxLength: 200 });
      const scope = sanitiseOptionalText(req.body?.scope, { maxLength: 5000 });
      const methodology = sanitiseOptionalText(req.body?.methodology, { maxLength: 5000 });
      const assessment = await securityOperationsService.scheduleAssessment({
        tenantId,
        assessmentType,
        scheduledFor,
        status,
        owner: ensurePlainObject(req.body?.owner, {}),
        scope,
        methodology,
        metadata: ensurePlainObject(req.body?.metadata, {}),
        actor,
        requestContext: resolveRequestContext(req)
      });
      return res.status(201).json({ success: true, data: assessment });
    } catch (error) {
      return handleControllerError(error, res, next);
    }
  }
}
