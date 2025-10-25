import { randomUUID } from 'node:crypto';

import logger from '../config/logger.js';
import GovernanceContractModel from '../models/GovernanceContractModel.js';
import GovernanceVendorAssessmentModel from '../models/GovernanceVendorAssessmentModel.js';
import GovernanceReviewCycleModel from '../models/GovernanceReviewCycleModel.js';
import GovernanceRoadmapCommunicationModel from '../models/GovernanceRoadmapCommunicationModel.js';
import {
  updateGovernanceContractHealthMetrics,
  updateVendorAssessmentRiskMetrics,
  recordGovernanceCommunicationScheduled,
  recordGovernanceCommunicationPerformance
} from '../observability/metrics.js';
import AuditEventService from './AuditEventService.js';

function stableStringify(value) {
  try {
    return JSON.stringify(value, (_, nested) => {
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        return Object.keys(nested)
          .sort()
          .reduce((acc, key) => {
            acc[key] = nested[key];
            return acc;
          }, {});
      }
      return nested;
    });
  } catch (_error) {
    return String(value);
  }
}

function computeChangeSet(previous, next, fields = []) {
  if (!previous || !next) {
    return { changed: false, changes: {} };
  }
  const changes = {};
  for (const field of fields) {
    if (stableStringify(previous[field]) !== stableStringify(next[field])) {
      changes[field] = { previous: previous[field] ?? null, next: next[field] ?? null };
    }
  }
  return { changed: Object.keys(changes).length > 0, changes };
}

function toPositiveInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value ?? fallback, 10);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : fallback;
}

function enrichContract(contract) {
  const enriched = { ...contract };
  const now = new Date();
  const renewalDate = contract.renewalDate ? new Date(contract.renewalDate) : null;
  const terminationNoticeDate = contract.terminationNoticeDate ? new Date(contract.terminationNoticeDate) : null;

  if (renewalDate) {
    const diffMs = renewalDate.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    enriched.daysUntilRenewal = days;
    enriched.renewalStatus = days < 0 ? 'overdue' : days <= 45 ? 'inside_window' : 'healthy';
  } else {
    enriched.daysUntilRenewal = null;
    enriched.renewalStatus = 'unscheduled';
  }

  if (terminationNoticeDate) {
    const diffMs = terminationNoticeDate.getTime() - now.getTime();
    enriched.terminationNoticeDueInDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  } else {
    enriched.terminationNoticeDueInDays = null;
  }

  const obligations = Array.isArray(contract.obligations) ? contract.obligations : [];
  enriched.openObligations = obligations.filter((item) => !item.completedAt).length;

  return enriched;
}

function enrichReviewCycle(review) {
  const now = Date.now();
  const nextMilestone = review.nextMilestoneAt ? new Date(review.nextMilestoneAt).getTime() : null;
  const openItems = Array.isArray(review.actionItems)
    ? review.actionItems.filter((item) => !item.completedAt).length
    : 0;
  return {
    ...review,
    openActionItems: openItems,
    milestoneStatus:
      nextMilestone && nextMilestone < now ? (review.status === 'completed' ? 'closed' : 'overdue') : 'on_track'
  };
}

function enrichCommunication(communication) {
  const metrics = communication.metrics ?? {};
  const target = Number(metrics.targetAudience ?? metrics.expectedRecipients ?? 0);
  const delivered = Number(metrics.delivered ?? 0);
  const engagement = Number(metrics.engagementRate ?? metrics.openRate ?? 0);
  return {
    ...communication,
    deliveryProgress: target > 0 ? Math.min(1, delivered / target) : null,
    engagementRate: engagement || null
  };
}

async function refreshContractMetrics(contractModel = GovernanceContractModel) {
  const summary = await contractModel.getLifecycleSummary({ windowDays: 90 });
  updateGovernanceContractHealthMetrics(summary);
  return summary;
}

