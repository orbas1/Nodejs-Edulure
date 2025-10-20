import crypto from 'crypto';

import db from '../config/database.js';
import logger from '../config/logger.js';
import { TABLES as SECURITY_TABLES } from '../database/domains/security.js';

function parseJson(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }

  if (typeof value === 'object') {
    return value;
  }

  return fallback;
}

function serializeJson(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch (_error) {
      return JSON.stringify(value.split(',').map((item) => item.trim()).filter(Boolean));
    }
  }

  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value);
  }

  return fallback;
}

function mapRiskRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    riskUuid: row.risk_uuid,
    tenantId: row.tenant_id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    severity: row.severity,
    likelihood: row.likelihood,
    residualSeverity: row.residual_severity,
    residualLikelihood: row.residual_likelihood,
    inherentRiskScore: Number(row.inherent_risk_score ?? 0),
    residualRiskScore: Number(row.residual_risk_score ?? 0),
    mitigationPlan: row.mitigation_plan,
    residualNotes: row.residual_notes,
    regulatoryDriver: row.regulatory_driver,
    reviewCadenceDays: row.review_cadence_days,
    identifiedAt: row.identified_at,
    acceptedAt: row.accepted_at,
    remediatedAt: row.remediated_at,
    closedAt: row.closed_at,
    lastReviewedAt: row.last_reviewed_at,
    nextReviewAt: row.next_review_at,
    owner: {
      type: row.owner_type,
      id: row.owner_id,
      displayName: row.owner_display_name,
      email: row.owner_email
    },
    riskOwnerUserId: row.risk_owner_user_id,
    tags: parseJson(row.tags, []),
    detectionControls: parseJson(row.detection_controls, []),
    mitigationControls: parseJson(row.mitigation_controls, []),
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapReviewRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    reviewUuid: row.review_uuid,
    riskId: row.risk_id,
    reviewerId: row.reviewer_id,
    reviewerName: row.reviewer_name,
    reviewerEmail: row.reviewer_email,
    status: row.status,
    residualSeverity: row.residual_severity,
    residualLikelihood: row.residual_likelihood,
    residualRiskScore: Number(row.residual_risk_score ?? 0),
    notes: row.notes,
    evidenceReferences: parseJson(row.evidence_references, []),
    reviewedAt: row.reviewed_at,
    nextReviewAt: row.next_review_at,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapEvidenceRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    evidenceUuid: row.evidence_uuid,
    tenantId: row.tenant_id,
    riskId: row.risk_id,
    framework: row.framework,
    controlReference: row.control_reference,
    evidenceType: row.evidence_type,
    storagePath: row.storage_path,
    checksum: row.checksum,
    sources: parseJson(row.sources, []),
    capturedAt: row.captured_at,
    expiresAt: row.expires_at,
    status: row.status,
    submittedBy: row.submitted_by,
    submittedByEmail: row.submitted_by_email,
    description: row.description,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapContinuityRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    exerciseUuid: row.exercise_uuid,
    tenantId: row.tenant_id,
    scenarioKey: row.scenario_key,
    scenarioSummary: row.scenario_summary,
    exerciseType: row.exercise_type,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    rtoTargetMinutes: row.rto_target_minutes ? Number(row.rto_target_minutes) : null,
    rpoTargetMinutes: row.rpo_target_minutes ? Number(row.rpo_target_minutes) : null,
    actualRtoMinutes: row.actual_rto_minutes ? Number(row.actual_rto_minutes) : null,
    actualRpoMinutes: row.actual_rpo_minutes ? Number(row.actual_rpo_minutes) : null,
    outcome: row.outcome,
    lessonsLearned: row.lessons_learned,
    followUpActions: parseJson(row.follow_up_actions, []),
    owner: {
      id: row.owner_id,
      displayName: row.owner_display_name,
      email: row.owner_email
    },
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAssessmentRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    assessmentUuid: row.assessment_uuid,
    tenantId: row.tenant_id,
    assessmentType: row.assessment_type,
    status: row.status,
    scheduledFor: row.scheduled_for,
    completedAt: row.completed_at,
    owner: {
      id: row.owner_id,
      displayName: row.owner_display_name,
      email: row.owner_email
    },
    scope: row.scope,
    methodology: row.methodology,
    findings: row.findings,
    nextSteps: row.next_steps,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normaliseSort(sortBy = 'residualRisk') {
  const map = {
    residualRisk: 'risk.residual_risk_score',
    inherentRisk: 'risk.inherent_risk_score',
    updatedAt: 'risk.updated_at',
    createdAt: 'risk.created_at',
    nextReviewAt: 'risk.next_review_at',
    status: 'risk.status'
  };

  return map[sortBy] ?? map.residualRisk;
}

