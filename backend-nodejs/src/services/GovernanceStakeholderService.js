import { randomUUID } from 'node:crypto';

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

async function refreshContractMetrics() {
  const summary = await GovernanceContractModel.getLifecycleSummary({ windowDays: 90 });
  updateGovernanceContractHealthMetrics(summary);
  return summary;
}

async function refreshVendorMetrics() {
  const summary = await GovernanceVendorAssessmentModel.getRiskSummary();
  updateVendorAssessmentRiskMetrics(summary);
  return summary;
}

async function refreshCommunicationMetrics() {
  const summary = await GovernanceRoadmapCommunicationModel.getCommunicationSummary();
  recordGovernanceCommunicationPerformance({ summary });
  return summary;
}

class GovernanceStakeholderService {
  async getOverview() {
    const [contractSummary, vendorSummary, reviewSummary, communicationSummary] = await Promise.all([
      refreshContractMetrics(),
      refreshVendorMetrics(),
      GovernanceReviewCycleModel.getScheduleSummary(),
      refreshCommunicationMetrics()
    ]);

    const [upcomingContracts, highRiskVendors, upcomingReviews, scheduledCommunications] = await Promise.all([
      GovernanceContractModel.list({ renewalWithinDays: 60 }, { limit: 5 }),
      GovernanceVendorAssessmentModel.list({ riskLevel: ['high', 'critical'] }, { limit: 5 }),
      GovernanceReviewCycleModel.list({ onlyUpcoming: true }, { limit: 5 }),
      GovernanceRoadmapCommunicationModel.list({ status: ['scheduled'] }, { limit: 5 })
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
    const result = await GovernanceContractModel.list(filters, pagination);
    return {
      total: result.total,
      items: result.items.map(enrichContract)
    };
  }

  async updateContract(publicId, updates = {}) {
    const payload = { ...updates };
    if (payload.obligations) {
      payload.obligations = payload.obligations.map((item) => ({
        id: item.id ?? randomUUID(),
        description: item.description,
        owner: item.owner,
        dueAt: item.dueAt ?? null,
        completedAt: item.completedAt ?? null,
        status: item.status ?? (item.completedAt ? 'complete' : 'open')
      }));
    }

    const updated = await GovernanceContractModel.updateByPublicId(publicId, payload);
    if (!updated) {
      return null;
    }

    await refreshContractMetrics();
    return enrichContract(updated);
  }

  async listVendorAssessments(filters = {}, pagination = {}) {
    const result = await GovernanceVendorAssessmentModel.list(filters, pagination);
    return {
      total: result.total,
      items: result.items
    };
  }

  async recordVendorAssessmentDecision(publicId, { riskScore, riskLevel, status, findings, remediationPlan, nextReviewAt, ownerEmail }) {
    const updates = {};
    if (riskScore !== undefined) updates.riskScore = Number(riskScore);
    if (riskLevel) updates.riskLevel = riskLevel;
    if (status) updates.status = status;
    if (findings) updates.findings = findings;
    if (remediationPlan) updates.remediationPlan = remediationPlan;
    if (nextReviewAt) updates.nextReviewAt = nextReviewAt;
    if (ownerEmail) updates.ownerEmail = ownerEmail;
    updates.lastAssessedAt = new Date().toISOString();

    const updated = await GovernanceVendorAssessmentModel.updateByPublicId(publicId, updates);
    if (!updated) {
      return null;
    }

    await refreshVendorMetrics();
    return updated;
  }

  async listReviewCycles(filters = {}, pagination = {}) {
    const result = await GovernanceReviewCycleModel.list(filters, pagination);
    return {
      total: result.total,
      items: result.items.map(enrichReviewCycle)
    };
  }

  async recordReviewAction(publicId, actionUpdate) {
    const review = await GovernanceReviewCycleModel.findByPublicId(publicId);
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

    const updated = await GovernanceReviewCycleModel.updateByPublicId(publicId, {
      actionItems,
      readinessScore: toPositiveInteger(actionUpdate.readinessScore ?? review.readinessScore, review.readinessScore)
    });

    return enrichReviewCycle(updated);
  }

  async listCommunications(filters = {}, pagination = {}) {
    const result = await GovernanceRoadmapCommunicationModel.list(filters, pagination);
    return {
      total: result.total,
      items: result.items.map(enrichCommunication)
    };
  }

  async scheduleCommunication(payload) {
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

    const created = await GovernanceRoadmapCommunicationModel.create(communication);
    recordGovernanceCommunicationScheduled({
      audience: created.audience,
      channel: created.channel,
      status: created.status
    });
    await refreshCommunicationMetrics();
    return enrichCommunication(created);
  }

  async recordCommunicationMetrics(publicId, metrics = {}) {
    const existing = await GovernanceRoadmapCommunicationModel.findByPublicId(publicId);
    if (!existing) {
      return null;
    }

    const mergedMetrics = { ...existing.metrics, ...metrics, updatedAt: new Date().toISOString() };
    if (metrics.sentAt && !existing.sentAt) {
      existing.sentAt = metrics.sentAt;
    }

    const updated = await GovernanceRoadmapCommunicationModel.updateByPublicId(publicId, {
      metrics: mergedMetrics,
      sentAt: metrics.sentAt ?? existing.sentAt ?? null,
      status: metrics.status ?? existing.status
    });

    await refreshCommunicationMetrics();
    return enrichCommunication(updated);
  }
}

const governanceStakeholderService = new GovernanceStakeholderService();
export default governanceStakeholderService;