async function refreshVendorMetrics(vendorModel = GovernanceVendorAssessmentModel) {
  const summary = await vendorModel.getRiskSummary();
  updateVendorAssessmentRiskMetrics(summary);
  return summary;
}

async function refreshCommunicationMetrics(communicationModel = GovernanceRoadmapCommunicationModel) {
  const summary = await communicationModel.getCommunicationSummary();
  recordGovernanceCommunicationPerformance({ summary });
  return summary;
}

class GovernanceStakeholderService {
  constructor({
    contractModel = GovernanceContractModel,
    vendorAssessmentModel = GovernanceVendorAssessmentModel,
    reviewCycleModel = GovernanceReviewCycleModel,
    communicationModel = GovernanceRoadmapCommunicationModel,
    auditService = new AuditEventService(),
    loggerInstance = logger.child({ service: 'GovernanceStakeholderService' })
  } = {}) {
    this.contractModel = contractModel;
    this.vendorAssessmentModel = vendorAssessmentModel;
    this.reviewCycleModel = reviewCycleModel;
    this.communicationModel = communicationModel;
    this.auditService = auditService;
    this.logger = loggerInstance;
  }

  async _recordAuditEvent({
    eventType,
    entityType,
    entityId,
    metadata = {},
    actor,
    tenantId = 'global',
    severity = 'info',
    requestContext
  }) {
    if (!this.auditService || typeof this.auditService.record !== 'function') {
      return;
    }

    try {
      await this.auditService.record({
        eventType,
        entityType,
        entityId: entityId ? String(entityId) : 'unknown',
        metadata,
        actor: actor ?? { id: null, type: 'system', role: 'system' },
        tenantId,
        severity,
        requestContext
      });
    } catch (error) {
      this.logger.warn({ err: error, eventType, entityType, entityId }, 'Failed to record governance audit event');
    }
  }

  async getOverview() {
    const [contractSummary, vendorSummary, reviewSummary, communicationSummary] = await Promise.all([
      refreshContractMetrics(this.contractModel),
      refreshVendorMetrics(this.vendorAssessmentModel),
      this.reviewCycleModel.getScheduleSummary(),
      refreshCommunicationMetrics(this.communicationModel)
    ]);

    const [upcomingContracts, highRiskVendors, upcomingReviews, scheduledCommunications] = await Promise.all([
      this.contractModel.list({ renewalWithinDays: 60 }, { limit: 5 }),
      this.vendorAssessmentModel.list({ riskLevel: ['high', 'critical'] }, { limit: 5 }),
      this.reviewCycleModel.list({ onlyUpcoming: true }, { limit: 5 }),
      this.communicationModel.list({ status: ['scheduled'] }, { limit: 5 })
    ]);

    return {
      contracts: {
        summary: contractSummary,
        upcomingRenewals: upcomingContracts.items.map(enrichContract)
      },
      vendorAssessments: {
        summary: vendorSummary,
        highRiskVendors: highRiskVendors.items
      },
      reviewCycles: {
        summary: reviewSummary,
        upcoming: upcomingReviews.items.map(enrichReviewCycle)
      },
      communications: {
        summary: communicationSummary,
        scheduled: scheduledCommunications.items.map(enrichCommunication)
      }
    };
  }

  async listContracts(filters = {}, pagination = {}) {
    const result = await this.contractModel.list(filters, pagination);
    return {
      total: result.total,
      items: result.items.map(enrichContract)
    };
  }