export default class SecurityOperationsRepository {
  constructor({ connection = db, loggerInstance = logger.child({ module: 'security-ops-repo' }) } = {}) {
    this.connection = connection;
    this.logger = loggerInstance;
  }

  async createRisk(risk) {
    const row = {
      risk_uuid: risk.riskUuid ?? crypto.randomUUID(),
      tenant_id: risk.tenantId ?? 'global',
      title: risk.title,
      description: risk.description,
      category: risk.category ?? 'operational',
      status: risk.status ?? 'identified',
      severity: risk.severity ?? 'moderate',
      likelihood: risk.likelihood ?? 'possible',
      residual_severity: risk.residualSeverity ?? risk.severity ?? 'moderate',
      residual_likelihood: risk.residualLikelihood ?? risk.likelihood ?? 'possible',
      inherent_risk_score: risk.inherentRiskScore ?? 0,
      residual_risk_score: risk.residualRiskScore ?? 0,
      mitigation_plan: risk.mitigationPlan ?? null,
      residual_notes: risk.residualNotes ?? null,
      regulatory_driver: risk.regulatoryDriver ?? null,
      review_cadence_days: risk.reviewCadenceDays ?? 90,
      identified_at: risk.identifiedAt ?? this.connection.fn.now(),
      accepted_at: risk.acceptedAt ?? null,
      remediated_at: risk.remediatedAt ?? null,
      closed_at: risk.closedAt ?? null,
      last_reviewed_at: risk.lastReviewedAt ?? null,
      next_review_at: risk.nextReviewAt ?? null,
      owner_type: risk.owner?.type ?? 'team',
      owner_id: risk.owner?.id ?? null,
      owner_display_name: risk.owner?.displayName ?? null,
      owner_email: risk.owner?.email ?? null,
      risk_owner_user_id: risk.riskOwnerUserId ?? null,
      tags: serializeJson(risk.tags ?? [], '[]'),
      detection_controls: serializeJson(risk.detectionControls ?? [], '[]'),
      mitigation_controls: serializeJson(risk.mitigationControls ?? [], '[]'),
      metadata: serializeJson(risk.metadata ?? {}, '{}')
    };

    const record = await this.#insertWithReturning(SECURITY_TABLES.RISK_REGISTER, row);
    return mapRiskRow(record);
  }

