import Joi from 'joi';

import securityOperationsService from '../services/SecurityOperationsService.js';

const riskIdParamSchema = Joi.object({
  riskId: Joi.number().integer().positive().required()
});

const deleteRiskSchema = Joi.object({
  reason: Joi.string().trim().max(240).allow('', null).default(null)
});

function handleValidationError(error, next) {
  if (error.isJoi) {
    error.status = 422;
    error.details = error.details.map((detail) => detail.message);
  }
  return next(error);
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
      const record = await securityOperationsService.createRiskEntry({
        tenantId,
        title: req.body?.title,
        description: req.body?.description,
        category: req.body?.category,
        severity: req.body?.severity,
        likelihood: req.body?.likelihood,
        reviewCadenceDays: req.body?.reviewCadenceDays,
        mitigationPlan: req.body?.mitigationPlan,
        residualNotes: req.body?.residualNotes,
        regulatoryDriver: req.body?.regulatoryDriver,
        detectionControls: req.body?.detectionControls,
        mitigationControls: req.body?.mitigationControls,
        tags: req.body?.tags,
        owner: req.body?.owner,
        metadata: req.body?.metadata,
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
      const { riskId } = req.params;
      const updated = await securityOperationsService.updateRiskStatus({
        riskId: Number(riskId),
        tenantId,
        status: req.body?.status,
        residualSeverity: req.body?.residualSeverity,
        residualLikelihood: req.body?.residualLikelihood,
        residualNotes: req.body?.residualNotes,
        mitigationPlan: req.body?.mitigationPlan,
        nextReviewAt: req.body?.nextReviewAt,
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
      return handleValidationError(error, next);
    }
  }

  static async recordRiskReview(req, res, next) {
    try {
      const tenantId = resolveTenant(req);
      const actor = resolveActor(req);
      const { riskId } = req.params;
      const payload = await securityOperationsService.recordRiskReview({
        riskId: Number(riskId),
        tenantId,
        status: req.body?.status,
        residualSeverity: req.body?.residualSeverity,
        residualLikelihood: req.body?.residualLikelihood,
        notes: req.body?.notes,
        evidenceReferences: req.body?.evidenceReferences,
        reviewer: req.body?.reviewer,
        nextReviewAt: req.body?.nextReviewAt,
        reviewedAt: req.body?.reviewedAt,
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
      const evidence = await securityOperationsService.recordAuditEvidence({
        tenantId,
        riskId: req.body?.riskId,
        framework: req.body?.framework,
        controlReference: req.body?.controlReference,
        evidenceType: req.body?.evidenceType,
        storagePath: req.body?.storagePath,
        checksum: req.body?.checksum,
        sources: req.body?.sources,
        capturedAt: req.body?.capturedAt,
        expiresAt: req.body?.expiresAt,
        status: req.body?.status,
        submittedBy: req.body?.submittedBy,
        submittedByEmail: req.body?.submittedByEmail,
        description: req.body?.description,
        metadata: req.body?.metadata,
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
      const record = await securityOperationsService.logContinuityExercise({
        tenantId,
        scenarioKey: req.body?.scenarioKey,
        scenarioSummary: req.body?.scenarioSummary,
        exerciseType: req.body?.exerciseType,
        startedAt: req.body?.startedAt,
        completedAt: req.body?.completedAt,
        rtoTargetMinutes: req.body?.rtoTargetMinutes,
        rpoTargetMinutes: req.body?.rpoTargetMinutes,
        actualRtoMinutes: req.body?.actualRtoMinutes,
        actualRpoMinutes: req.body?.actualRpoMinutes,
        outcome: req.body?.outcome,
        lessonsLearned: req.body?.lessonsLearned,
        followUpActions: req.body?.followUpActions,
        owner: req.body?.owner,
        metadata: req.body?.metadata,
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
      const assessment = await securityOperationsService.scheduleAssessment({
        tenantId,
        assessmentType: req.body?.assessmentType,
        scheduledFor: req.body?.scheduledFor,
        status: req.body?.status,
        owner: req.body?.owner,
        scope: req.body?.scope,
        methodology: req.body?.methodology,
        metadata: req.body?.metadata,
        actor,
        requestContext: resolveRequestContext(req)
      });
      return res.status(201).json({ success: true, data: assessment });
    } catch (error) {
      return next(error);
    }
  }
}