  async updateContract(publicId, updates = {}, { actor, tenantId = 'global', requestContext } = {}) {
    const hasLookup = typeof this.contractModel.findByPublicId === 'function';
    const existing = hasLookup ? await this.contractModel.findByPublicId(publicId) : null;

    const payload = { ...updates };
    if (Array.isArray(payload.obligations)) {
      payload.obligations = payload.obligations.map((item) => ({
        id: item.id ?? randomUUID(),
        description: item.description,
        owner: item.owner,
        dueAt: item.dueAt ?? null,
        completedAt: item.completedAt ?? null,
        status: item.status ?? (item.completedAt ? 'complete' : 'open')
      }));
    }

    const updated = await this.contractModel.updateByPublicId(publicId, payload);
    if (!updated) {
      return null;
    }

    await refreshContractMetrics(this.contractModel);
    const enriched = enrichContract(updated);

    const changeSet = existing
      ? computeChangeSet(existing, updated, [
          'status',
          'ownerEmail',
          'riskTier',
          'renewalDate',
          'terminationNoticeDate',
          'obligations',
          'metadata',
          'contractValueCents',
          'nextGovernanceCheckAt'
        ])
      : { changed: false, changes: {} };

    if (changeSet.changed) {
      await this._recordAuditEvent({
        eventType: 'governance.contract.updated',
        entityType: 'governance.contract',
        entityId: publicId,
        metadata: { changes: changeSet.changes },
        actor,
        tenantId,
        requestContext
      });
    }

    return enriched;
  }

  async listVendorAssessments(filters = {}, pagination = {}) {
    const result = await this.vendorAssessmentModel.list(filters, pagination);
    return {
      total: result.total,
      items: result.items
    };
  }

  async recordVendorAssessmentDecision(
    publicId,
    { riskScore, riskLevel, status, findings, remediationPlan, nextReviewAt, ownerEmail },
    { actor, tenantId = 'global', requestContext } = {}
  ) {
    const hasLookup = typeof this.vendorAssessmentModel.findByPublicId === 'function';
    const existing = hasLookup ? await this.vendorAssessmentModel.findByPublicId(publicId) : null;

    const updates = {};
    if (riskScore !== undefined) updates.riskScore = Number(riskScore);
    if (riskLevel) updates.riskLevel = riskLevel;
    if (status) updates.status = status;
    if (findings) updates.findings = findings;
    if (remediationPlan) updates.remediationPlan = remediationPlan;
    if (nextReviewAt) updates.nextReviewAt = nextReviewAt;
    if (ownerEmail) updates.ownerEmail = ownerEmail;
    updates.lastAssessedAt = new Date().toISOString();

    const updated = await this.vendorAssessmentModel.updateByPublicId(publicId, updates);
    if (!updated) {
      return null;
    }

    await refreshVendorMetrics(this.vendorAssessmentModel);

    const changeSet = existing
      ? computeChangeSet(existing, updated, [
          'riskScore',
          'riskLevel',
          'status',
          'findings',
          'remediationPlan',
          'nextReviewAt',
          'ownerEmail'
        ])
      : { changed: false, changes: {} };

    if (changeSet.changed) {
      await this._recordAuditEvent({
        eventType: 'governance.vendor_assessment.updated',
        entityType: 'governance.vendor_assessment',
        entityId: publicId,
        metadata: { changes: changeSet.changes },
        actor,
        tenantId,
        requestContext
      });
    }

    return updated;
  }

  async listReviewCycles(filters = {}, pagination = {}) {
    const result = await this.reviewCycleModel.list(filters, pagination);
    return {
      total: result.total,
      items: result.items.map(enrichReviewCycle)
    };
  }