  async updateRisk(riskId, updates) {
    if (!riskId) {
      throw new Error('riskId is required to update risk');
    }

    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.severity !== undefined) payload.severity = updates.severity;
    if (updates.likelihood !== undefined) payload.likelihood = updates.likelihood;
    if (updates.residualSeverity !== undefined) payload.residual_severity = updates.residualSeverity;
    if (updates.residualLikelihood !== undefined) payload.residual_likelihood = updates.residualLikelihood;
    if (updates.inherentRiskScore !== undefined) payload.inherent_risk_score = updates.inherentRiskScore;
    if (updates.residualRiskScore !== undefined) payload.residual_risk_score = updates.residualRiskScore;
    if (updates.mitigationPlan !== undefined) payload.mitigation_plan = updates.mitigationPlan;
    if (updates.residualNotes !== undefined) payload.residual_notes = updates.residualNotes;
    if (updates.regulatoryDriver !== undefined) payload.regulatory_driver = updates.regulatoryDriver;
    if (updates.reviewCadenceDays !== undefined) payload.review_cadence_days = updates.reviewCadenceDays;
    if (updates.identifiedAt !== undefined) payload.identified_at = updates.identifiedAt;
    if (updates.acceptedAt !== undefined) payload.accepted_at = updates.acceptedAt;
    if (updates.remediatedAt !== undefined) payload.remediated_at = updates.remediatedAt;
    if (updates.closedAt !== undefined) payload.closed_at = updates.closedAt;
    if (updates.lastReviewedAt !== undefined) payload.last_reviewed_at = updates.lastReviewedAt;
    if (updates.nextReviewAt !== undefined) payload.next_review_at = updates.nextReviewAt;
    if (updates.owner) {
      payload.owner_type = updates.owner.type ?? null;
      payload.owner_id = updates.owner.id ?? null;
      payload.owner_display_name = updates.owner.displayName ?? null;
      payload.owner_email = updates.owner.email ?? null;
    }
    if (updates.riskOwnerUserId !== undefined) payload.risk_owner_user_id = updates.riskOwnerUserId;
    if (updates.tags !== undefined) payload.tags = serializeJson(updates.tags, '[]');
    if (updates.detectionControls !== undefined) payload.detection_controls = serializeJson(updates.detectionControls, '[]');
    if (updates.mitigationControls !== undefined)
      payload.mitigation_controls = serializeJson(updates.mitigationControls, '[]');
    if (updates.metadata !== undefined) payload.metadata = serializeJson(updates.metadata, '{}');

    if (Object.keys(payload).length === 0) {
      return this.getRiskById(riskId);
    }

