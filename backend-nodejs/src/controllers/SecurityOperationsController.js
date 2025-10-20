import securityOperationsService from '../services/SecurityOperationsService.js';

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
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
  return req.query?.tenantId ?? req.body?.tenantId ?? req.user?.tenantId ?? 'global';
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

function toNumber(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
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

export default class SecurityOperationsController {
  static async listRiskRegister(req, res, next) {
    try {
      const tenantId = resolveTenant(req);
      const payload = await securityOperationsService.listRiskRegister({
        tenantId,
        limit: toNumber(req.query?.limit, 20),
        offset: toNumber(req.query?.offset, 0),
        status: req.query?.status,
        category: req.query?.category,
        ownerId: req.query?.ownerId ? Number(req.query.ownerId) : undefined,
        tag: req.query?.tag,
        severity: req.query?.severity,
        includeClosed: req.query?.includeClosed !== 'false',
        sortBy: req.query?.sortBy,
        sortDirection: req.query?.sortDirection,
        search: req.query?.search
      });
      return res.json({ success: true, data: payload });
    } catch (error) {
      return next(error);
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
        category: req.body?.category,
        severity: req.body?.severity,
        likelihood: req.body?.likelihood,
        reviewCadenceDays,
        mitigationPlan,
        residualNotes,
        regulatoryDriver,
        detectionControls: req.body?.detectionControls,
        mitigationControls: req.body?.mitigationControls,
        tags: req.body?.tags,
        owner: req.body?.owner,
        metadata: ensurePlainObject(req.body?.metadata, {}),
        actor,
        requestContext: resolveRequestContext(req)
      });
      return res.status(201).json({ success: true, data: record });
    } catch (error) {
      return next(error);
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
      return next(error);
    }
  }

  static async deleteRisk(req, res, next) {
    try {
      const tenantId = resolveTenant(req);
      const actor = resolveActor(req);
      const parsedRiskId = requirePositiveInteger(req.params?.riskId, 'riskId');
      const reason = sanitiseOptionalText(req.body?.reason ?? req.query?.reason, { maxLength: 500 });

      const acknowledgement = await securityOperationsService.deleteRisk({
        riskId: parsedRiskId,
        tenantId,
        actor,
        reason,
        requestContext: resolveRequestContext(req)
      });

      return res.json({ success: true, data: acknowledgement });
    } catch (error) {
      if (error?.message?.toLowerCase().includes('not found')) {
        error.status = 404;
      }
      return next(error);
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
        evidenceReferences: req.body?.evidenceReferences,
        reviewer: req.body?.reviewer,
        nextReviewAt,
        reviewedAt,
        actor,
        requestContext: resolveRequestContext(req)
      });
      return res.status(201).json({ success: true, data: payload });
    } catch (error) {
      return next(error);
    }
  }

  static async listAuditEvidence(req, res, next) {
    try {
      const tenantId = resolveTenant(req);
      const payload = await securityOperationsService.listAuditEvidence({
        tenantId,
        framework: req.query?.framework,
        controlReference: req.query?.controlReference,
        riskId: req.query?.riskId ? Number(req.query.riskId) : undefined,
        status: req.query?.status,
        limit: toNumber(req.query?.limit, 20),
        offset: toNumber(req.query?.offset, 0)
      });
      return res.json({ success: true, data: payload });
    } catch (error) {
      return next(error);
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
        riskId: req.body?.riskId,
        framework,
        controlReference,
        evidenceType,
        storagePath,
        checksum,
        sources: req.body?.sources,
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
      return next(error);
    }
  }

  static async listContinuityExercises(req, res, next) {
    try {
      const tenantId = resolveTenant(req);
      const payload = await securityOperationsService.listContinuityExercises({
        tenantId,
        outcome: req.query?.outcome,
        ownerId: req.query?.ownerId ? Number(req.query.ownerId) : undefined,
        since: req.query?.since,
        limit: toNumber(req.query?.limit, 20),
        offset: toNumber(req.query?.offset, 0)
      });
      return res.json({ success: true, data: payload });
    } catch (error) {
      return next(error);
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
        rtoTargetMinutes: req.body?.rtoTargetMinutes,
        rpoTargetMinutes: req.body?.rpoTargetMinutes,
        actualRtoMinutes: req.body?.actualRtoMinutes,
        actualRpoMinutes: req.body?.actualRpoMinutes,
        outcome,
        lessonsLearned,
        followUpActions: req.body?.followUpActions,
        owner: req.body?.owner,
        metadata: ensurePlainObject(req.body?.metadata, {}),
        actor,
        requestContext: resolveRequestContext(req)
      });
      return res.status(201).json({ success: true, data: record });
    } catch (error) {
      return next(error);
    }
  }

  static async listAssessments(req, res, next) {
    try {
      const tenantId = resolveTenant(req);
      const payload = await securityOperationsService.listAssessments({
        tenantId,
        status: req.query?.status,
        assessmentType: req.query?.assessmentType,
        scheduledFrom: req.query?.scheduledFrom,
        scheduledTo: req.query?.scheduledTo,
        limit: toNumber(req.query?.limit, 20),
        offset: toNumber(req.query?.offset, 0)
      });
      return res.json({ success: true, data: payload });
    } catch (error) {
      return next(error);
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
        owner: req.body?.owner,
        scope,
        methodology,
        metadata: ensurePlainObject(req.body?.metadata, {}),
        actor,
        requestContext: resolveRequestContext(req)
      });
      return res.status(201).json({ success: true, data: assessment });
    } catch (error) {
      return next(error);
    }
  }
}
