import logger from '../config/logger.js';
import AuditEventService from './AuditEventService.js';
import changeDataCaptureService from './ChangeDataCaptureService.js';
import SecurityOperationsRepository from '../repositories/SecurityOperationsRepository.js';

const DEFAULT_REVIEW_CADENCE_DAYS = 90;
const SEVERITY_WEIGHTS = {
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4
};
const LIKELIHOOD_WEIGHTS = {
  rare: 1,
  unlikely: 2,
  possible: 3,
  likely: 4,
  almost_certain: 5
};

function coerceDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normaliseArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function normaliseOwner(owner) {
  if (!owner || typeof owner !== 'object') {
    return { type: 'team', id: null, displayName: null, email: null };
  }
  return {
    type: owner.type ?? 'team',
    id: owner.id ?? null,
    displayName: owner.displayName ?? null,
    email: owner.email ?? null
  };
}

function computeRiskScore(severity, likelihood) {
  const severityWeight = SEVERITY_WEIGHTS[(severity ?? '').toLowerCase()] ?? SEVERITY_WEIGHTS.moderate;
  const likelihoodWeight = LIKELIHOOD_WEIGHTS[(likelihood ?? '').toLowerCase()] ?? LIKELIHOOD_WEIGHTS.possible;
  const score = severityWeight * likelihoodWeight;
  return Math.round(score * 100) / 100;
}

function normaliseActor(actor) {
  if (!actor) {
    return { id: null, type: 'system', role: 'system' };
  }
  return {
    id: actor.id ?? null,
    type: actor.type ?? 'system',
    role: actor.role ?? 'system'
  };
}

function normaliseRequestContext(requestContext) {
  if (!requestContext || typeof requestContext !== 'object') {
    return {};
  }
  return {
    requestId: requestContext.requestId ?? null,
    traceId: requestContext.traceId ?? null,
    spanId: requestContext.spanId ?? null,
    ipAddress: requestContext.ipAddress ?? null,
    userAgent: requestContext.userAgent ?? null,
    method: requestContext.method ?? null,
    path: requestContext.path ?? null
  };
}

export class SecurityOperationsService {
  constructor({
    repository = new SecurityOperationsRepository(),
    auditLogger = new AuditEventService(),
    changeDataCapture = changeDataCaptureService,
    loggerInstance = logger.child({ module: 'security-ops-service' }),
    nowProvider = () => new Date()
  } = {}) {
    this.repository = repository;
    this.auditLogger = auditLogger;
    this.changeDataCapture = changeDataCapture;
    this.logger = loggerInstance;
    this.nowProvider = nowProvider;
  }

  async listRiskRegister({
    tenantId = 'global',
    limit,
    offset,
    status,
    category,
    ownerId,
    tag,
    severity,
    includeClosed,
    sortBy,
    sortDirection,
    search
  } = {}) {
    const [{ records, total }, summary] = await Promise.all([
      this.repository.listRisks({
        tenantId,
        limit,
        offset,
        status,
        category,
        ownerId,
        tag,
        severity,
        includeClosed,
        sortBy,
        sortDirection,
        search
      }),
      this.repository.fetchRiskSummary({ tenantId })
    ]);

    return {
      items: records,
      pagination: {
        total,
        limit: Math.max(Number(limit) || 20, 1),
        offset: Math.max(Number(offset) || 0, 0)
      },
      summary
    };
  }

