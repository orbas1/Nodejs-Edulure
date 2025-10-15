import db from '../config/database.js';
import logger from '../config/logger.js';
import CommunityMemberModel from '../models/CommunityMemberModel.js';
import CommunityPostModel from '../models/CommunityPostModel.js';
import CommunityPostModerationCaseModel from '../models/CommunityPostModerationCaseModel.js';
import CommunityPostModerationActionModel from '../models/CommunityPostModerationActionModel.js';
import ModerationAnalyticsEventModel from '../models/ModerationAnalyticsEventModel.js';
import ScamReportModel from '../models/ScamReportModel.js';
import DomainEventModel from '../models/DomainEventModel.js';

const log = logger.child({ service: 'CommunityModerationService' });
const MODERATOR_ROLES = new Set(['owner', 'admin', 'moderator']);

function parseJsonColumn(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function clampRiskScore(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function deriveSeverity(riskScore) {
  if (riskScore >= 80) return 'critical';
  if (riskScore >= 60) return 'high';
  if (riskScore >= 35) return 'medium';
  return 'low';
}

function appendLimited(existing = [], additions = [], limit = 50) {
  const list = Array.isArray(existing) ? [...existing] : [];
  const nextItems = Array.isArray(additions) ? additions : [additions];
  for (const item of nextItems) {
    if (item) {
      list.push(item);
    }
  }
  if (list.length > limit) {
    return list.slice(list.length - limit);
  }
  return list;
}

function mergeModerationMetadata(currentMetadata = {}, additions = {}) {
  const metadata = { ...currentMetadata };
  if (additions.flags) {
    metadata.flags = appendLimited(metadata.flags, additions.flags, 50);
  }
  if (additions.riskHistory) {
    metadata.riskHistory = appendLimited(metadata.riskHistory, additions.riskHistory, 100);
  }
  if (additions.notes) {
    metadata.notes = appendLimited(metadata.notes, additions.notes, 100);
  }
  if (additions.summary) {
    metadata.summary = additions.summary;
  }
  return metadata;
}

function nowIso() {
  return new Date().toISOString();
}

function ensureActionAllowed(action) {
  const allowed = new Set([
    'assign',
    'escalate',
    'approve',
    'reject',
    'suppress',
    'restore',
    'comment'
  ]);
  if (!allowed.has(action)) {
    const error = new Error('Unsupported moderation action');
    error.status = 422;
    throw error;
  }
}

async function ensureCommunityMembership(communityId, actor, connection) {
  if (!actor?.id) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }

  if (actor.role === 'admin') {
    return { role: 'admin', status: 'active' };
  }

  const membership = await CommunityMemberModel.findMembership(communityId, actor.id, connection);
  if (!membership || membership.status !== 'active') {
    const error = new Error('You do not have access to this community');
    error.status = 403;
    throw error;
  }
  return membership;
}

async function ensureModerator(communityId, actor, connection) {
  const membership = await ensureCommunityMembership(communityId, actor, connection);
  if (actor.role === 'admin' || MODERATOR_ROLES.has(membership.role)) {
    return membership;
  }
  const error = new Error('Only moderators can perform this action');
  error.status = 403;
  throw error;
}

function buildFlagMetadata({ actorId, reason, riskScore, flaggedSource, evidence, tags }) {
  return {
    actorId,
    reason,
    riskScore,
    flaggedSource,
    evidence: Array.isArray(evidence) ? evidence : [],
    tags: Array.isArray(tags) ? tags : [],
    flaggedAt: nowIso()
  };
}

export default class CommunityModerationService {
  static async flagPostForReview({ actor, communityId, payload }) {
    return db.transaction(async (trx) => {
      const post = await CommunityPostModel.findById(payload.postId, trx);
      if (!post) {
        const error = new Error('Post not found');
        error.status = 404;
        throw error;
      }
      if (Number(post.communityId) !== Number(communityId)) {
        const error = new Error('Post does not belong to this community');
        error.status = 400;
        throw error;
      }

      await ensureCommunityMembership(communityId, actor, trx);

      const riskScore = clampRiskScore(payload.riskScore ?? 0);
      const severity = deriveSeverity(riskScore);
      const flaggedSource = payload.flaggedSource ?? 'user_report';
      const existingMetadata = parseJsonColumn(post.moderationMetadata, {});

      const flagEntry = buildFlagMetadata({
        actorId: actor.id,
        reason: payload.reason,
        riskScore,
        flaggedSource,
        evidence: payload.evidence,
        tags: payload.tags
      });

      const moderationCase = await CommunityPostModerationCaseModel.findOpenByPost(post.id, trx);
      const caseMetadata = moderationCase?.metadata ?? {};
      const mergedCaseMetadata = mergeModerationMetadata(caseMetadata, {
        flags: [flagEntry],
        riskHistory: [{ riskScore, at: nowIso() }]
      });

      let persistedCase;
      if (moderationCase) {
        persistedCase = await CommunityPostModerationCaseModel.updateById(
          moderationCase.id,
          {
            riskScore: Math.max(riskScore, moderationCase.riskScore ?? 0),
            severity: deriveSeverity(Math.max(riskScore, moderationCase.riskScore ?? 0)),
            metadata: mergedCaseMetadata,
            status: moderationCase.status === 'approved' ? 'pending' : moderationCase.status,
            reporterId: moderationCase.reporterId ?? actor.id
          },
          trx
        );
      } else {
        persistedCase = await CommunityPostModerationCaseModel.create(
          {
            communityId: Number(communityId),
            postId: post.id,
            reporterId: actor.id,
            reason: payload.reason,
            riskScore,
            severity,
            flaggedSource,
            metadata: mergedCaseMetadata
          },
          trx
        );
      }

      const updatedMetadata = mergeModerationMetadata(existingMetadata, {
        flags: [flagEntry],
        riskHistory: [{ riskScore, at: flagEntry.flaggedAt }],
        notes: payload.notes ? [{ message: payload.notes, authorId: actor.id, createdAt: flagEntry.flaggedAt }] : []
      });

      const nextState = moderationCase ? 'under_review' : 'pending';

      const updatedPost = await CommunityPostModel.updateModerationState(
        post.id,
        {
          state: nextState,
          metadata: updatedMetadata,
          lastModeratedAt: flagEntry.flaggedAt
        },
        trx
      );

      await CommunityPostModerationActionModel.record(
        {
          caseId: persistedCase.id,
          actorId: actor.id,
          action: moderationCase ? 'updated' : 'flagged',
          notes: payload.reason,
          metadata: { riskScore, flaggedSource, evidence: flagEntry.evidence, tags: flagEntry.tags }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community_post',
          entityId: post.id,
          eventType: 'community.post.flagged',
          payload: {
            communityId: Number(communityId),
            caseId: persistedCase.publicId,
            severity,
            riskScore,
            flaggedSource
          },
          performedBy: actor.id
        },
        trx
      );

      await ModerationAnalyticsEventModel.record(
        {
          communityId: Number(communityId),
          entityType: 'community_post',
          entityId: String(post.id),
          eventType: 'post_flagged',
          riskScore,
          metrics: {
            severity,
            flaggedSource,
            status: updatedPost.moderationState,
            tags: flagEntry.tags
          },
          source: flaggedSource,
          occurredAt: flagEntry.flaggedAt
        },
        trx
      );

      log.info(
        {
          communityId,
          postId: post.id,
          caseId: persistedCase.publicId,
          actorId: actor.id,
          severity,
          riskScore
        },
        'Post flagged for moderation review'
      );

      return {
        case: persistedCase,
        post: updatedPost
      };
    });
  }

  static async listCases(actor, filters = {}, pagination = {}) {
    if (actor.role !== 'admin' && !filters.communityId) {
      const error = new Error('Community filter is required for moderators');
      error.status = 400;
      throw error;
    }

    if (filters.communityId) {
      await ensureModerator(filters.communityId, actor, db);
    }

    return CommunityPostModerationCaseModel.list(filters, pagination, db);
  }

  static async getCase(actor, casePublicId) {
    const moderationCase = await CommunityPostModerationCaseModel.findByPublicId(casePublicId, db);
    if (!moderationCase) {
      const error = new Error('Moderation case not found');
      error.status = 404;
      throw error;
    }

    await ensureModerator(moderationCase.communityId, actor, db);
    const actions = await CommunityPostModerationActionModel.listForCase(moderationCase.id, db);

    return {
      case: moderationCase,
      actions
    };
  }

  static async listCaseActions(actor, casePublicId) {
    const moderationCase = await CommunityPostModerationCaseModel.findByPublicId(casePublicId, db);
    if (!moderationCase) {
      const error = new Error('Moderation case not found');
      error.status = 404;
      throw error;
    }

    await ensureModerator(moderationCase.communityId, actor, db);
    return CommunityPostModerationActionModel.listForCase(moderationCase.id, db);
  }

  static async applyCaseAction(casePublicId, actor, payload) {
    ensureActionAllowed(payload.action);

    return db.transaction(async (trx) => {
      const moderationCase = await CommunityPostModerationCaseModel.findByPublicId(casePublicId, trx);
      if (!moderationCase) {
        const error = new Error('Moderation case not found');
        error.status = 404;
        throw error;
      }

      await ensureModerator(moderationCase.communityId, actor, trx);
      const post = await CommunityPostModel.findById(moderationCase.postId, trx);
      if (!post) {
        const error = new Error('Post not found');
        error.status = 404;
        throw error;
      }

      const now = nowIso();
      const updates = {};
      const caseMetadata = mergeModerationMetadata(moderationCase.metadata ?? {}, {
        notes: payload.notes
          ? [{ message: payload.notes, authorId: actor.id, createdAt: now, action: payload.action }]
          : []
      });

      const riskScore =
        payload.riskScore !== undefined
          ? clampRiskScore(payload.riskScore)
          : moderationCase.riskScore ?? 0;
      const severity = deriveSeverity(riskScore);

      let newPostState = post.moderationState;
      let newPostStatus;

      switch (payload.action) {
        case 'assign': {
          updates.assignedTo = payload.assignedTo ?? null;
          updates.status = moderationCase.status === 'pending' ? 'in_review' : moderationCase.status;
          break;
        }
        case 'escalate': {
          updates.status = 'escalated';
          updates.escalatedAt = now;
          updates.assignedTo = payload.assignedTo ?? moderationCase.assignedTo ?? null;
          updates.riskScore = riskScore;
          updates.severity = severity;
          break;
        }
        case 'approve': {
          updates.status = 'approved';
          updates.resolvedAt = now;
          updates.resolvedBy = actor.id;
          updates.riskScore = riskScore;
          updates.severity = severity;
          newPostState = 'clean';
          newPostStatus = post.status === 'draft' ? 'draft' : 'published';
          break;
        }
        case 'reject': {
          updates.status = 'rejected';
          updates.resolvedAt = now;
          updates.resolvedBy = actor.id;
          updates.riskScore = riskScore;
          updates.severity = severity;
          newPostState = 'rejected';
          newPostStatus = 'archived';
          break;
        }
        case 'suppress': {
          updates.status = 'suppressed';
          updates.resolvedAt = now;
          updates.resolvedBy = actor.id;
          updates.riskScore = riskScore;
          updates.severity = severity;
          newPostState = 'suppressed';
          newPostStatus = payload.archivePost === false ? post.status : 'archived';
          break;
        }
        case 'restore': {
          updates.status = 'approved';
          updates.resolvedAt = now;
          updates.resolvedBy = actor.id;
          newPostState = 'clean';
          newPostStatus = payload.restoreStatus ?? 'published';
          break;
        }
        case 'comment': {
          updates.status = moderationCase.status;
          break;
        }
        default:
          break;
      }

      updates.metadata = caseMetadata;

      const updatedCase = await CommunityPostModerationCaseModel.updateById(
        moderationCase.id,
        updates,
        trx
      );

      const existingMetadata = parseJsonColumn(post.moderationMetadata, {});
      const mergedPostMetadata = mergeModerationMetadata(existingMetadata, {
        notes: payload.notes
          ? [{ message: payload.notes, authorId: actor.id, createdAt: now, action: payload.action }]
          : [],
        riskHistory: payload.action !== 'comment' ? [{ riskScore, at: now }] : []
      });

      const updatedPost = await CommunityPostModel.updateModerationState(
        post.id,
        {
          state: newPostState,
          metadata: mergedPostMetadata,
          status: newPostStatus,
          lastModeratedAt: now
        },
        trx
      );

      await CommunityPostModerationActionModel.record(
        {
          caseId: updatedCase.id,
          actorId: actor.id,
          action: payload.action,
          notes: payload.notes ?? null,
          metadata: {
            riskScore,
            severity,
            assignedTo: updates.assignedTo ?? updatedCase.assignedTo ?? null,
            archivePost: payload.archivePost ?? undefined,
            restoreStatus: payload.restoreStatus ?? undefined
          }
        },
        trx
      );

      await DomainEventModel.record(
        {
          entityType: 'community_post',
          entityId: updatedCase.postId,
          eventType: 'community.moderation.case.action',
          payload: {
            action: payload.action,
            caseId: updatedCase.publicId,
            status: updatedCase.status,
            severity: updatedCase.severity,
            riskScore,
            postModerationState: updatedPost.moderationState
          },
          performedBy: actor.id
        },
        trx
      );

      await ModerationAnalyticsEventModel.record(
        {
          communityId: updatedCase.communityId,
          entityType: 'community_post',
          entityId: String(updatedCase.postId),
          eventType: `case_${payload.action}`,
          riskScore,
          metrics: {
            severity: updatedCase.severity,
            status: updatedCase.status,
            moderatorId: actor.id
          },
          source: 'moderator',
          occurredAt: now
        },
        trx
      );

      log.info(
        {
          caseId: updatedCase.publicId,
          action: payload.action,
          actorId: actor.id,
          communityId: updatedCase.communityId,
          postId: updatedCase.postId
        },
        'Moderation action applied'
      );

      return {
        case: updatedCase,
        post: updatedPost
      };
    });
  }

  static async submitScamReport(actor, payload) {
    const riskScore = clampRiskScore(payload.riskScore ?? 0);
    const metadata = {
      evidence: Array.isArray(payload.evidence) ? payload.evidence : [],
      context: payload.context ?? {},
      channel: payload.channel ?? 'in_app'
    };

    const report = await ScamReportModel.create({
      reporterId: actor?.id ?? null,
      entityType: payload.entityType,
      entityId: payload.entityId,
      communityId: payload.communityId ?? null,
      reason: payload.reason,
      description: payload.description,
      riskScore,
      status: 'pending',
      metadata
    });

    await DomainEventModel.record({
      entityType: 'scam_report',
      entityId: report.id,
      eventType: 'scam.report.submitted',
      payload: {
        entityType: report.entityType,
        entityId: report.entityId,
        riskScore,
        communityId: report.communityId
      },
      performedBy: actor?.id ?? null
    });

    await ModerationAnalyticsEventModel.record({
      communityId: report.communityId ?? null,
      entityType: report.entityType,
      entityId: String(report.entityId),
      eventType: 'scam_reported',
      riskScore,
      metrics: {
        status: report.status,
        channel: metadata.channel
      },
      source: payload.channel ?? 'in_app',
      occurredAt: nowIso()
    });

    log.info(
      {
        reportId: report.publicId,
        entityType: report.entityType,
        riskScore,
        reporterId: actor?.id ?? null
      },
      'Scam report submitted'
    );

    return report;
  }

  static async listScamReports(actor, filters = {}, pagination = {}) {
    const criteria = { ...filters };
    if (actor.role === 'admin') {
      // admins can request any combination
    } else if (criteria.communityId) {
      await ensureModerator(criteria.communityId, actor, db);
    } else {
      criteria.reporterId = actor.id;
    }

    return ScamReportModel.list(criteria, pagination, db);
  }

  static async recordAnalyticsEvent(actor, payload) {
    if (actor.role !== 'admin' && actor.role !== 'moderator') {
      const error = new Error('Only admins or moderators can record analytics events');
      error.status = 403;
      throw error;
    }

    const record = await ModerationAnalyticsEventModel.record({
      communityId: payload.communityId ?? null,
      entityType: payload.entityType,
      entityId: payload.entityId,
      eventType: payload.eventType,
      riskScore: payload.riskScore ?? null,
      metrics: payload.metrics ?? {},
      source: payload.source ?? 'manual',
      occurredAt: payload.occurredAt ?? nowIso()
    });

    await DomainEventModel.record({
      entityType: 'moderation_analytics',
      entityId: record.id,
      eventType: 'moderation.analytics.recorded',
      payload: {
        communityId: payload.communityId ?? null,
        eventType: payload.eventType,
        riskScore: payload.riskScore ?? null
      },
      performedBy: actor.id
    });

    return ModerationAnalyticsEventModel.parseMetrics(record);
  }

  static async getAnalyticsSummary(actor, filters = {}) {
    if (actor.role !== 'admin' && !filters.communityId) {
      const error = new Error('Community filter required for moderators');
      error.status = 400;
      throw error;
    }

    if (filters.communityId) {
      await ensureModerator(filters.communityId, actor, db);
    }

    const [eventSummary, severityBreakdown, resolutionStats, scamStatusRows] = await Promise.all([
      ModerationAnalyticsEventModel.summarise(filters, db),
      CommunityPostModerationCaseModel.countOpenBySeverity(filters, db),
      CommunityPostModerationCaseModel.resolutionStats(filters, db),
      db('scam_reports')
        .select('status')
        .count({ total: '*' })
        .modify((builder) => {
          if (filters.communityId) {
            builder.where('community_id', filters.communityId);
          }
          if (filters.from) {
            builder.andWhere('created_at', '>=', filters.from);
          }
          if (filters.to) {
            builder.andWhere('created_at', '<=', filters.to);
          }
        })
        .groupBy('status')
    ]);

    const scamCounts = {
      pending: 0,
      investigating: 0,
      confirmed: 0,
      dismissed: 0
    };
    for (const row of scamStatusRows) {
      scamCounts[row.status] = Number(row.total ?? 0);
    }

    return {
      events: eventSummary.events,
      timeline: eventSummary.timeline,
      openCases: severityBreakdown,
      resolution: resolutionStats,
      scamReports: scamCounts
    };
  }
}