  async recordReviewAction(publicId, actionUpdate, { actor, tenantId = 'global', requestContext } = {}) {
    const review = await this.reviewCycleModel.findByPublicId(publicId);
    if (!review) {
      return null;
    }

    const actionItems = Array.isArray(review.actionItems) ? [...review.actionItems] : [];
    const entry = {
      id: actionUpdate.id ?? randomUUID(),
      summary: actionUpdate.summary,
      owner: actionUpdate.owner,
      dueAt: actionUpdate.dueAt ?? null,
      completedAt: actionUpdate.completedAt ?? null,
      status: actionUpdate.status ?? (actionUpdate.completedAt ? 'completed' : 'open'),
      recordedAt: new Date().toISOString()
    };
    actionItems.push(entry);

    const updated = await this.reviewCycleModel.updateByPublicId(publicId, {
      actionItems,
      readinessScore: toPositiveInteger(actionUpdate.readinessScore ?? review.readinessScore, review.readinessScore)
    });

    const enriched = enrichReviewCycle(updated);

    await this._recordAuditEvent({
      eventType: 'governance.review_cycle.action_recorded',
      entityType: 'governance.review_cycle',
      entityId: publicId,
      metadata: {
        actionItem: entry,
        readinessScore: {
          previous: review.readinessScore ?? null,
          next: enriched.readinessScore ?? null
        },
        totalActionItems: Array.isArray(updated.actionItems) ? updated.actionItems.length : null
      },
      actor,
      tenantId,
      requestContext
    });

    return enriched;
  }

  async listCommunications(filters = {}, pagination = {}) {
    const result = await this.communicationModel.list(filters, pagination);
    return {
      total: result.total,
      items: result.items.map(enrichCommunication)
    };
  }

  async scheduleCommunication(payload, { actor, tenantId = 'global', requestContext } = {}) {
    const communication = {
      ...payload,
      status: payload.status ?? 'scheduled',
      scheduleAt: payload.scheduleAt ?? new Date().toISOString(),
      metrics: payload.metrics ?? {
        targetAudience: payload.targetAudience,
        expectedRecipients: payload.targetAudience,
        delivered: 0,
        engagementRate: 0
      }
    };

    const created = await this.communicationModel.create(communication);
    recordGovernanceCommunicationScheduled({
      audience: created.audience,
      channel: created.channel,
      status: created.status
    });
    await refreshCommunicationMetrics(this.communicationModel);

    await this._recordAuditEvent({
      eventType: 'governance.communication.scheduled',
      entityType: 'governance.communication',
      entityId: created.publicId ?? created.id,
      metadata: {
        audience: created.audience ?? communication.audience ?? null,
        channel: created.channel ?? communication.channel ?? null,
        scheduleAt: created.scheduleAt ?? communication.scheduleAt ?? null,
        status: created.status
      },
      actor,
      tenantId,
      requestContext
    });

    return enrichCommunication(created);
  }

  async recordCommunicationMetrics(publicId, metrics = {}, { actor, tenantId = 'global', requestContext } = {}) {
    const existing = await this.communicationModel.findByPublicId(publicId);
    if (!existing) {
      return null;
    }

    const mergedMetrics = { ...existing.metrics, ...metrics, updatedAt: new Date().toISOString() };
    if (metrics.sentAt && !existing.sentAt) {
      existing.sentAt = metrics.sentAt;
    }

    const updated = await this.communicationModel.updateByPublicId(publicId, {
      metrics: mergedMetrics,
      sentAt: metrics.sentAt ?? existing.sentAt ?? null,
      status: metrics.status ?? existing.status
    });

    await refreshCommunicationMetrics(this.communicationModel);

    const metricsChanged = stableStringify(existing.metrics) !== stableStringify(mergedMetrics);
    const statusChanged = existing.status !== updated.status;
    const sentAtChanged = (existing.sentAt ?? null) !== (updated.sentAt ?? null);

    if (metricsChanged || statusChanged || sentAtChanged) {
      await this._recordAuditEvent({
        eventType: 'governance.communication.metrics_updated',
        entityType: 'governance.communication',
        entityId: publicId,
        metadata: {
          metricsChanged,
          status: { previous: existing.status, next: updated.status },
          sentAt: { previous: existing.sentAt ?? null, next: updated.sentAt ?? null }
        },
        actor,
        tenantId,
        requestContext
      });
    }

    return enrichCommunication(updated);
  }
}

const governanceStakeholderService = new GovernanceStakeholderService();
export default governanceStakeholderService;