  async createRiskEntry({
    tenantId = 'global',
    title,
    description,
    category,
    severity = 'moderate',
    likelihood = 'possible',
    reviewCadenceDays = DEFAULT_REVIEW_CADENCE_DAYS,
    mitigationPlan,
    residualNotes,
    regulatoryDriver,
    detectionControls,
    mitigationControls,
    tags,
    owner,
    actor,
    requestContext,
    metadata
  }) {
    if (!title || !description) {
      throw new Error('title and description are required to create a risk entry');
    }

    const now = this.nowProvider();
    const ownerDescriptor = normaliseOwner(owner);
    const riskPayload = {
      tenantId,
      title: title.trim(),
      description: description.trim(),
      category: category ?? 'operational',
      severity,
      likelihood,
      residualSeverity: severity,
      residualLikelihood: likelihood,
      inherentRiskScore: computeRiskScore(severity, likelihood),
      residualRiskScore: computeRiskScore(severity, likelihood),
      mitigationPlan: mitigationPlan ?? null,
      residualNotes: residualNotes ?? null,
      regulatoryDriver: regulatoryDriver ?? null,
      reviewCadenceDays: reviewCadenceDays ?? DEFAULT_REVIEW_CADENCE_DAYS,
      identifiedAt: now,
      owner: ownerDescriptor,
      tags: normaliseArray(tags),
      detectionControls: normaliseArray(detectionControls),
      mitigationControls: normaliseArray(mitigationControls),
      metadata: metadata ?? {}
    };

    const record = await this.repository.createRisk(riskPayload);

    await this.#recordAudit({
      eventType: 'risk.register.created',
      tenantId,
      entityId: record.riskUuid,
      actor,
      requestContext,
      metadata: {
        title: record.title,
        status: record.status,
        residualRiskScore: record.residualRiskScore,
        owner: record.owner,
        category: record.category
      }
    });

    await this.#recordCdc({
      entityName: 'security_risk_register',
      entityId: record.riskUuid,
      operation: 'INSERT',
      payload: {
        riskId: record.id,
        status: record.status,
        residualRiskScore: record.residualRiskScore
      }
    });

    return record;
  }

  async updateRiskStatus({
    riskId,
    tenantId = 'global',
    status,
    residualSeverity,
    residualLikelihood,
    residualNotes,
    mitigationPlan,
    nextReviewAt,
    actor,
    requestContext
  }) {
    if (!riskId) {
      throw new Error('riskId is required to update a risk status');
    }
    if (!status) {
      throw new Error('status is required to update a risk');
    }

    const existing = await this.repository.getRiskById(riskId);
    if (!existing) {
      throw new Error(`Risk ${riskId} was not found`);
    }

    const nextResidualSeverity = residualSeverity ?? existing.residualSeverity ?? existing.severity;
    const nextResidualLikelihood =
      residualLikelihood ?? existing.residualLikelihood ?? existing.likelihood;
    const residualRiskScore = computeRiskScore(nextResidualSeverity, nextResidualLikelihood);
    const reviewDate = coerceDate(nextReviewAt) ?? existing.nextReviewAt;
    const now = this.nowProvider();

    const statusUpdates = {};
    if (status === 'accepted' && !existing.acceptedAt) {
      statusUpdates.acceptedAt = now;
    }
    if (['mitigated', 'treated'].includes(status) && !existing.remediatedAt) {
      statusUpdates.remediatedAt = now;
    }
    if (['closed', 'retired'].includes(status)) {
      statusUpdates.closedAt = now;
    }

    const updated = await this.repository.updateRisk(riskId, {
      status,
      residualSeverity: nextResidualSeverity,
      residualLikelihood: nextResidualLikelihood,
      residualRiskScore,
      residualNotes: residualNotes ?? existing.residualNotes,
      mitigationPlan: mitigationPlan ?? existing.mitigationPlan,
      nextReviewAt: reviewDate,
      ...statusUpdates
    });

    await this.#recordAudit({
      eventType: 'risk.register.updated',
      tenantId,
      entityId: updated.riskUuid,
      actor,
      requestContext,
      metadata: {
        status: updated.status,
        residualRiskScore: updated.residualRiskScore,
        nextReviewAt: updated.nextReviewAt,
        residualSeverity: updated.residualSeverity,
        residualLikelihood: updated.residualLikelihood
      }
    });

    await this.#recordCdc({
      entityName: 'security_risk_register',
      entityId: updated.riskUuid,
      operation: 'UPDATE',
      payload: {
        riskId: updated.id,
        status: updated.status,
        residualRiskScore: updated.residualRiskScore
      }
    });

    return updated;
  }

  async recordRiskReview({
    riskId,
    tenantId = 'global',
    status,
    residualSeverity,
    residualLikelihood,
    notes,
    evidenceReferences,
    reviewer,
    nextReviewAt,
    reviewedAt,
    actor,
    requestContext
  }) {
    if (!riskId) {
      throw new Error('riskId is required to record a review');
    }

    const risk = await this.repository.getRiskById(riskId);
    if (!risk) {
      throw new Error(`Risk ${riskId} was not found`);
    }

    const reviewDate = coerceDate(reviewedAt) ?? this.nowProvider();
    const calculatedResidualSeverity = residualSeverity ?? risk.residualSeverity ?? risk.severity;
    const calculatedResidualLikelihood =
      residualLikelihood ?? risk.residualLikelihood ?? risk.likelihood;
    const residualRiskScore = computeRiskScore(
      calculatedResidualSeverity,
      calculatedResidualLikelihood
    );
    const derivedNextReview =
      coerceDate(nextReviewAt) ??
      new Date(
        reviewDate.getTime() + (risk.reviewCadenceDays ?? DEFAULT_REVIEW_CADENCE_DAYS) * 24 * 60 * 60 * 1000
      );

    const reviewRecord = await this.repository.createRiskReview({
      riskId,
      status: status ?? 'in_review',
      residualSeverity: calculatedResidualSeverity,
      residualLikelihood: calculatedResidualLikelihood,
      residualRiskScore,
      notes: notes ?? null,
      evidenceReferences: evidenceReferences ?? [],
      reviewerId: reviewer?.id ?? actor?.id ?? null,
      reviewerName: reviewer?.displayName ?? reviewer?.name ?? null,
      reviewerEmail: reviewer?.email ?? null,
      reviewedAt: reviewDate,
      nextReviewAt: derivedNextReview
    });

    const updated = await this.repository.updateRisk(riskId, {
      status: reviewRecord.status,
      residualSeverity: calculatedResidualSeverity,
      residualLikelihood: calculatedResidualLikelihood,
      residualRiskScore,
      residualNotes: notes ?? risk.residualNotes,
      lastReviewedAt: reviewDate,
      nextReviewAt: derivedNextReview
    });

    await this.#recordAudit({
      eventType: 'risk.register.reviewed',
      tenantId,
      entityId: updated.riskUuid,
      actor,
      requestContext,
      metadata: {
        reviewId: reviewRecord.reviewUuid,
        status: reviewRecord.status,
        residualRiskScore: reviewRecord.residualRiskScore,
        nextReviewAt: reviewRecord.nextReviewAt,
        reviewer: {
          id: reviewRecord.reviewerId,
          name: reviewRecord.reviewerName,
          email: reviewRecord.reviewerEmail
        }
      }
    });

    await this.#recordCdc({
      entityName: 'security_risk_reviews',
      entityId: reviewRecord.reviewUuid,
      operation: 'INSERT',
      payload: {
        riskId: updated.id,
        reviewId: reviewRecord.reviewUuid,
        status: reviewRecord.status,
        residualRiskScore: reviewRecord.residualRiskScore
      }
    });

    return {
      review: reviewRecord,
      risk: updated
    };
  }

  async deleteRisk({ riskId, tenantId = 'global', actor, reason, requestContext } = {}) {
    if (!riskId) {
      throw new Error('riskId is required to delete a risk');
    }

    const risk = await this.repository.getRiskById(riskId);
    if (!risk) {
      throw new Error(`Risk ${riskId} was not found`);
    }

    await this.repository.deleteRisk(riskId);

    await this.#recordAudit({
      eventType: 'risk.register.deleted',
      tenantId: tenantId ?? risk.tenantId ?? 'global',
      entityId: risk.riskUuid,
      actor,
      requestContext,
      metadata: {
        title: risk.title,
        residualRiskScore: risk.residualRiskScore,
        status: risk.status,
        reason: reason ?? null
      }
    });

    await this.#recordCdc({
      entityName: 'security_risk_register',
      entityId: risk.riskUuid,
      operation: 'DELETE',
      payload: {
        riskId: risk.id,
        status: risk.status,
        residualRiskScore: risk.residualRiskScore,
        reason: reason ?? null
      }
    });

    return { success: true };
  }

  async listAuditEvidence(params = {}) {
    return this.repository.listEvidence(params);
  }

  async recordAuditEvidence({
    tenantId = 'global',
    riskId,
    framework,
    controlReference,
    evidenceType,
    storagePath,
    checksum,
    sources,
    capturedAt,
    expiresAt,
    status,
    submittedBy,
    submittedByEmail,
    description,
    metadata,
    actor,
    requestContext
  }) {
    if (!storagePath) {
      throw new Error('storagePath is required when recording audit evidence');
    }

    const evidence = await this.repository.createEvidence({
      tenantId,
      riskId,
      framework,
      controlReference,
      evidenceType,
      storagePath,
      checksum,
      sources: normaliseArray(sources),
      capturedAt: coerceDate(capturedAt) ?? this.nowProvider(),
      expiresAt: coerceDate(expiresAt),
      status,
      submittedBy,
      submittedByEmail,
      description,
      metadata
    });

    await this.#recordAudit({
      eventType: 'risk.evidence.recorded',
      tenantId,
      entityId: evidence.evidenceUuid,
      actor,
      requestContext,
      metadata: {
        riskId: evidence.riskId,
        framework: evidence.framework,
        controlReference: evidence.controlReference,
        status: evidence.status
      }
    });

    await this.#recordCdc({
      entityName: 'security_audit_evidence',
      entityId: evidence.evidenceUuid,
      operation: 'INSERT',
      payload: {
        riskId: evidence.riskId,
        framework: evidence.framework,
        controlReference: evidence.controlReference
      }
    });

    return evidence;
  }

  async listContinuityExercises(params = {}) {
    const [{ records, total }, summary] = await Promise.all([
      this.repository.listContinuityExercises(params),
      this.repository.fetchContinuitySummary({ tenantId: params.tenantId ?? 'global' })
    ]);

    return {
      items: records,
      pagination: {
        total,
        limit: Math.max(Number(params.limit) || 20, 1),
        offset: Math.max(Number(params.offset) || 0, 0)
      },
      summary
    };
  }

  async logContinuityExercise({
    tenantId = 'global',
    scenarioKey,
    scenarioSummary,
    exerciseType,
    startedAt,
    completedAt,
    rtoTargetMinutes,
    rpoTargetMinutes,
    actualRtoMinutes,
    actualRpoMinutes,
    outcome,
    lessonsLearned,
    followUpActions,
    owner,
    metadata,
    actor,
    requestContext
  }) {
    if (!scenarioKey || !scenarioSummary) {
      throw new Error('scenarioKey and scenarioSummary are required for continuity exercises');
    }

    const exercise = await this.repository.createContinuityExercise({
      tenantId,
      scenarioKey,
      scenarioSummary,
      exerciseType,
      startedAt: coerceDate(startedAt) ?? this.nowProvider(),
      completedAt: coerceDate(completedAt),
      rtoTargetMinutes,
      rpoTargetMinutes,
      actualRtoMinutes,
      actualRpoMinutes,
      outcome,
      lessonsLearned,
      followUpActions: normaliseArray(followUpActions),
      owner: normaliseOwner(owner),
      metadata
    });

    await this.#recordAudit({
      eventType: 'continuity.exercise.logged',
      tenantId,
      entityId: exercise.exerciseUuid,
      actor,
      requestContext,
      metadata: {
        scenarioKey: exercise.scenarioKey,
        outcome: exercise.outcome,
        followUpActions: exercise.followUpActions.length
      }
    });

    await this.#recordCdc({
      entityName: 'security_continuity_exercises',
      entityId: exercise.exerciseUuid,
      operation: 'INSERT',
      payload: {
        scenarioKey: exercise.scenarioKey,
        outcome: exercise.outcome,
        followUpActions: exercise.followUpActions.length
      }
    });

    return exercise;
  }

  async listAssessments(params = {}) {
    return this.repository.listAssessments(params);
  }

  async scheduleAssessment({
    tenantId = 'global',
    assessmentType,
    scheduledFor,
    status,
    owner,
    scope,
    methodology,
    metadata,
    actor,
    requestContext
  }) {
    if (!assessmentType) {
      throw new Error('assessmentType is required to schedule an assessment');
    }
    if (!scheduledFor) {
      throw new Error('scheduledFor is required to schedule an assessment');
    }

    const assessment = await this.repository.createAssessment({
      tenantId,
      assessmentType,
      scheduledFor: coerceDate(scheduledFor),
      status,
      owner: normaliseOwner(owner),
      scope,
      methodology,
      metadata
    });

    await this.#recordAudit({
      eventType: 'security.assessment.scheduled',
      tenantId,
      entityId: assessment.assessmentUuid,
      actor,
      requestContext,
      metadata: {
        assessmentType: assessment.assessmentType,
        scheduledFor: assessment.scheduledFor,
        owner: assessment.owner
      }
    });

    await this.#recordCdc({
      entityName: 'security_security_assessments',
      entityId: assessment.assessmentUuid,
      operation: 'INSERT',
      payload: {
        assessmentId: assessment.id,
        assessmentType: assessment.assessmentType,
        scheduledFor: assessment.scheduledFor
      }
    });

    return assessment;
  }

  async #recordAudit({ eventType, tenantId, entityId, actor, requestContext, metadata }) {
    if (!this.auditLogger || typeof this.auditLogger.record !== 'function') {
      return;
    }
    try {
      await this.auditLogger.record({
        eventType,
        entityType: 'security_risk',
        entityId: entityId ?? 'unknown',
        severity: 'notice',
        actor: normaliseActor(actor),
        metadata,
        tenantId,
        requestContext: normaliseRequestContext(requestContext)
      });
    } catch (error) {
      this.logger.warn({ error, eventType, entityId }, 'Failed to record security operations audit event');
    }
  }

  async #recordCdc({ entityName, entityId, operation, payload }) {
    if (!this.changeDataCapture || typeof this.changeDataCapture.recordEvent !== 'function') {
      return;
    }
    try {
      await this.changeDataCapture.recordEvent({
        domain: 'security',
        entityName,
        entityId: entityId ?? 'unknown',
        operation,
        payload
      });
    } catch (error) {
      this.logger.warn({ error, entityName, entityId }, 'Failed to record security CDC event');
    }
  }
}

const defaultService = new SecurityOperationsService();

export default defaultService;