    await this.connection(SECURITY_TABLES.RISK_REGISTER).where({ id: riskId }).update(payload);
    return this.getRiskById(riskId);
  }

  async getRiskById(riskId) {
    const row = await this.connection(SECURITY_TABLES.RISK_REGISTER).where({ id: riskId }).first();
    return mapRiskRow(row);
  }

  async deleteRisk(riskId) {
    if (!riskId) {
      throw new Error('riskId is required to delete risk');
    }

    return this.connection.transaction(async (trx) => {
      await trx(SECURITY_TABLES.RISK_REVIEWS).where({ risk_id: riskId }).del();
      await trx(SECURITY_TABLES.AUDIT_EVIDENCE).where({ risk_id: riskId }).del();

      const deleted = await trx(SECURITY_TABLES.RISK_REGISTER).where({ id: riskId }).del();
      if (!deleted) {
        throw new Error(`Risk ${riskId} was not found`);
      }

      return true;
    });
  }

  async listRisks({
    tenantId = 'global',
    status,
    category,
    ownerId,
    tag,
    severity,
    includeClosed = true,
    limit = 20,
    offset = 0,
    sortBy = 'residualRisk',
    sortDirection = 'desc',
    search
  } = {}) {
    const builder = this.connection({ risk: SECURITY_TABLES.RISK_REGISTER })
      .select('risk.*')
      .where('risk.tenant_id', tenantId);

    builder.modify((qb) => {
      if (status) {
        qb.andWhere('risk.status', status);
      }
      if (category) {
        qb.andWhere('risk.category', category);
      }
      if (ownerId) {
        qb.andWhere('risk.owner_id', ownerId);
      }
      if (severity) {
        qb.andWhere('risk.severity', severity);
      }
      if (!includeClosed) {
        qb.andWhereNotIn('risk.status', ['closed', 'retired']);
      }
      if (search) {
        const pattern = `%${search.trim()}%`;
        qb.andWhere((nested) => {
          nested.where('risk.title', 'like', pattern).orWhere('risk.description', 'like', pattern);
        });
      }
      if (tag) {
        qb.andWhereRaw(
          'JSON_CONTAINS(COALESCE(risk.tags, JSON_ARRAY()), JSON_QUOTE(?), "$")',
          [tag]
        );
      }
    });

    const column = normaliseSort(sortBy);
    builder.orderBy(column, sortDirection?.toLowerCase() === 'asc' ? 'asc' : 'desc');
    builder.limit(Math.max(Number(limit) || 20, 1));
    builder.offset(Math.max(Number(offset) || 0, 0));

    const rows = await builder;

    const [{ total }] = await this.connection(SECURITY_TABLES.RISK_REGISTER)
      .where('tenant_id', tenantId)
      .modify((qb) => {
        if (status) qb.andWhere('status', status);
        if (category) qb.andWhere('category', category);
        if (ownerId) qb.andWhere('owner_id', ownerId);
        if (severity) qb.andWhere('severity', severity);
        if (!includeClosed) qb.andWhereNotIn('status', ['closed', 'retired']);
        if (search) {
          const pattern = `%${search.trim()}%`;
          qb.andWhere((nested) => {
            nested.where('title', 'like', pattern).orWhere('description', 'like', pattern);
          });
        }
        if (tag) {
          qb.andWhereRaw(
            'JSON_CONTAINS(COALESCE(tags, JSON_ARRAY()), JSON_QUOTE(?), "$")',
            [tag]
          );
        }
      })
      .count({ total: '*' });

    return {
      records: rows.map(mapRiskRow),
      total: Number(total ?? rows.length)
    };
  }

  async fetchRiskSummary({ tenantId = 'global' } = {}) {
    const statusRows = await this.connection(SECURITY_TABLES.RISK_REGISTER)
      .select('status')
      .count({ total: '*' })
      .where('tenant_id', tenantId)
      .groupBy('status');

    const statusTotals = statusRows.reduce((acc, row) => {
      acc[row.status] = Number(row.total ?? 0);
      return acc;
    }, {});

    const [aggregate] = await this.connection(SECURITY_TABLES.RISK_REGISTER)
      .select({
        total: this.connection.raw('COUNT(*)'),
        avg_inherent: this.connection.raw('AVG(inherent_risk_score)'),
        avg_residual: this.connection.raw('AVG(residual_risk_score)'),
        next_review: this.connection.raw('MIN(next_review_at)'),
        last_updated: this.connection.raw('MAX(updated_at)')
      })
      .where('tenant_id', tenantId);

    const [{ total: dueForReview = 0 } = {}] = await this.connection(
      SECURITY_TABLES.RISK_REGISTER
    )
      .where('tenant_id', tenantId)
      .andWhereNotNull('next_review_at')
      .andWhere('next_review_at', '<=', this.connection.fn.now())
      .count({ total: '*' });

    const [{ total: openFollowUps = 0 } = {}] = await this.connection(
      SECURITY_TABLES.CONTINUITY_EXERCISES
    )
      .where('tenant_id', tenantId)
      .andWhereRaw(
        'JSON_LENGTH(COALESCE(follow_up_actions, JSON_ARRAY())) > 0'
      )
      .count({ total: '*' });

    const ownerRows = await this.connection(SECURITY_TABLES.RISK_REGISTER)
      .select('owner_display_name')
      .count({ total: '*' })
      .where('tenant_id', tenantId)
      .groupBy('owner_display_name')
      .orderBy('total', 'desc')
      .limit(5);

    const tagRows = await this.connection(SECURITY_TABLES.RISK_REGISTER)
      .select('tags')
      .where('tenant_id', tenantId);

    const tagCounts = new Map();
    tagRows.forEach((row) => {
      const tags = parseJson(row.tags, []);
      tags
        .map((value) => String(value ?? '').trim())
        .filter(Boolean)
        .forEach((value) => {
          tagCounts.set(value, (tagCounts.get(value) ?? 0) + 1);
        });
    });

    return {
      statusTotals,
      totals: {
        risks: Number(aggregate?.total ?? 0),
        dueForReview: Number(dueForReview ?? 0),
        openFollowUps: Number(openFollowUps ?? 0)
      },
      averages: {
        inherent: aggregate?.avg_inherent ? Number(aggregate.avg_inherent) : 0,
        residual: aggregate?.avg_residual ? Number(aggregate.avg_residual) : 0
      },
      nextReviewAt: aggregate?.next_review ?? null,
      lastUpdatedAt: aggregate?.last_updated ?? null,
      topOwners: ownerRows.map((row) => ({
        owner: row.owner_display_name ?? 'Unassigned',
        total: Number(row.total ?? 0)
      })),
      topTags: Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    };
  }

  async createRiskReview(review) {
    const row = {
      review_uuid: review.reviewUuid ?? crypto.randomUUID(),
      risk_id: review.riskId,
      reviewer_id: review.reviewerId ?? null,
      reviewer_name: review.reviewerName ?? null,
      reviewer_email: review.reviewerEmail ?? null,
      status: review.status ?? 'in_review',
      residual_severity: review.residualSeverity ?? 'moderate',
      residual_likelihood: review.residualLikelihood ?? 'possible',
      residual_risk_score: review.residualRiskScore ?? 0,
      notes: review.notes ?? null,
      evidence_references: serializeJson(review.evidenceReferences ?? [], '[]'),
      reviewed_at: review.reviewedAt ?? this.connection.fn.now(),
      next_review_at: review.nextReviewAt ?? null,
      metadata: serializeJson(review.metadata ?? {}, '{}')
    };

    const record = await this.#insertWithReturning(SECURITY_TABLES.RISK_REVIEWS, row);
    return mapReviewRow(record);
  }

  async listRiskReviews(riskId, { limit = 20, offset = 0 } = {}) {
    const rows = await this.connection(SECURITY_TABLES.RISK_REVIEWS)
      .where({ risk_id: riskId })
      .orderBy('reviewed_at', 'desc')
      .limit(Math.max(limit, 1))
      .offset(Math.max(offset, 0));

    return rows.map(mapReviewRow);
  }

  async createEvidence(evidence) {
    const row = {
      evidence_uuid: evidence.evidenceUuid ?? crypto.randomUUID(),
      tenant_id: evidence.tenantId ?? 'global',
      risk_id: evidence.riskId ?? null,
      framework: evidence.framework ?? null,
      control_reference: evidence.controlReference ?? null,
      evidence_type: evidence.evidenceType ?? 'document',
      storage_path: evidence.storagePath,
      checksum: evidence.checksum ?? null,
      sources: serializeJson(evidence.sources ?? [], '[]'),
      captured_at: evidence.capturedAt ?? this.connection.fn.now(),
      expires_at: evidence.expiresAt ?? null,
      status: evidence.status ?? 'submitted',
      submitted_by: evidence.submittedBy ?? null,
      submitted_by_email: evidence.submittedByEmail ?? null,
      description: evidence.description ?? null,
      metadata: serializeJson(evidence.metadata ?? {}, '{}')
    };

    const record = await this.#insertWithReturning(SECURITY_TABLES.AUDIT_EVIDENCE, row);
    return mapEvidenceRow(record);
  }

  async listEvidence({
    tenantId = 'global',
    framework,
    controlReference,
    riskId,
    status,
    limit = 20,
    offset = 0
  } = {}) {
    const rows = await this.connection({ evidence: SECURITY_TABLES.AUDIT_EVIDENCE })
      .select('evidence.*')
      .where('evidence.tenant_id', tenantId)
      .modify((qb) => {
        if (framework) qb.andWhere('evidence.framework', framework);
        if (controlReference) qb.andWhere('evidence.control_reference', controlReference);
        if (riskId) qb.andWhere('evidence.risk_id', riskId);
        if (status) qb.andWhere('evidence.status', status);
      })
      .orderBy('evidence.captured_at', 'desc')
      .limit(Math.max(limit, 1))
      .offset(Math.max(offset, 0));

    const [{ total }] = await this.connection(SECURITY_TABLES.AUDIT_EVIDENCE)
      .where('tenant_id', tenantId)
      .modify((qb) => {
        if (framework) qb.andWhere('framework', framework);
        if (controlReference) qb.andWhere('control_reference', controlReference);
        if (riskId) qb.andWhere('risk_id', riskId);
        if (status) qb.andWhere('status', status);
      })
      .count({ total: '*' });

    return {
      records: rows.map(mapEvidenceRow),
      total: Number(total ?? rows.length)
    };
  }

  async createContinuityExercise(exercise) {
    const row = {
      exercise_uuid: exercise.exerciseUuid ?? crypto.randomUUID(),
      tenant_id: exercise.tenantId ?? 'global',
      scenario_key: exercise.scenarioKey,
      scenario_summary: exercise.scenarioSummary,
      exercise_type: exercise.exerciseType ?? 'tabletop',
      started_at: exercise.startedAt ?? this.connection.fn.now(),
      completed_at: exercise.completedAt ?? null,
      rto_target_minutes: exercise.rtoTargetMinutes ?? null,
      rpo_target_minutes: exercise.rpoTargetMinutes ?? null,
      actual_rto_minutes: exercise.actualRtoMinutes ?? null,
      actual_rpo_minutes: exercise.actualRpoMinutes ?? null,
      outcome: exercise.outcome ?? 'pending_report',
      lessons_learned: exercise.lessonsLearned ?? null,
      follow_up_actions: serializeJson(exercise.followUpActions ?? [], '[]'),
      owner_id: exercise.owner?.id ?? null,
      owner_display_name: exercise.owner?.displayName ?? null,
      owner_email: exercise.owner?.email ?? null,
      metadata: serializeJson(exercise.metadata ?? {}, '{}')
    };

    const record = await this.#insertWithReturning(SECURITY_TABLES.CONTINUITY_EXERCISES, row);
    return mapContinuityRow(record);
  }

  async listContinuityExercises({
    tenantId = 'global',
    outcome,
    ownerId,
    since,
    limit = 20,
    offset = 0
  } = {}) {
    const rows = await this.connection({ drill: SECURITY_TABLES.CONTINUITY_EXERCISES })
      .select('drill.*')
      .where('drill.tenant_id', tenantId)
      .modify((qb) => {
        if (outcome) qb.andWhere('drill.outcome', outcome);
        if (ownerId) qb.andWhere('drill.owner_id', ownerId);
        if (since) qb.andWhere('drill.started_at', '>=', since);
      })
      .orderBy('drill.started_at', 'desc')
      .limit(Math.max(limit, 1))
      .offset(Math.max(offset, 0));

    const [{ total }] = await this.connection(SECURITY_TABLES.CONTINUITY_EXERCISES)
      .where('tenant_id', tenantId)
      .modify((qb) => {
        if (outcome) qb.andWhere('outcome', outcome);
        if (ownerId) qb.andWhere('owner_id', ownerId);
        if (since) qb.andWhere('started_at', '>=', since);
      })
      .count({ total: '*' });

    return {
      records: rows.map(mapContinuityRow),
      total: Number(total ?? rows.length)
    };
  }

  async fetchContinuitySummary({ tenantId = 'global' } = {}) {
    const [{ total: completed = 0 } = {}] = await this.connection(
      SECURITY_TABLES.CONTINUITY_EXERCISES
    )
      .where('tenant_id', tenantId)
      .andWhereNotNull('completed_at')
      .count({ total: '*' });

    const [{ total: pending = 0 } = {}] = await this.connection(
      SECURITY_TABLES.CONTINUITY_EXERCISES
    )
      .where('tenant_id', tenantId)
      .andWhereNull('completed_at')
      .count({ total: '*' });

    const [{ total: breached = 0 } = {}] = await this.connection(
      SECURITY_TABLES.CONTINUITY_EXERCISES
    )
      .where('tenant_id', tenantId)
      .andWhere((qb) => {
        qb.where((rto) => {
          rto
            .whereNotNull('actual_rto_minutes')
            .andWhereNotNull('rto_target_minutes')
            .andWhere('actual_rto_minutes', '>', this.connection.raw('rto_target_minutes'));
        }).orWhere((rpo) => {
          rpo
            .whereNotNull('actual_rpo_minutes')
            .andWhereNotNull('rpo_target_minutes')
            .andWhere('actual_rpo_minutes', '>', this.connection.raw('rpo_target_minutes'));
        });
      })
      .count({ total: '*' });

    const latest = await this.connection(SECURITY_TABLES.CONTINUITY_EXERCISES)
      .where('tenant_id', tenantId)
      .orderBy('started_at', 'desc')
      .first();

    return {
      totals: {
        completed: Number(completed ?? 0),
        inProgress: Number(pending ?? 0),
        breachedTargets: Number(breached ?? 0)
      },
      latest: mapContinuityRow(latest)
    };
  }

  async createAssessment(assessment) {
    const row = {
      assessment_uuid: assessment.assessmentUuid ?? crypto.randomUUID(),
      tenant_id: assessment.tenantId ?? 'global',
      assessment_type: assessment.assessmentType,
      status: assessment.status ?? 'scheduled',
      scheduled_for: assessment.scheduledFor,
      completed_at: assessment.completedAt ?? null,
      owner_id: assessment.owner?.id ?? null,
      owner_display_name: assessment.owner?.displayName ?? null,
      owner_email: assessment.owner?.email ?? null,
      scope: assessment.scope ?? null,
      methodology: assessment.methodology ?? null,
      findings: assessment.findings ?? null,
      next_steps: assessment.nextSteps ?? null,
      metadata: serializeJson(assessment.metadata ?? {}, '{}')
    };

    const record = await this.#insertWithReturning(SECURITY_TABLES.SECURITY_ASSESSMENTS, row);
    return mapAssessmentRow(record);
  }

  async listAssessments({
    tenantId = 'global',
    status,
    assessmentType,
    scheduledFrom,
    scheduledTo,
    limit = 20,
    offset = 0
  } = {}) {
    const rows = await this.connection({ assessment: SECURITY_TABLES.SECURITY_ASSESSMENTS })
      .select('assessment.*')
      .where('assessment.tenant_id', tenantId)
      .modify((qb) => {
        if (status) qb.andWhere('assessment.status', status);
        if (assessmentType) qb.andWhere('assessment.assessment_type', assessmentType);
        if (scheduledFrom) qb.andWhere('assessment.scheduled_for', '>=', scheduledFrom);
        if (scheduledTo) qb.andWhere('assessment.scheduled_for', '<=', scheduledTo);
      })
      .orderBy('assessment.scheduled_for', 'desc')
      .limit(Math.max(limit, 1))
      .offset(Math.max(offset, 0));

    const [{ total }] = await this.connection(SECURITY_TABLES.SECURITY_ASSESSMENTS)
      .where('tenant_id', tenantId)
      .modify((qb) => {
        if (status) qb.andWhere('status', status);
        if (assessmentType) qb.andWhere('assessment_type', assessmentType);
        if (scheduledFrom) qb.andWhere('scheduled_for', '>=', scheduledFrom);
        if (scheduledTo) qb.andWhere('scheduled_for', '<=', scheduledTo);
      })
      .count({ total: '*' });

    return {
      records: rows.map(mapAssessmentRow),
      total: Number(total ?? rows.length)
    };
  }

  async #insertWithReturning(table, row) {
    try {
      const [record] = await this.connection(table).insert(row, ['*']);
      if (record && typeof record === 'object') {
        return record;
      }
      if (record !== undefined) {
        const fetched = await this.connection(table).where({ id: record }).first();
        if (fetched) {
          return fetched;
        }
      }
    } catch (error) {
      this.logger.warn({ table, error }, 'insert returning not supported, falling back to fetch');
    }

    const [id] = await this.connection(table).insert(row);
    const primaryKey = Array.isArray(id) ? id[0] : id;
    return this.connection(table).where({ id: primaryKey }).first();
  }
}
